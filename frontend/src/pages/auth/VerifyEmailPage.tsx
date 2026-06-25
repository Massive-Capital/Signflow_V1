import { AuthLayout } from '../../components/layouts/AuthLayout'
import { VerifyEmailContent } from '../../components/auth/VerifyEmailContent'
import { PageTitle } from '../../components/common/PageTitle'

export function VerifyEmailPage() {
  return (
    <AuthLayout>
      <PageTitle title="Verify Email" />
      <VerifyEmailContent />
    </AuthLayout>
  )
}
