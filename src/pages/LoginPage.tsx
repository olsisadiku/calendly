import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { LoginForm } from '../components/auth/LoginForm'

export function LoginPage() {
  const { session, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const { t } = useLanguage()

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 text-center px-12">
          <h1 className="font-display text-5xl font-bold text-white leading-tight">
            {t('heroTitle1')}
            <br />
            <span className="text-primary-300">{t('heroTitle2')}</span>
          </h1>
          <p className="mt-6 text-lg text-primary-200 max-w-md">
            {t('heroDescription')}
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-warm-900">{t('welcomeBack')}</h2>
            <p className="mt-2 text-warm-500">{t('signInToManage')}</p>
          </div>

          <div className="space-y-6">
            <GoogleSignInButton onClick={signInWithGoogle} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-warm-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-warm-50 px-4 text-warm-400">{t('orContinueWithEmail')}</span>
              </div>
            </div>

            <LoginForm onSignIn={signInWithEmail} onSignUp={signUpWithEmail} />
          </div>
        </div>
      </div>
    </div>
  )
}
