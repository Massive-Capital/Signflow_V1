import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/common/LoadingState'
import { Card } from '../../components/ui/Card'
import { ActivityCard, RolesCard, TeamActions, TeamMembersTable } from '../../components/teams/TeamsPanel'
import { useTeamMembers } from '../../hooks/useTeamMembers'

export function TeamsPage() {
  const { data: members = [], isLoading } = useTeamMembers()

  return (
    <div>
      <PageHeader title="Teams" description="Manage users, roles, and invitations">
        <TeamActions />
      </PageHeader>
      <div className="page-grid">
        <Card title="Team Members">
          {isLoading ? <LoadingState /> : <TeamMembersTable members={members} />}
        </Card>
        <div className="form-row">
          <RolesCard />
          <ActivityCard />
        </div>
      </div>
    </div>
  )
}
