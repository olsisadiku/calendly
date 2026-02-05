import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment } from '../lib/database.types'

export function usePayments(matchId: string | undefined) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('match_id', matchId)
      .order('billing_period_start', { ascending: false })
    setPayments(data ?? [])
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createPayment = async (payment: {
    billing_period_start: string
    billing_period_end: string
    lessons_count: number
  }) => {
    if (!matchId) return
    const { error } = await supabase.from('payments').insert({
      match_id: matchId,
      ...payment,
    })
    if (error) throw error
    await fetch()
  }

  const markPaid = async (paymentId: string, userId: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ paid_at: new Date().toISOString(), marked_paid_by: userId })
      .eq('id', paymentId)
    if (error) throw error
    await fetch()
  }

  return { payments, loading, createPayment, markPaid, refetch: fetch }
}
