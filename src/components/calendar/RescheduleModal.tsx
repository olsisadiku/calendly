import { useState, useMemo } from 'react'
import type { CalendarLesson } from '../../hooks/useCalendarData'
import type { TeacherAvailability } from '../../lib/database.types'
import type { LessonStatus } from '../../lib/constants'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatTime, format, addDays, timeToMinutes, minutesToTime } from '../../utils/calendar'
import { convertTime } from '../../utils/timezone'
import { useLanguage } from '../../contexts/LanguageContext'
import { cn } from '../../utils/cn'

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

interface RescheduleModalProps {
  lesson: CalendarLesson | null
  onClose: () => void
  onReschedule: (
    lesson: CalendarLesson,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => Promise<void>
  onUpdateStatus: (lesson: CalendarLesson, status: LessonStatus) => Promise<void>
  availability: TeacherAvailability[]
  allLessons: CalendarLesson[]
  isTeacher: boolean
  canModify: boolean
  viewerTimezone: string
}

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  scheduled: 'success',
  completed: 'info',
  missed: 'danger',
  rescheduled: 'warning',
  cancelled: 'default',
}

type Mode = 'view' | 'pick-date' | 'pick-time'

function getAvailableSlotsForDate(
  date: Date,
  duration: number,
  teacherAvailability: TeacherAvailability[],
  teacherId: string,
  allLessons: CalendarLesson[],
  currentScheduleId: string,
  currentOriginalDate: string,
): { start: string; end: string }[] {
  const dayOfWeek = date.getDay()
  const dateStr = format(date, 'yyyy-MM-dd')

  // Get teacher busy slots for this day of week
  const busySlots = teacherAvailability.filter(
    (a) => a.teacher_id === teacherId && a.day_of_week === dayOfWeek
  )

  // Get booked lessons on this date where teacherId matches (exclude current lesson being rescheduled)
  const bookedLessons = allLessons.filter(
    (l) =>
      l.teacherId === teacherId &&
      l.dateStr === dateStr &&
      !(l.scheduleId === currentScheduleId && (l.rescheduledFrom ?? l.dateStr) === currentOriginalDate)
  )

  const slots: { start: string; end: string }[] = []

  // Generate 30-min slots across the full 24h day
  for (let m = 0; m < 24 * 60; m += 30) {
    const end = m + duration
    if (end > 24 * 60) continue

    const isBusy = busySlots.some((b) => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return m < bEnd && end > bStart
    })

    const isBooked = bookedLessons.some((l) => {
      const lStart = timeToMinutes(l.startTime)
      const lEnd = timeToMinutes(l.endTime)
      return m < lEnd && end > lStart
    })

    if (!isBusy && !isBooked) {
      slots.push({ start: minutesToTime(m), end: minutesToTime(end) })
    }
  }

  return slots
}

