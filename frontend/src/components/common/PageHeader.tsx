import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { getPageContext } from '../../constants/navigation'
import { PageBackButton } from './PageBackButton'
import { PageTitle } from './PageTitle'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  children?: ReactNode
  back?: boolean | string
  icon?: LucideIcon
}

export function PageHeader({ title, description, children, back, icon }: PageHeaderProps) {
  const location = useLocation()
  const pageContext = getPageContext(location.pathname)
  const backTo = typeof back === 'string' ? back : undefined
  const showBack = Boolean(back)
  const HeaderIcon = icon ?? pageContext.icon
  const sectionKey = pageContext.sectionPath.replace('/', '')

  return (
    <div className="page-header" data-section={sectionKey}>
      <PageTitle title={title} />
      {showBack && (
        <div className="page-header-back">
          <PageBackButton to={backTo} />
        </div>
      )}
      <div className="page-header-row">
        <div className="page-header-main">
          <span className="page-header-icon" aria-hidden>
            <HeaderIcon size={26} strokeWidth={2.25} />
          </span>
          <div className="page-header-text">
            <h1>
              <span className="page-header-title">{title}</span>
            </h1>
            {description && <p>{description}</p>}
          </div>
        </div>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
    </div>
  )
}
