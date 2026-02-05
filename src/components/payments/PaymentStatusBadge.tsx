import { Badge } from '../ui/Badge'

interface PaymentStatusBadgeProps {
  isPaid: boolean
  paidDate?: string | null
}

export function PaymentStatusBadge({ isPaid }: PaymentStatusBadgeProps) {
  return (
    <Badge variant={isPaid ? 'success' : 'warning'}>
      {isPaid ? 'Paid' : 'Unpaid'}
    </Badge>
  )
}
