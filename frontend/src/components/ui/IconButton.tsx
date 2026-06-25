import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: Variant
  size?: Size
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
  sm: 16,
  md: 17,
  lg: 18,
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'sm',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`btn ${variantClass[variant]} ${sizeClass[size]} btn-icon-only ${className}`}
      aria-label={label}
      {...props}
    >
      <Icon className="btn-icon" size={iconSize[size]} strokeWidth={2} aria-hidden />
    </button>
  )
}
