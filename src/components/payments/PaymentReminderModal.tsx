import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { BillingPeriod } from '../../utils/billing'
import { useLanguage } from '../../contexts/LanguageContext'

interface PaymentReminderModalProps {
  open: boolean
  onClose: () => void
  onMarkPaid: () => void
  period: BillingPeriod | null
  lessonsCount: number
  counterpartName: string
  isStudent: boolean
  loading?: boolean
}

export function PaymentReminderModal({
  open,
  onClose,
  onMarkPaid,
  period,
  lessonsCount,
  counterpartName,
  isStudent,
  loading,
}: PaymentReminderModalProps) {
  const { t } = useLanguage()

  if (!period) return null

  return (
    <Modal open={open} onClose={onClose} title={t('paymentReminder')}>
      <div className="space-y-4">
        <div className="bg-accent-50 rounded-lg p-4 border border-accent-100">
          <p className="text-sm text-accent-800">
            {isStudent
              ? `${t('outstandingPayment')} ${counterpartName}`
              : `${t('paymentFromDue')} ${counterpartName} ${t('isDue')}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-warm-400 uppercase tracking-wider">{t('billingPeriod')}</p>
            <p className="text-sm font-medium text-warm-800 mt-0.5">{period.label}</p>
          </div>
          <div>
            <p className="text-xs text-warm-400 uppercase tracking-wider">{t('lessons')}</p>
            <p className="text-sm font-medium text-warm-800 mt-0.5">{lessonsCount} {t('lessons')}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t('dismiss')}
          </Button>
          {isStudent && (
            <Button onClick={onMarkPaid} loading={loading} className="flex-1">
              {t('markAsPaid')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
