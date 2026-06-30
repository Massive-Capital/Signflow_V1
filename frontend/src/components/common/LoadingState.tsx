import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  /** Screen-reader label; defaults to "Loading". */
  label?: string
  /** Center in the full viewport (e.g. auth/session bootstrap). */
  fullPage?: boolean
}

export function LoadingState({ label = 'Loading', fullPage = false }: LoadingStateProps) {
  return (
    <div
      className={['loading-state', fullPage ? 'loading-state--full-page' : ''].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2 className="loading-state-spinner" size={26} strokeWidth={2} aria-hidden />
    </div>
  )
}
