import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeacherAvailability } from '../lib/database.types'

export function useTeacherAvailability(teacherId: string | undefined) {
  const [availability, setAvailability] = useState<TeacherAvailability[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    const { data } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('start_time')
    setAvailability(data ?? [])
    setLoading(false)
  }, [teacherId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const saveAvailability = async (
    slots: { day_of_week: number; start_time: string; end_time: string }[]
  ) => {
    if (!teacherId) return

    // Delete all existing, then insert new
    await supabase.from('teacher_availability').delete().eq('teacher_id', teacherId)

    if (slots.length > 0) {
      const { error } = await supabase.from('teacher_availability').insert(
        slots.map((s) => ({ ...s, teacher_id: teacherId }))
      )
      if (error) throw error
    }

    await fetch()
  }

  return { availability, loading, saveAvailability, refetch: fetch }
}
