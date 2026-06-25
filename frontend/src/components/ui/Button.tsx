import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  fullWidth?: boolean
  icon?: LucideIcon
  iconRight?: LucideIcon
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const sizeClass: Record<Size, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
}

const iconSize: Record<Size, number> = {
  sm: 15,
  md: 16,
  lg: 18,
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  icon: Icon,
  iconRight: IconRight,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'btn-full' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon className="btn-icon" size={iconSize[size]} strokeWidth={2} aria-hidden />}
      <span className="btn-label">{children}</span>
      {IconRight && (
        <IconRight className="btn-icon" size={iconSize[size]} strokeWidth={2} aria-hidden />
      )}
    </button>
  )
}
