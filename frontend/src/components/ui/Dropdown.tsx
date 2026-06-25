import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="dropdown" ref={ref}>
      <div className="dropdown-trigger" onClick={() => setOpen(!open)} role="button" tabIndex={0}>
        {trigger}
      </div>
      {open && (
        <div
          className={`dropdown-menu dropdown-${align}`}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('[data-keep-open]')) {
              setOpen(false)
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  active,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`dropdown-item ${active ? 'active' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
