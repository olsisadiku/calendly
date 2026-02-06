import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTeacherAvailability } from '../hooks/useTeacherAvailability'
import { useLanguage } from '../contexts/LanguageContext'
import { Button } from '../components/ui/Button'
import { toast } from '../components/ui/Toast'
import { cn } from '../utils/cn'
import { formatTime, minutesToTime, timeToMinutes } from '../utils/calendar'

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0AM to 11PM (full 24h)
const SLOT_HEIGHT = 40 // px per 30-min slot

interface SlotSelection {
  day: number
  startMinutes: number
  endMinutes: number
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export function AvailabilityPage() {
  const { user } = useAuth()
  const { availability, loading, saveAvailability } = useTeacherAvailability(user?.id)
  const { t } = useLanguage()
  const [slots, setSlots] = useState<SlotSelection[]>([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<{ day: number; startMinutes: number } | null>(null)

  // Initialize slots from availability
  useEffect(() => {
    if (availability.length > 0) {
      setSlots(
        availability.map((a) => ({
          day: a.day_of_week,
          startMinutes: timeToMinutes(a.start_time),
          endMinutes: timeToMinutes(a.end_time),
        }))
      )
    }
  }, [availability])

  const handleMouseDown = (day: number, minutes: number) => {
    setDragging({ day, startMinutes: minutes })
  }

  const handleMouseUp = (day: number, minutes: number) => {
    if (!dragging || dragging.day !== day) {
      setDragging(null)
      return
    }

    const start = Math.min(dragging.startMinutes, minutes)
    const end = Math.max(dragging.startMinutes, minutes) + 30

    // Check overlap and merge or add
    const overlapping = slots.filter(
      (s) => s.day === day && s.startMinutes < end && s.endMinutes > start
    )

    if (overlapping.length > 0) {
      // Remove overlapping slots
      setSlots(slots.filter((s) => !overlapping.includes(s)))
    } else {
      setSlots([...slots, { day, startMinutes: start, endMinutes: end }])
    }

    setDragging(null)
  }

  const isSlotBusy = (day: number, minutes: number) => {
    return slots.some(
      (s) => s.day === day && s.startMinutes <= minutes && s.endMinutes > minutes
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAvailability(
        slots.map((s) => ({
          day_of_week: s.day,
          start_time: minutesToTime(s.startMinutes),
          end_time: minutesToTime(s.endMinutes),
        }))
      )
      toast(t('availabilitySaved'), 'success')
    } catch {
      toast(t('failedToSave'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const clearAll = () => setSlots([])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-warm-900">{t('availabilityTitle')}</h1>
          <p className="mt-1 text-sm sm:text-base text-warm-500">
            {t('availabilityDescription')} <strong className="text-warm-700">{t('busy')}</strong>{t('availabilityDescriptionEnd')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" onClick={clearAll}>{t('clearAll')}</Button>
          <Button onClick={handleSave} loading={saving}>{t('saveChanges')}</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-warm-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-warm-100">
              <div className="p-3 text-xs font-medium text-warm-400 uppercase tracking-wider" />
              {DAY_KEYS.map((dayKey, i) => (
                <div
                  key={i}
                  className="p-3 text-center text-xs font-medium text-warm-600 uppercase tracking-wider border-l border-warm-50"
                >
                  {t(dayKey)}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {HOURS.map((hour) =>
                [0, 30].map((halfHour) => {
                  const minutes = hour * 60 + halfHour
                  return (
                    <div key={minutes} className="grid grid-cols-8" style={{ height: SLOT_HEIGHT }}>
                      <div className="flex items-center justify-end pr-3 text-xs text-warm-400">
                        {halfHour === 0 && formatTime(`${hour}:00`)}
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                        const busy = isSlotBusy(day, minutes)
                        return (
                          <div
                            key={day}
                            className={cn(
                              'border-l border-t border-warm-50 cursor-pointer transition-colors duration-100',
                              busy
                                ? 'bg-accent-100 hover:bg-accent-200'
                                : 'hover:bg-primary-50'
                            )}
                            onMouseDown={() => handleMouseDown(day, minutes)}
                            onMouseUp={() => handleMouseUp(day, minutes)}
                          />
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-warm-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent-100 border border-accent-200" />
          <span>{t('busyUnavailable')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border border-warm-100" />
          <span>{t('available')}</span>
        </div>
      </div>
    </div>
  )
}
