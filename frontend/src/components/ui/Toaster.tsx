import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useToastStore, type Toast, type ToastType } from '../../stores/toastStore'

const TOAST_ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss)
  const Icon = TOAST_ICONS[toast.type]

  return (
    <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
      <Icon className="toast-icon" size={18} strokeWidth={2.25} aria-hidden />
      <p className="toast-message">{toast.message}</p>
      <button
        type="button"
        className="toast-dismiss"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} />
      ))}
    </div>
  )
}
