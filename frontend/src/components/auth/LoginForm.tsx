import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { APP_NAME } from '../common/AppBrand'
import { AuthFooter } from '../layouts/AuthLayout'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../utils/toast'

type LoginRedirectState = {
  from?: {
    pathname: string
    search?: string
  }
}

function getRedirectPath(state: unknown, search: string): string {
  const queryRedirect = new URLSearchParams(search).get('redirect')
  if (queryRedirect?.startsWith('/') && !queryRedirect.startsWith('//')) {
    return queryRedirect
  }

  const from = (state as LoginRedirectState | null)?.from
  if (!from?.pathname) return '/dashboard'
  return `${from.pathname}${from.search ?? ''}`
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState('')

  const redirectTo = getRedirectPath(location.state, location.search)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const result = await api.auth.login(data.email, data.password)
      login(result.user)
      toast.success('Signed in successfully.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
      setError(message)
      toast.error(message)
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
