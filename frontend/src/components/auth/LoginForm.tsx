import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { APP_NAME } from '../common/AppBrand'
import { AuthFooter } from '../layouts/AuthLayout'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const result = await api.auth.login(data.email, data.password)
      login(result.user, result.accessToken, result.refreshToken)
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="auth-form">
      <h1>Welcome back</h1>
      <p>Sign in to your {APP_NAME} account</p>
      {error && <div className="auth-message error">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
        <p className="auth-forgot-link">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <Button type="submit" fullWidth disabled={isSubmitting} icon={LogIn}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <AuthFooter type="login" />
    </div>
  )
}
