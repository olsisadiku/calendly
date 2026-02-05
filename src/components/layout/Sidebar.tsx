import { NavLink } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useLanguage } from '../../contexts/LanguageContext'
import { cn } from '../../utils/cn'
import type { TranslationKey } from '../../lib/translations'

const navItems = {
  student: [
    { to: '/dashboard', labelKey: 'calendar' as TranslationKey, icon: CalendarIcon },
    { to: '/schedule', labelKey: 'mySchedule' as TranslationKey, icon: ClockIcon },
  ],
  teacher: [
    { to: '/dashboard', labelKey: 'calendar' as TranslationKey, icon: CalendarIcon },
    { to: '/availability', labelKey: 'availability' as TranslationKey, icon: SlotsIcon },
  ],
}

export function Sidebar() {
  const { profile, isSuperuser, isStudent, isTeacher } = useProfile()
  const { t } = useLanguage()

  const role = isStudent ? 'student' : isTeacher ? 'teacher' : null
  const items = role ? navItems[role] : []

  return (
    <aside className="w-64 bg-white border-e border-warm-100 flex flex-col h-full">
      <div className="p-6 border-b border-warm-100">
        <h1 className="font-display text-2xl font-bold text-warm-950 tracking-tight">{t('appName')}</h1>
        <p className="text-sm text-warm-500 mt-0.5">{t('appSubtitle')}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-warm-600 hover:text-warm-800 hover:bg-warm-50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {t(item.labelKey)}
          </NavLink>
        ))}

        {isSuperuser && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-warm-400">{t('admin')}</p>
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-warm-600 hover:text-warm-800 hover:bg-warm-50'
                )
              }
            >
              <ShieldIcon className="w-5 h-5" />
              {t('manage')}
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-warm-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warm-800 truncate">{profile?.display_name ?? t('user')}</p>
            <p className="text-xs text-warm-500 capitalize">{profile?.role ? t(profile.role as TranslationKey) : t('noRole')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SlotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
