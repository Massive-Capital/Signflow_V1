import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore, type ThemeMode } from '../../stores/themeStore'
import { toast } from '../../utils/toast'
import { Dropdown, DropdownItem } from '../ui/Dropdown'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function TopNavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { mode, setMode } = useThemeStore()
  const isBuilderPage = /\/documents\/[^/]+\/builder(?:\/|$)/.test(location.pathname)

  const handleLogout = () => {
    logout()
    toast.info('Signed out.')
    navigate('/login')
  }

  return (
    <header className={`top-nav${isBuilderPage ? ' top-nav--builder' : ''}`}>
      <Dropdown
        align="right"
        trigger={
          <button type="button" className="profile-trigger" aria-label="Profile menu">
            <span className="profile-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            <span className="profile-name">{user?.name}</span>
            <svg className="profile-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        }
      >
        <div className="profile-menu-header">
          <span className="profile-avatar profile-avatar-lg">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
          <div>
            <div className="profile-menu-name">{user?.name}</div>
            <div className="profile-menu-email">{user?.email}</div>
          </div>
        </div>

        <DropdownItem onClick={() => navigate('/account')}>
          <span className="dropdown-item-icon" aria-hidden>
            <UserRound size={16} strokeWidth={2} />
          </span>
          My Account
        </DropdownItem>

        <div className="dropdown-theme-section" data-keep-open role="radiogroup" aria-label="Theme">
          <div className="dropdown-theme-header">
            <Palette size={14} strokeWidth={2} aria-hidden />
            <span className="dropdown-theme-label">Appearance</span>
          </div>
          <div className="dropdown-theme-options">
            {THEME_OPTIONS.map((option) => {
              const ThemeIcon = option.icon
              const isActive = mode === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`dropdown-theme-option ${isActive ? 'active' : ''}`}
                  onClick={() => setMode(option.value)}
                >
                  <span className="dropdown-theme-option-icon" aria-hidden>
                    <ThemeIcon size={15} strokeWidth={2} />
                  </span>
                  <span className="dropdown-theme-option-label">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="dropdown-divider" />

        <DropdownItem className="dropdown-item-logout" onClick={handleLogout}>
          <span className="dropdown-item-icon" aria-hidden>
            <LogOut size={16} strokeWidth={2} />
          </span>
          Logout
        </DropdownItem>
      </Dropdown>
    </header>
  )
}
