import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'
import { toast } from '../../utils/toast'

export function VerifyEmailContent() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [email, setEmail] = useState('')
  const [verified, setVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setIsVerifying(true)

    api.auth
      .verifyEmail(token)
      .then(() => {
        if (cancelled) return
        setVerified(true)
        toast.success('Email verified. You can sign in now.')
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'Verification failed.')
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address to resend verification.')
      return
    }

    setIsResending(true)
    try {
      await api.auth.resendVerification(email.trim())
      toast.success('If the account exists and is unverified, a new link has been sent.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="auth-form">
      <h1>Verify your email</h1>
      {token ? (
        <p>
          {isVerifying
            ? 'Verifying your email address...'
            : verified
              ? 'Your email has been verified.'
              : 'This verification link is invalid or has expired.'}
        </p>
      ) : (
        <p>We sent a verification link to your email address. Click the link to activate your account.</p>
      )}
      <div className="auth-message success">
        Didn&apos;t receive the email? Check your spam folder or request a new link.
      </div>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button fullWidth icon={RefreshCw} disabled={isResending} onClick={handleResend}>
        {isResending ? 'Sending...' : 'Resend verification email'}
      </Button>
      <p className="auth-footer">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  )
}
