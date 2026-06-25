import { AuthLayout } from '../../components/layouts/AuthLayout'
import { ResetPasswordForm } from '../../components/auth/ResetPasswordForm'
import { PageTitle } from '../../components/common/PageTitle'

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <PageTitle title="Reset Password" />
      <ResetPasswordForm />
    </AuthLayout>
  )
}
