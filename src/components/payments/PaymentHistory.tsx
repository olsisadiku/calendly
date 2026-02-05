import type { Payment } from '../../lib/database.types'
import { Badge } from '../ui/Badge'
import { format, parseISO } from '../../utils/calendar'
import { useLanguage } from '../../contexts/LanguageContext'

interface PaymentHistoryProps {
  payments: Payment[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  const { t } = useLanguage()

  if (payments.length === 0) {
    return <p className="text-sm text-warm-400">{t('noPaymentHistory')}</p>
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-warm-100"
        >
          <div>
            <p className="text-sm font-medium text-warm-800">
              {format(parseISO(payment.billing_period_start), 'MMM d')} –{' '}
              {format(parseISO(payment.billing_period_end), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-warm-400 mt-0.5">{payment.lessons_count} {t('lessons')}</p>
          </div>
          <Badge variant={payment.paid_at ? 'success' : 'warning'}>
            {payment.paid_at
              ? `${t('paid')} ${format(parseISO(payment.paid_at), 'MMM d')}`
              : t('unpaid')}
          </Badge>
        </div>
      ))}
    </div>
  )
}
