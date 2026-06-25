import {
  CheckCircle2,
  Clock,
  FilePenLine,
  FlaskConical,
  Rocket,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { formatDisplayDateTime } from '../../utils/date'

type StatusVariant = 'draft' | 'sent' | 'pending' | 'completed' | 'declined' | 'paid'

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  timestamp?: string
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  draft: FilePenLine,
  sent: Send,
  pending: Clock,
  completed: CheckCircle2,
  declined: XCircle,
  paid: CheckCircle2,
  active: CheckCircle2,
  inactive: XCircle,
  invited: Clock,
  production: Rocket,
  sandbox: FlaskConical,
}

function getStatusIcon(status: string, cssClass: string): LucideIcon | undefined {
  return STATUS_ICONS[status.toLowerCase()] ?? STATUS_ICONS[cssClass]
}

export function StatusBadge({ status, variant, timestamp }: StatusBadgeProps) {
  const cssClass = variant ?? status.toLowerCase()
  const Icon = getStatusIcon(status, cssClass)

  return (
    <span className="status-badge-group">
      <span className={`status-badge status-${cssClass}`}>
        {Icon && <Icon className="status-badge-icon" size={13} strokeWidth={2.25} aria-hidden />}
        {status}
      </span>
      {timestamp && (
        <time className="status-badge-timestamp" dateTime={timestamp}>
          {formatDisplayDateTime(timestamp)}
        </time>
      )}
    </span>
  )
}
