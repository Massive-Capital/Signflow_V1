import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export function Card({ title, subtitle, children, className = '', actions }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string
  value: string | number
  trend?: string
  icon?: LucideIcon
}) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="stat-value">{displayValue}</div>
      <div className="stat-trend">{trend ?? ''}</div>
    </div>
  )
}
