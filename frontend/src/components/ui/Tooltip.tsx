import type { ReactNode } from 'react'

interface TooltipProps {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="tooltip-wrap" data-tooltip={label}>
      {children}
    </span>
  )
}
