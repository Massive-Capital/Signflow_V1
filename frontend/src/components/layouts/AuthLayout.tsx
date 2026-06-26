import { Link } from 'react-router-dom'
import { CheckCircle2, PenLine } from 'lucide-react'
import { AppBrand } from '../common/AppBrand'
import './layouts.css'

const AUTH_FEATURES = [
  'Document builder with field placement',
  'Embedded signing SDK',
  'API-first architecture',
  'Multi-tenant workspaces',
] as const

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <header className="auth-header">
            <div className="auth-brand">
              <span className="brand-icon-wrap" aria-hidden>
                <PenLine size={18} strokeWidth={2.25} />
              </span>
              <AppBrand />
            </div>
            <p className="auth-tagline">Multi-tenant e-signature platform</p>
          </header>
          <div className="auth-content">{children}</div>
        </div>
      </div>
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <h2>Sign documents anywhere</h2>
          <p>
            Manage workflows, embed signing into your apps, and white-label the experience — all
            from one platform.
          </p>
          <ul className="auth-features">
            {AUTH_FEATURES.map((feature) => (
              <li key={feature}>
                <CheckCircle2 size={18} strokeWidth={2} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function AuthFooter({ type }: { type: 'login' | 'register' }) {
  return (
    <p className="auth-footer">
      {type === 'login' ? (
        <>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </>
      ) : (
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      )}
    </p>
  )
}
