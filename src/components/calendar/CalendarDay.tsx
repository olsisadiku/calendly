import { isToday, isSameMonth, format } from '../../utils/calendar'
import type { CalendarLesson } from '../../hooks/useCalendarData'
import { LessonCard } from './LessonCard'
import { cn } from '../../utils/cn'
import { useLanguage } from '../../contexts/LanguageContext'

interface CalendarDayProps {
  date: Date
  currentMonth: Date
  lessons: CalendarLesson[]
  onLessonClick: (lesson: CalendarLesson) => void
}

export function CalendarDay({ date, currentMonth, lessons, onLessonClick }: CalendarDayProps) {
  const { t } = useLanguage()
  const today = isToday(date)
  const inMonth = isSameMonth(date, currentMonth)

  return (
    <div
      className={cn(
        'min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2 border-t border-warm-100 transition-colors',
        !inMonth && 'bg-warm-50/50',
        today && 'bg-primary-50/30'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-sm font-medium',
            today && 'bg-primary-600 text-white w-7 h-7 rounded-full flex items-center justify-center',
            !today && inMonth && 'text-warm-700',
            !today && !inMonth && 'text-warm-300'
          )}
        >
          {format(date, 'd')}
        </span>
      </div>
      <div className="space-y-1">
        {lessons.slice(0, 3).map((lesson, i) => (
          <LessonCard
            key={`${lesson.scheduleId}-${lesson.dateStr}-${i}`}
            lesson={lesson}
            onClick={onLessonClick}
            compact
          />
        ))}
        {lessons.length > 3 && (
          <p className="text-xs text-warm-400 text-center">+{lessons.length - 3} {t('more')}</p>
        )}
      </div>
    </div>
  )
}
