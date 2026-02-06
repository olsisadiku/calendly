import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import type { StudentTeacherMatch } from '../lib/database.types'
import { useRecurringSchedule } from '../hooks/useRecurringSchedule'
import { useTeacherAvailability } from '../hooks/useTeacherAvailability'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatTime, minutesToTime, timeToMinutes } from '../utils/calendar'
import { convertDayAndTime, detectTimezone } from '../utils/timezone'
import { toast } from '../components/ui/Toast'
import { cn } from '../utils/cn'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DURATION_OPTIONS = [30, 45, 60, 90, 120]

type MatchWithTeacher = StudentTeacherMatch & {
  teacher: { display_name: string | null; email: string; timezone: string | null }
}

export function SchedulePage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { timezone: studentTimezone } = useProfile()
  const [matches, setMatches] = useState<MatchWithTeacher[]>([])
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeacher | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('student_teacher_matches')
        .select('*, teacher:profiles!student_teacher_matches_teacher_id_fkey(display_name, email, timezone)')
        .eq('student_id', user.id)
        .eq('is_active', true)
      const typedData = (data as unknown as MatchWithTeacher[]) ?? []
      setMatches(typedData)
      if (typedData.length > 0 && !selectedMatch) {
        setSelectedMatch(typedData[0])
      }
      setLoading(false)
    }
    fetchMatches()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-warm-900">{t('noTeachersAssigned')}</h2>
        <p className="mt-2 text-warm-500">{t('askAdminToMatch')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-warm-900">{t('myScheduleTitle')}</h1>
        <p className="mt-1 text-warm-500">{t('setupRecurringLessons')}</p>
      </div>

      {/* Teacher selector */}
      {matches.length > 1 && (
        <div className="flex gap-2 mb-6">
          {matches.map((match) => (
            <button
              key={match.id}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                selectedMatch?.id === match.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-warm-600 border border-warm-200 hover:border-warm-300'
              )}
              onClick={() => setSelectedMatch(match)}
            >
              {match.teacher?.display_name ?? match.teacher?.email}
            </button>
          ))}
        </div>
      )}

      {selectedMatch && (
        <ScheduleEditor
          match={selectedMatch}
          studentTimezone={studentTimezone}
        />
      )}
    </div>
  )
}

