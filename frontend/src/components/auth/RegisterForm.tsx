import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { APP_NAME } from '../common/AppBrand'
import { AuthFooter } from '../layouts/AuthLayout'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { api } from '../../api/client'
import { toast } from '../../utils/toast'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await api.auth.register(data.email, data.name, data.password)
      setSuccess(true)
      toast.success('Account created. Please verify your email to continue.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create account. Please try again.',
      )
    }
  }

  return (
    <div className="auth-form">
      <h1>Create account</h1>
      <p>Start your free {APP_NAME} workspace</p>
      {success ? (
        <div className="auth-message success">
          Account created! Please <Link to="/verify-email">verify your email</Link> to continue.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input label="Full name" {...register('name')} error={errors.name?.message} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="Confirm password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
          <Button type="submit" fullWidth disabled={isSubmitting} icon={UserPlus}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      )}
      <AuthFooter type="register" />
    </div>
  )
}
