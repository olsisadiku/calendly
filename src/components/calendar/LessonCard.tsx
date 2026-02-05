import type { CalendarLesson } from '../../hooks/useCalendarData'
import { formatTime } from '../../utils/calendar'
import { cn } from '../../utils/cn'
import { useLanguage } from '../../contexts/LanguageContext'

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary-50 border-primary-200 text-primary-800',
  completed: 'bg-blue-50 border-blue-200 text-blue-800',
  missed: 'bg-red-50 border-red-200 text-red-800',
  rescheduled: 'bg-amber-50 border-amber-200 text-amber-800',
  cancelled: 'bg-warm-100 border-warm-200 text-warm-500 line-through',
}

const statusDots: Record<string, string> = {
  scheduled: 'bg-primary-400',
  completed: 'bg-blue-400',
  missed: 'bg-red-400',
  rescheduled: 'bg-amber-400',
  cancelled: 'bg-warm-400',
}

interface LessonCardProps {
  lesson: CalendarLesson
  onClick: (lesson: CalendarLesson) => void
  compact?: boolean
}

export function LessonCard({ lesson, onClick, compact }: LessonCardProps) {
  const { t } = useLanguage()

  return (
    <button
      onClick={() => onClick(lesson)}
      className={cn(
        'w-full text-left rounded-lg border px-2 py-1.5 transition-all duration-200 cursor-pointer',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        statusColors[lesson.status]
      )}
    >
      <div className="flex items-center gap-1.5">
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDots[lesson.status])} />
        <span className="text-xs font-medium truncate">
          {compact ? lesson.teacherName?.split(' ')[0] || lesson.studentName?.split(' ')[0] : lesson.teacherName || lesson.studentName}
        </span>
      </div>
      {!compact && (
        <p className="text-[10px] mt-0.5 opacity-70 ml-3">
          {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
          {lesson.rescheduledFrom && ` (${t('moved')})`}
        </p>
      )}
    </button>
  )
}
