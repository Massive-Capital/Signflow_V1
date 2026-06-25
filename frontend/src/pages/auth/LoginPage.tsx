import { AuthLayout } from '../../components/layouts/AuthLayout'
import { LoginForm } from '../../components/auth/LoginForm'
import { PageTitle } from '../../components/common/PageTitle'

export function LoginPage() {
  return (
    <AuthLayout>
      <PageTitle title="Login" />
      <LoginForm />
    </AuthLayout>
  )
}