function ScheduleEditor({ match, studentTimezone }: { match: MatchWithTeacher; studentTimezone: string }) {
  const { t } = useLanguage()
  const { availability } = useTeacherAvailability(match.teacher_id)
  const { schedules, addSchedule, removeSchedule } = useRecurringSchedule(match.id)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [duration, setDuration] = useState(60)
  const [adding, setAdding] = useState(false)

  const teacherTZ = match.teacher?.timezone ?? detectTimezone()

  // Build available slots in teacher TZ (for correct availability checking),
  // then convert to student TZ for display
  const getAvailableSlots = (day: number) => {
    // day is in student's perspective — convert to teacher's day
    // We need to check all teacher-TZ days that could map to this student-TZ day
    // Simplification: generate slots in teacher TZ for each day, convert to student TZ, filter by selected day
    const allSlots: { start: string; end: string; teacherDay: number; teacherStart: string }[] = []

    // Check all 7 teacher days since timezone offset could shift any of them
    for (let teacherDay = 0; teacherDay < 7; teacherDay++) {
      const busySlots = availability.filter((a) => a.day_of_week === teacherDay)

      for (let m = 0; m < 24 * 60; m += 30) {
        const start = minutesToTime(m)
        if (m + duration > 24 * 60) continue

        const isBusy = busySlots.some((b) => {
          const bStart = timeToMinutes(b.start_time)
          const bEnd = timeToMinutes(b.end_time)
          return m < bEnd && m + duration > bStart
        })

        // Check if already booked (in teacher TZ)
        const isBooked = schedules.some(
          (s) => s.day_of_week === teacherDay && s.start_time === start
        )

        if (!isBusy && !isBooked) {
          // Convert to student TZ
          const converted = convertDayAndTime(teacherDay, start, teacherTZ, studentTimezone)

          if (converted.dayOfWeek === day) {
            allSlots.push({
              start: converted.time,
              end: minutesToTime(timeToMinutes(converted.time) + duration),
              teacherDay,
              teacherStart: start,
            })
          }
        }
      }
    }

    // Sort by time and deduplicate
    allSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
    return allSlots
  }

  const handleAdd = async () => {
    if (selectedDay === null || !selectedTime) return
    setAdding(true)
    try {
      // selectedTime is in student TZ display — convert back to teacher TZ
      const teacherSlot = convertDayAndTime(selectedDay, selectedTime, studentTimezone, teacherTZ)
      const endMinutes = timeToMinutes(teacherSlot.time) + duration
      await addSchedule({
        day_of_week: teacherSlot.dayOfWeek,
        start_time: teacherSlot.time,
        end_time: minutesToTime(endMinutes),
      })
      setSelectedDay(null)
      setSelectedTime('')
      toast(t('lessonAdded'), 'success')
    } catch {
      toast(t('failedToAddLesson'), 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeSchedule(id)
      toast(t('lessonRemoved'), 'success')
    } catch {
      toast(t('failedToRemove'), 'error')
    }
  }

  // Reset time selection when day or duration changes
  useEffect(() => {
    setSelectedTime('')
  }, [selectedDay, duration])

  const availableSlots = selectedDay !== null ? getAvailableSlots(selectedDay) : []

  // Convert existing schedules from teacher TZ to student TZ for display
  const displaySchedules = schedules.map((schedule) => {
    const converted = convertDayAndTime(schedule.day_of_week, schedule.start_time, teacherTZ, studentTimezone)
    const convertedEnd = convertDayAndTime(schedule.day_of_week, schedule.end_time, teacherTZ, studentTimezone)
    return {
      ...schedule,
      displayDayOfWeek: converted.dayOfWeek,
      displayStartTime: converted.time,
      displayEndTime: convertedEnd.time,
    }
  })

  return (
    <div className="space-y-6">
      {/* Current schedules */}
      <div className="bg-white rounded-xl border border-warm-100 shadow-card">
        <div className="px-6 py-4 border-b border-warm-100">
          <h3 className="font-display text-lg font-semibold text-warm-900">
            {t('recurringLessonsWith')} {match.teacher?.display_name ?? t('teacher')}
          </h3>
        </div>
        {displaySchedules.length === 0 ? (
          <div className="p-8 text-center text-warm-400">
            {t('noRecurringLessons')}
          </div>
        ) : (
          <div className="divide-y divide-warm-50">
            {displaySchedules.map((schedule, i) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="success">{t(DAY_KEYS[schedule.displayDayOfWeek])}</Badge>
                  <span className="text-sm text-warm-700">
                    {formatTime(schedule.displayStartTime)} – {formatTime(schedule.displayEndTime)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleRemove(schedule.id)}
                >
                  {t('remove')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new schedule */}
      <div className="bg-white rounded-xl border border-warm-100 shadow-card p-6">
        <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">{t('addRecurringLesson')}</h3>

        <div className="space-y-4">
          {/* Duration picker */}
          <div>
            <p className="text-sm font-medium text-warm-700 mb-2">{t('lessonDuration')}</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    duration === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                  )}
                  onClick={() => setDuration(d)}
                >
                  {d} {t('minutes')}
                </button>
              ))}
            </div>
          </div>

          {/* Day picker — days shown in student's perspective */}
          <div>
            <p className="text-sm font-medium text-warm-700 mb-2">{t('selectADay')}</p>
            <div className="flex flex-wrap gap-2">
              {DAY_KEYS.map((dayKey, i) => (
                <button
                  key={i}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    selectedDay === i
                      ? 'bg-primary-600 text-white'
                      : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                  )}
                  onClick={() => {
                    setSelectedDay(i)
                    setSelectedTime('')
                  }}
                >
                  {t(dayKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Time slots — displayed in student TZ */}
          {selectedDay !== null && (
            <div>
              <p className="text-sm font-medium text-warm-700 mb-2">{t('availableTimeSlots')}</p>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-warm-400">{t('noAvailableSlots')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={`${slot.teacherDay}-${slot.teacherStart}`}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm transition-all cursor-pointer',
                        selectedTime === slot.start
                          ? 'bg-primary-600 text-white'
                          : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                      )}
                      onClick={() => setSelectedTime(slot.start)}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDay !== null && selectedTime && (
            <Button onClick={handleAdd} loading={adding}>
              {t('add')} {t(DAY_KEYS[selectedDay])} {t('at')} {formatTime(selectedTime)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
