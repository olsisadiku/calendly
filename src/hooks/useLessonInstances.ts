import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LessonInstance } from '../lib/database.types'
import type { LessonStatus } from '../lib/constants'

export function useLessonInstances(scheduleIds: string[]) {
  const [instances, setInstances] = useState<LessonInstance[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (scheduleIds.length === 0) {
      setInstances([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('lesson_instances')
      .select('*')
      .in('schedule_id', scheduleIds)
    setInstances(data ?? [])
    setLoading(false)
  }, [scheduleIds.join(',')])

  useEffect(() => {
    fetch()
  }, [fetch])

  const upsertInstance = async (instance: {
    schedule_id: string
    original_date: string
    actual_date: string
    status: LessonStatus
    rescheduled_from?: string | null
  }) => {
    // Check if instance already exists for this schedule + original_date
    const { data: existing } = await supabase
      .from('lesson_instances')
      .select('id')
      .eq('schedule_id', instance.schedule_id)
      .eq('original_date', instance.original_date)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('lesson_instances')
        .update({
          actual_date: instance.actual_date,
          status: instance.status,
          rescheduled_from: instance.rescheduled_from,
        })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('lesson_instances').insert(instance)
      if (error) throw error
    }
    await fetch()
  }

  const updateStatus = async (instanceId: string, status: LessonStatus) => {
    const { error } = await supabase
      .from('lesson_instances')
      .update({ status })
      .eq('id', instanceId)
    if (error) throw error
    await fetch()
  }

  return { instances, loading, upsertInstance, updateStatus, refetch: fetch }
}
