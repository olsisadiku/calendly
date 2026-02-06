import { useMemo } from 'react'
import { getMonthDays, getWeekDays, isSameDay } from '../../utils/calendar'
import type { CalendarLesson } from '../../hooks/useCalendarData'
import { CalendarDay } from './CalendarDay'
import { LessonCard } from './LessonCard'
import { cn } from '../../utils/cn'
import { useLanguage } from '../../contexts/LanguageContext'

const DAY_SHORT_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

interface CalendarGridProps {
  currentDate: Date
  view: 'month' | 'week'
  lessons: CalendarLesson[]
  onLessonClick: (lesson: CalendarLesson) => void
}

export function CalendarGrid({ currentDate, view, lessons, onLessonClick }: CalendarGridProps) {
  const { t } = useLanguage()
  const days = useMemo(
    () => (view === 'month' ? getMonthDays(currentDate) : getWeekDays(currentDate)),
    [currentDate, view]
  )

  if (view === 'week') {
    return <WeekView days={days} lessons={lessons} onLessonClick={onLessonClick} />
  }

  return (
    <div className="bg-white rounded-xl border border-warm-100 shadow-card overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 bg-warm-50 border-b border-warm-100">
            {DAY_SHORT_KEYS.map((dayKey) => (
              <div
                key={dayKey}
                className="py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider text-warm-500"
              >
                {t(dayKey)}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const dayLessons = lessons.filter((l) => isSameDay(l.date, date))
              return (
                <CalendarDay
                  key={date.toISOString()}
                  date={date}
                  currentMonth={currentDate}
                  lessons={dayLessons}
                  onLessonClick={onLessonClick}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function WeekView({
  days,
  lessons,
  onLessonClick,
}: {
  days: Date[]
  lessons: CalendarLesson[]
  onLessonClick: (lesson: CalendarLesson) => void
}) {
  const { t } = useLanguage()

  return (
    <div className="bg-white rounded-xl border border-warm-100 shadow-card overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 divide-x divide-warm-100">
            {days.map((date) => {
              const dayLessons = lessons.filter((l) => isSameDay(l.date, date))
              const today = isSameDay(date, new Date())

              return (
                <div key={date.toISOString()} className="min-h-[300px] sm:min-h-[400px]">
                  <div
                    className={cn(
                      'p-2 sm:p-3 text-center border-b border-warm-100',
                      today && 'bg-primary-50'
                    )}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-warm-400">
                      {t(DAY_SHORT_KEYS[date.getDay()])}
                    </p>
                    <p
                      className={cn(
                        'text-base sm:text-lg font-semibold mt-0.5',
                        today ? 'text-primary-600' : 'text-warm-800'
                      )}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
                    {dayLessons.map((lesson, i) => (
                      <LessonCard
                        key={`${lesson.scheduleId}-${lesson.dateStr}-${i}`}
                        lesson={lesson}
                        onClick={onLessonClick}
                      />
                    ))}
                    {dayLessons.length === 0 && (
                      <p className="text-xs text-warm-300 text-center py-4">{t('noLessons')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
