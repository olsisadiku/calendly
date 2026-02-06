import { format } from '../../utils/calendar'
import { Button } from '../ui/Button'
import { useLanguage } from '../../contexts/LanguageContext'

interface CalendarHeaderProps {
  currentDate: Date
  view: 'month' | 'week'
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: 'month' | 'week') => void
}

export function CalendarHeader({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-warm-900">
          {format(currentDate, view === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onPrev}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={onToday}>
            {t('today')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onNext}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
      <div className="flex items-center bg-warm-100 rounded-lg p-0.5 self-start sm:self-auto">
        <button
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            view === 'month' ? 'bg-white shadow-sm text-warm-900' : 'text-warm-500 hover:text-warm-700'
          }`}
          onClick={() => onViewChange('month')}
        >
          {t('month')}
        </button>
        <button
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            view === 'week' ? 'bg-white shadow-sm text-warm-900' : 'text-warm-500 hover:text-warm-700'
          }`}
          onClick={() => onViewChange('week')}
        >
          {t('week')}
        </button>
      </div>
    </div>
  )
}
