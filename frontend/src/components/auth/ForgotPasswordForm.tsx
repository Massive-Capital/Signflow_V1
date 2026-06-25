import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.auth.forgotPassword(data.email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link. Please try again.')
    }
  }

  return (
    <div className="auth-form">
      <h1>Reset password</h1>
      <p>We&apos;ll send you a link to reset your password</p>
      {sent ? (
        <div className="auth-message success">
          If an account exists for that email, a reset link has been sent. Check your inbox.{' '}
          <Link to="/login">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="auth-message error">{error}</div>}
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Button type="submit" fullWidth disabled={isSubmitting} icon={Mail}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="auth-footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
