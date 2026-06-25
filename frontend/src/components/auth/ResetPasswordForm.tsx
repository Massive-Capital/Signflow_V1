import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (!token) {
    return (
      <div className="auth-form">
        <h1>Invalid reset link</h1>
        <p>This password reset link is missing or invalid.</p>
        <div className="auth-message error">
          Request a new link from the{' '}
          <Link to="/forgot-password">forgot password</Link> page.
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.auth.resetPassword(token, data.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.')
    }
  }

  return (
    <div className="auth-form">
      <h1>Set new password</h1>
      <p>Enter a new password for your account</p>
      {success ? (
        <div className="auth-message success">
          Password updated! Redirecting to sign in...
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="auth-message error">{error}</div>}
          <Input
            label="New password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Input
            label="Confirm password"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" fullWidth disabled={isSubmitting} icon={KeyRound}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      )}
      <p className="auth-footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
