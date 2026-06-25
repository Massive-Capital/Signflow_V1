import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export function VerifyEmailContent() {
  return (
    <div className="auth-form">
      <h1>Verify your email</h1>
      <p>We sent a verification link to your email address. Click the link to activate your account.</p>
      <div className="auth-message success">
        Didn&apos;t receive the email? Check your spam folder or request a new link.
      </div>
      <Button fullWidth icon={RefreshCw}>Resend verification email</Button>
      <p className="auth-footer">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  )
}
