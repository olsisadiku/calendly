import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import type { StudentTeacherMatch, RecurringSchedule, LessonInstance, TeacherAvailability, Payment } from '../lib/database.types'
import { useCalendarData, type CalendarLesson } from '../hooks/useCalendarData'
import { CalendarHeader } from '../components/calendar/CalendarHeader'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { RescheduleModal } from '../components/calendar/RescheduleModal'
import { PaymentReminderModal } from '../components/payments/PaymentReminderModal'
import { PaymentHistory } from '../components/payments/PaymentHistory'
import { getBillingPeriod, type BillingPeriod } from '../utils/billing'
import { addMonths, subMonths, format } from '../utils/calendar'
import { detectTimezone } from '../utils/timezone'
import { toast } from '../components/ui/Toast'
import type { LessonStatus } from '../lib/constants'

type MatchWithNames = StudentTeacherMatch & { teacher_name: string; student_name: string; teacher_timezone: string }

export function DashboardPage() {
  const { user } = useAuth()
  const { isStudent, isTeacher, timezone: viewerTimezone } = useProfile()
  const { t } = useLanguage()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [matches, setMatches] = useState<MatchWithNames[]>([])
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [instances, setInstances] = useState<LessonInstance[]>([])
  const [availability, setAvailability] = useState<TeacherAvailability[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedLesson, setSelectedLesson] = useState<CalendarLesson | null>(null)
  const [paymentReminder, setPaymentReminder] = useState<{
    matchId: string
    period: BillingPeriod
    count: number
    name: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const rangeStart = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    d.setDate(d.getDate() - 7)
    return d
  }, [currentDate])

  const rangeEnd = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    d.setDate(d.getDate() + 7)
    return d
  }, [currentDate])

  const fetchData = useCallback(async () => {
    if (!user) return

    const roleColumn = isTeacher ? 'teacher_id' : 'student_id'

    // Fetch matches with teacher timezone
    const { data: matchData } = await supabase
      .from('student_teacher_matches')
      .select('*, teacher:profiles!student_teacher_matches_teacher_id_fkey(display_name, timezone), student:profiles!student_teacher_matches_student_id_fkey(display_name)')
      .eq(roleColumn, user.id)
      .eq('is_active', true)

    const typedMatches: MatchWithNames[] = (matchData ?? []).map((m: any) => ({
      ...m,
      teacher_name: m.teacher?.display_name ?? 'Unknown Teacher',
      student_name: m.student?.display_name ?? 'Unknown Student',
      // Teacher viewing own data → use viewer TZ (always in sync, no conversion)
      // Student viewing teacher data → use teacher's DB timezone for conversion
      teacher_timezone: isTeacher ? viewerTimezone : (m.teacher?.timezone ?? detectTimezone()),
    }))
    setMatches(typedMatches)

    if (typedMatches.length === 0) {
      setLoading(false)
      return
    }

    const matchIds = typedMatches.map((m) => m.id)

    // Fetch schedules, instances, and payments in parallel
    const [schedulesRes, paymentsRes] = await Promise.all([
      supabase
        .from('recurring_schedules')
        .select('*')
        .in('match_id', matchIds)
        .eq('is_active', true),
      supabase
        .from('payments')
        .select('*')
        .in('match_id', matchIds)
        .order('billing_period_start', { ascending: false }),
    ])

    const fetchedSchedules = schedulesRes.data ?? []
    setSchedules(fetchedSchedules)
    setPayments(paymentsRes.data ?? [])

    // Fetch instances for these schedules
    if (fetchedSchedules.length > 0) {
      const { data: instanceData } = await supabase
        .from('lesson_instances')
        .select('*')
        .in('schedule_id', fetchedSchedules.map((s) => s.id))
      setInstances(instanceData ?? [])
    }

    // Fetch teacher availability for the first matched teacher (for rescheduling)
    if (typedMatches.length > 0) {
      const teacherIds = [...new Set(typedMatches.map((m) => m.teacher_id))]
      const { data: availData } = await supabase
        .from('teacher_availability')
        .select('*')
        .in('teacher_id', teacherIds)
      setAvailability(availData ?? [])
    }

    // Check payment reminders
    for (const match of typedMatches) {
      const period = getBillingPeriod(match.matched_at)
      const now = new Date()

      // Check if we're past the period end and no payment exists
      if (now >= period.end) {
        const existingPayment = (paymentsRes.data ?? []).find(
          (p) =>
            p.match_id === match.id &&
            p.billing_period_start === format(period.start, 'yyyy-MM-dd')
        )

        if (!existingPayment) {
          setPaymentReminder({
            matchId: match.id,
            period,
            count: fetchedSchedules.filter((s) => s.match_id === match.id).length * 4, // rough estimate
            name: isTeacher ? match.student_name : match.teacher_name,
          })
          break
        }
      }
    }

    setLoading(false)
  }, [user, isTeacher, isStudent, viewerTimezone])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lessons = useCalendarData(matches, schedules, instances, rangeStart, rangeEnd, viewerTimezone)

  const handleReschedule = async (lesson: CalendarLesson, newDate: string, newStartTime: string, newEndTime: string) => {
    // When re-rescheduling, use the FIRST original date (the virtual recurring date)
    const originalDate = lesson.rescheduledFrom ?? lesson.dateStr

    const { error } = await supabase.from('lesson_instances').upsert(
      {
        schedule_id: lesson.scheduleId,
        original_date: originalDate,
        actual_date: newDate,
        actual_start_time: newStartTime,
        actual_end_time: newEndTime,
        status: 'rescheduled' as const,
        rescheduled_from: originalDate,
      },
      { onConflict: 'schedule_id,original_date', ignoreDuplicates: false }
    )

    if (error) {
      // Fallback: try insert or update manually
      const { data: existing } = await supabase
        .from('lesson_instances')
        .select('id')
        .eq('schedule_id', lesson.scheduleId)
        .eq('original_date', originalDate)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('lesson_instances')
          .update({
            actual_date: newDate,
            actual_start_time: newStartTime,
            actual_end_time: newEndTime,
            status: 'rescheduled',
            rescheduled_from: originalDate,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('lesson_instances').insert({
          schedule_id: lesson.scheduleId,
          original_date: originalDate,
          actual_date: newDate,
          actual_start_time: newStartTime,
          actual_end_time: newEndTime,
          status: 'rescheduled',
          rescheduled_from: originalDate,
        })
      }
    }

    toast(t('lessonRescheduled'), 'success')
    fetchData()
  }

  const handleUpdateStatus = async (lesson: CalendarLesson, status: LessonStatus) => {
    if (lesson.instanceId) {
      await supabase
        .from('lesson_instances')
        .update({ status })
        .eq('id', lesson.instanceId)
    } else {
      await supabase.from('lesson_instances').insert({
        schedule_id: lesson.scheduleId,
        original_date: lesson.dateStr,
        actual_date: lesson.dateStr,
        status,
      })
    }

    toast(`${t('lessonMarkedAs')} ${t(status)}`, 'success')
    fetchData()
  }

  const handleMarkPaid = async () => {
    if (!paymentReminder || !user) return
    await supabase.from('payments').insert({
      match_id: paymentReminder.matchId,
      billing_period_start: format(paymentReminder.period.start, 'yyyy-MM-dd'),
      billing_period_end: format(paymentReminder.period.end, 'yyyy-MM-dd'),
      lessons_count: paymentReminder.count,
      paid_at: new Date().toISOString(),
      marked_paid_by: user.id,
    })
    setPaymentReminder(null)
    toast(t('paymentMarkedAsPaid'), 'success')
    fetchData()
  }

  // Teacher: check if can modify lesson (within 24h of actual_date)
  const canModifyLesson = (lesson: CalendarLesson) => {
    if (isStudent) return true
    if (isTeacher) {
      const lessonDate = lesson.date
      const now = new Date()
      const diff = now.getTime() - lessonDate.getTime()
      return diff <= 24 * 60 * 60 * 1000
    }
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const timezoneCity = viewerTimezone.split('/').pop()?.replace(/_/g, ' ') ?? viewerTimezone

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onPrev={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : new Date(currentDate.getTime() - 7 * 86400000))}
        onNext={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : new Date(currentDate.getTime() + 7 * 86400000))}
        onToday={() => setCurrentDate(new Date())}
        onViewChange={setView}
      />

      <p className="text-xs text-warm-400 mb-2 px-1">
        {t('timesShownIn')} {timezoneCity}
      </p>

      <CalendarGrid
        currentDate={currentDate}
        view={view}
        lessons={lessons}
        onLessonClick={setSelectedLesson}
      />

      {/* Payment section */}
      {matches.length > 0 && payments.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">{t('paymentHistory')}</h3>
          <PaymentHistory payments={payments} />
        </div>
      )}

      {/* Lesson detail modal */}
      <RescheduleModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        onReschedule={handleReschedule}
        onUpdateStatus={handleUpdateStatus}
        availability={availability}
        allLessons={lessons}
        isTeacher={isTeacher}
        canModify={selectedLesson ? canModifyLesson(selectedLesson) : false}
        viewerTimezone={viewerTimezone}
      />

      {/* Payment reminder */}
      <PaymentReminderModal
        open={!!paymentReminder}
        onClose={() => setPaymentReminder(null)}
        onMarkPaid={handleMarkPaid}
        period={paymentReminder?.period ?? null}
        lessonsCount={paymentReminder?.count ?? 0}
        counterpartName={paymentReminder?.name ?? ''}
        isStudent={isStudent}
      />
    </div>
  )
}
