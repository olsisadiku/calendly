import { useState } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { toast } from '../ui/Toast'
import { useLanguage } from '../../contexts/LanguageContext'

interface LoginFormProps {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>
}

export function LoginForm({ onSignIn, onSignUp }: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        await onSignUp(email, password, displayName)
        toast(t('accountCreated'), 'success')
      } else {
        await onSignIn(email, password)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('error')
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <Input
          label={t('fullName')}
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
      )}
      <Input
        label={t('email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        label={t('password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        minLength={6}
      />
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {isSignUp ? t('createAccount') : t('signIn')}
      </Button>
      <p className="text-center text-sm text-warm-500">
        {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}{' '}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
        >
          {isSignUp ? t('signIn') : t('signUp')}
        </button>
      </p>
    </form>
  )
}
