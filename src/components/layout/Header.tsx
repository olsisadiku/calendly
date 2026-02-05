import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import { useLanguage } from '../../contexts/LanguageContext'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { TimezoneSelector } from '../ui/TimezoneSelector'
import { toast } from '../ui/Toast'
import type { TranslationKey } from '../../lib/translations'

export function Header() {
  const { signOut } = useAuth()
  const { profile, timezone, updateTimezone } = useProfile()
  const { locale, setLocale, t } = useLanguage()

  const handleTimezoneChange = async (tz: string) => {
    await updateTimezone(tz)
    toast(t('timezoneUpdated'), 'success')
  }

  return (
    <header className="h-14 bg-white border-b border-warm-100 flex items-center justify-end px-6 gap-3">
      {profile?.role && (
        <Badge variant={profile.role === 'teacher' ? 'info' : 'success'}>
          {t(profile.role as TranslationKey)}
        </Badge>
      )}
      <TimezoneSelector value={timezone} onChange={handleTimezoneChange} />
      <button
        onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-warm-50 text-warm-600 hover:bg-warm-100 transition-colors cursor-pointer border border-warm-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        {locale === 'en' ? 'العربية' : 'English'}
      </button>
      <Button variant="ghost" size="sm" onClick={signOut}>
        {t('signOut')}
      </Button>
    </header>
  )
}
