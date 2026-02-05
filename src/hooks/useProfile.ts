import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { detectTimezone } from '../utils/timezone'

export function useProfile() {
  const { profile, refreshProfile } = useAuth()

  const updateRole = async (role: 'student' | 'teacher') => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profile.id)
    if (error) throw error
    await refreshProfile()
  }

  const updateDisplayName = async (displayName: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id)
    if (error) throw error
    await refreshProfile()
  }

  const updateTimezone = async (timezone: string) => {
    if (!profile) return
    await supabase.from('profiles').update({ timezone }).eq('id', profile.id)
    await refreshProfile()
  }

  // Auto-detect timezone on mount if not set
  useEffect(() => {
    if (profile && !profile.timezone) {
      updateTimezone(detectTimezone())
    }
  }, [profile?.id, profile?.timezone])

  return {
    profile,
    isStudent: profile?.role === 'student',
    isTeacher: profile?.role === 'teacher',
    isSuperuser: profile?.is_superuser === true,
    hasRole: !!profile?.role,
    timezone: profile?.timezone ?? detectTimezone(),
    updateRole,
    updateDisplayName,
    updateTimezone,
  }
}
