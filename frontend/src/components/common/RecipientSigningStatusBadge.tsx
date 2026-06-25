import { CheckCircle2, Clock, Eye, Send, Stamp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RecipientSigningStatus } from '../../types'
import { formatDisplayDateTime } from '../../utils/date'
import { getRecipientSigningStatusLabel } from '../../utils/recipientSigningStatus'

const STATUS_ICONS: Record<RecipientSigningStatus, LucideIcon> = {
  pending: Clock,
  sent: Send,
  viewed: Eye,
  signed: CheckCircle2,
  awaiting_countersign: Stamp,
}

interface RecipientSigningStatusBadgeProps {
  status: RecipientSigningStatus
  timestamp?: string
}

export function RecipientSigningStatusBadge({ status, timestamp }: RecipientSigningStatusBadgeProps) {
  const label = getRecipientSigningStatusLabel(status)
  const Icon = STATUS_ICONS[status]

  if (!label) return null

  return (
    <span className="recipient-status-badge-group">
      <span className={`recipient-status-badge recipient-status-${status}`}>
        <Icon className="recipient-status-badge-icon" size={12} strokeWidth={2.25} aria-hidden />
        {label}
      </span>
      {timestamp && (
        <time className="recipient-status-timestamp" dateTime={timestamp}>
          {formatDisplayDateTime(timestamp)}
        </time>
      )}
    </span>
  )
}
