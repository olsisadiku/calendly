import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RecurringSchedule } from '../lib/database.types'

export function useRecurringSchedule(matchId: string | undefined) {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring_schedules')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time')
    setSchedules(data ?? [])
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const addSchedule = async (schedule: {
    day_of_week: number
    start_time: string
    end_time: string
  }) => {
    if (!matchId) return
    const { error } = await supabase.from('recurring_schedules').insert({
      match_id: matchId,
      ...schedule,
    })
    if (error) throw error
    await fetch()
  }

  const removeSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from('recurring_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId)
    if (error) throw error
    await fetch()
  }

  return { schedules, loading, addSchedule, removeSchedule, refetch: fetch }
}