export function RescheduleModal({
  lesson,
  onClose,
  onReschedule,
  onUpdateStatus,
  availability,
  allLessons,
  isTeacher,
  canModify,
  viewerTimezone,
}: RescheduleModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('view')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  // selectedSlot stores the teacher-TZ time for saving
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const lessonDuration = lesson
    ? timeToMinutes(lesson.endTime) - timeToMinutes(lesson.startTime)
    : 60

  const teacherTZ = lesson?.teacherTimezone ?? viewerTimezone

  // Build the 5-week grid starting from Sunday before tomorrow
  const calendarDays = useMemo(() => {
    const tmrw = addDays(new Date(), 1)
    tmrw.setHours(0, 0, 0, 0)
    const startSunday = addDays(tmrw, -tmrw.getDay())
    const days: Date[] = []
    for (let i = 0; i < 35; i++) {
      days.push(addDays(startSunday, i))
    }
    return days
  }, [])

  const tomorrow = useMemo(() => {
    const d = addDays(new Date(), 1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Pre-compute slot counts per day for the calendar
  const daySlotCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (!lesson) return counts
    for (const day of calendarDays) {
      if (day < tomorrow) {
        counts.set(format(day, 'yyyy-MM-dd'), 0)
        continue
      }
      const slots = getAvailableSlotsForDate(
        day,
        lessonDuration,
        availability,
        lesson.teacherId,
        allLessons,
        lesson.scheduleId,
        lesson.rescheduledFrom ?? lesson.dateStr,
      )
      counts.set(format(day, 'yyyy-MM-dd'), slots.length)
    }
    return counts
  }, [calendarDays, tomorrow, lessonDuration, availability, lesson, allLessons])

  // Slots for the selected date (in teacher TZ for correct availability checking)
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !lesson) return []
    return getAvailableSlotsForDate(
      selectedDate,
      lessonDuration,
      availability,
      lesson.teacherId,
      allLessons,
      lesson.scheduleId,
      lesson.rescheduledFrom ?? lesson.dateStr,
    )
  }, [selectedDate, lessonDuration, availability, lesson, allLessons])

  // Convert slots to viewer TZ for display
  const displaySlots = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return slotsForSelectedDate.map((slot) => {
      if (teacherTZ === viewerTimezone) {
        return { teacherStart: slot.start, displayStart: slot.start }
      }
      const conv = convertTime(slot.start, dateStr, teacherTZ, viewerTimezone)
      return { teacherStart: slot.start, displayStart: conv.time }
    })
  }, [slotsForSelectedDate, selectedDate, teacherTZ, viewerTimezone])

  if (!lesson) return null

  const handleClose = () => {
    setMode('view')
    setSelectedDate(null)
    setSelectedSlot(null)
    onClose()
  }

  const handleStatusChange = async (status: LessonStatus) => {
    setLoading(true)
    try {
      await onUpdateStatus(lesson, status)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) return
    setLoading(true)
    try {
      // selectedSlot is already in teacher TZ — pass directly
      const newDateStr = format(selectedDate, 'yyyy-MM-dd')
      const endMinutes = timeToMinutes(selectedSlot) + lessonDuration
      const newEndTime = minutesToTime(endMinutes)
      await onReschedule(lesson, newDateStr, selectedSlot, newEndTime)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const canAct = canModify && (lesson.status === 'scheduled' || lesson.status === 'rescheduled')

  // Find the display time for the currently selected slot
  const selectedDisplayTime = selectedSlot
    ? displaySlots.find((s) => s.teacherStart === selectedSlot)?.displayStart ?? selectedSlot
    : null

  return (
    <Modal open={!!lesson} onClose={handleClose} title={t('lessonDetails')}>
      <div className="space-y-5">
        {/* Always show lesson info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-warm-500">
                {isTeacher ? t('student') : t('teacher')}
              </p>
              <p className="font-medium text-warm-900">
                {isTeacher ? lesson.studentName : lesson.teacherName}
              </p>
            </div>
            <Badge variant={statusBadgeVariant[lesson.status]}>
              {t(lesson.status as any)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-warm-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wider">{t('date')}</p>
              <p className="text-sm font-medium text-warm-800 mt-0.5">
                {format(lesson.date, 'EEEE, MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wider">{t('time')}</p>
              <p className="text-sm font-medium text-warm-800 mt-0.5">
                {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
              </p>
            </div>
          </div>

          {lesson.rescheduledFrom && (
            <p className="text-sm text-amber-600">
              {t('rescheduledFrom')} {lesson.rescheduledFrom}
            </p>
          )}
        </div>

        {/* Mode: view */}
        {mode === 'view' && (
          <div className="space-y-3">
            {canAct && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusChange('completed')}
                  loading={loading}
                >
                  {t('markCompleted')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleStatusChange('missed')}
                  loading={loading}
                >
                  {t('markMissed')}
                </Button>
              </div>
            )}

            {canAct && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('pick-date')}
                >
                  {t('reschedule')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleStatusChange('cancelled')}
                  loading={loading}
                >
                  {t('cancelLesson')}
                </Button>
              </div>
            )}

            {!canModify && isTeacher && (
              <p className="text-sm text-warm-400 italic">
                {t('teacherCantModify')}
              </p>
            )}
          </div>
        )}

        {/* Mode: pick-date (mini calendar) */}
        {mode === 'pick-date' && (
          <div className="space-y-4">
            <h3 className="font-medium text-warm-900">{t('selectNewDate')}</h3>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_LABELS_SHORT.map((d) => (
                <div key={d} className="text-xs font-medium text-warm-400 py-1">
                  {d}
                </div>
              ))}

              {/* Day cells */}
              {calendarDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const slotCount = daySlotCounts.get(dayStr) ?? 0
                const isPast = day < tomorrow
                const isAvailable = !isPast && slotCount > 0
                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dayStr

                return (
                  <button
                    key={dayStr}
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedDate(day)
                      setSelectedSlot(null)
                      setMode('pick-time')
                    }}
                    className={cn(
                      'relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all',
                      isAvailable && !isSelected && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer',
                      isSelected && 'ring-2 ring-primary-500 bg-primary-50 text-primary-700',
                      !isAvailable && 'bg-warm-50 text-warm-300 cursor-not-allowed',
                    )}
                  >
                    <span className="font-medium">{day.getDate()}</span>
                    {isAvailable && (
                      <span className="text-[10px] leading-none text-emerald-500">
                        {slotCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {daySlotCounts.size > 0 && ![...daySlotCounts.values()].some((c) => c > 0) && (
              <p className="text-sm text-warm-400 text-center">{t('noAvailableDates')}</p>
            )}

            <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
              {t('back')}
            </Button>
          </div>
        )}

        {/* Mode: pick-time (slot picker) */}
        {mode === 'pick-time' && selectedDate && (
          <div className="space-y-4">
            <h3 className="font-medium text-warm-900">
              {format(selectedDate, 'EEEE, MMM d')}
            </h3>
            <p className="text-sm text-warm-500">{t('selectTimeSlot')}</p>

            {displaySlots.length === 0 ? (
              <p className="text-sm text-warm-400">{t('noSlotsOnDate')}</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {displaySlots.map((slot) => {
                  const isOriginalTime = slot.displayStart === lesson.startTime
                  const isSelected = selectedSlot === slot.teacherStart

                  return (
                    <button
                      key={slot.teacherStart}
                      onClick={() => setSelectedSlot(slot.teacherStart)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm transition-all cursor-pointer',
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : isOriginalTime
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100'
                            : 'bg-warm-50 text-warm-600 hover:bg-warm-100',
                      )}
                    >
                      {formatTime(slot.displayStart)}
                      {isOriginalTime && !isSelected && (
                        <span className="block text-[10px] leading-tight text-amber-500">
                          {t('originalTimeSlot')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSlot(null)
                  setMode('pick-date')
                }}
              >
                {t('backToDates')}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirmReschedule}
                loading={loading}
                disabled={!selectedSlot}
              >
                {selectedDisplayTime
                  ? `${t('confirmRescheduleAt')} ${formatTime(selectedDisplayTime)}`
                  : t('confirmReschedule')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
