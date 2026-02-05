import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../contexts/LanguageContext'
import { Button } from '../components/ui/Button'
import { cn } from '../utils/cn'
import { toast } from '../components/ui/Toast'

export function RoleSelectionPage() {
  const { updateRole } = useProfile()
  const { t } = useLanguage()
  const [selected, setSelected] = useState<'student' | 'teacher' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await updateRole(selected)
    } catch {
      toast(t('failedToSetRole'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl animate-slide-up">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-warm-900">{t('howWillYouUse')}</h1>
          <p className="mt-3 text-warm-500 text-lg">{t('chooseYourRole')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <RoleCard
            title={t('student')}
            description={t('studentDescription')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            selected={selected === 'student'}
            onClick={() => setSelected('student')}
          />
          <RoleCard
            title={t('teacher')}
            description={t('teacherDescription')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
            selected={selected === 'teacher'}
            onClick={() => setSelected('teacher')}
          />
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected}
            loading={loading}
            onClick={handleConfirm}
            className="min-w-[200px]"
          >
            {`${t('continueAs')} ${selected ? t(selected) : '...'}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-6 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        selected
          ? 'border-primary-500 bg-primary-50 shadow-card-hover'
          : 'border-warm-200 bg-white shadow-card hover:border-warm-300'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          selected ? 'bg-primary-100 text-primary-600' : 'bg-warm-100 text-warm-500'
        )}
      >
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-warm-900">{title}</h3>
      <p className="mt-2 text-sm text-warm-500 leading-relaxed">{description}</p>
    </button>
  )
}
