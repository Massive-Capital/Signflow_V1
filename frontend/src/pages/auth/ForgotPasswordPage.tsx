import { AuthLayout } from '../../components/layouts/AuthLayout'
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm'
import { PageTitle } from '../../components/common/PageTitle'

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <PageTitle title="Forgot Password" />
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
