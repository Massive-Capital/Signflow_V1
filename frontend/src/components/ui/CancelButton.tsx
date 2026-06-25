import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface CancelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

export function CancelButton({ children = 'Cancel', className = '', ...props }: CancelButtonProps) {
  return (
    <Button variant="secondary" icon={X} className={`btn-bordered-action ${className}`.trim()} {...props}>
      {children}
    </Button>
  )
}
