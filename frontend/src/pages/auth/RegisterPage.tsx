import { AuthLayout } from '../../components/layouts/AuthLayout'
import { RegisterForm } from '../../components/auth/RegisterForm'
import { PageTitle } from '../../components/common/PageTitle'

export function RegisterPage() {
  return (
    <AuthLayout>
      <PageTitle title="Register" />
      <RegisterForm />
    </AuthLayout>
  )
}
