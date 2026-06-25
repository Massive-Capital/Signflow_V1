import { Link, useLocation } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { AppBrand } from '../common/AppBrand'
import { WorkspaceSwitcher } from '../WorkspaceSwitcher'
import { TopNavBar } from './TopNavBar'
import { isNavItemActive, NAV_ITEMS } from '../../constants/navigation'
import './layouts.css'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon-wrap" aria-hidden>
            <PenLine size={18} strokeWidth={2.25} />
          </span>
          <AppBrand />
        </div>

        <WorkspaceSwitcher />

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = isNavItemActive(location.pathname, item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="dashboard-main">
        <TopNavBar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
