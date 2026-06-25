import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { useAuthStore } from '../../stores/authStore'

export function AccountPage() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div>
      <PageHeader title="My Account" description="Manage your profile and account settings" />

      <Card>
        <div className="account-profile">
          <div className="account-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <h3>{user.name}</h3>
            <p className="account-email">{user.email}</p>
          </div>
        </div>

        <dl className="account-details">
          <div className="account-detail-row">
            <dt>Role</dt>
            <dd className="account-role">{user.role}</dd>
          </div>
          <div className="account-detail-row">
            <dt>User ID</dt>
            <dd className="account-id">{user.id}</dd>
          </div>
          <div className="account-detail-row">
            <dt>Organization</dt>
            <dd className="account-id">{user.organizationId}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
