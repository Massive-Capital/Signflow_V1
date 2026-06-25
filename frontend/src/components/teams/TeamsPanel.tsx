import { ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Table, type Column } from '../ui/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDisplayDate } from '../../utils/date'
import type { TeamMember } from '../../types'

interface TeamMembersTableProps {
  members: TeamMember[]
}

export function TeamMembersTable({ members }: TeamMembersTableProps) {
  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (row) => row.name.toLowerCase(),
      render: (row) => <strong>{row.name}</strong>,
    },
    { key: 'email', header: 'Email', sortValue: (row) => row.email.toLowerCase() },
    { key: 'role', header: 'Role', sortValue: (row) => row.role.toLowerCase() },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge status={row.status} variant={row.status === 'active' ? 'completed' : 'pending'} />
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      sortValue: (row) => (row.lastActive ? new Date(row.lastActive).getTime() : null),
      render: (row) => (row.lastActive ? formatDisplayDate(row.lastActive) : '—'),
    },
  ]

  return (
    <Table
      columns={columns}
      data={members}
      keyField="id"
      defaultSort={{ key: 'name', direction: 'asc' }}
    />
  )
}

export function TeamActions() {
  return (
    <>
      <Button icon={UserPlus}>Invite User</Button>
      <Button variant="secondary" icon={ShieldCheck}>Manage Roles</Button>
    </>
  )
}

export function RolesCard() {
  return (
    <Card title="Roles">
      <ul className="role-list">
        <li><strong>Owner</strong> — Full access including billing</li>
        <li><strong>Admin</strong> — Manage documents, teams, and API</li>
        <li><strong>Member</strong> — Create and send documents</li>
      </ul>
    </Card>
  )
}

export function ActivityCard() {
  return (
    <Card title="Recent Activity">
      <ul className="activity-list">
        <li>Sarah Admin sent NDA - TechNova Partnership</li>
        <li>Mike Developer created API key (Sandbox)</li>
        <li>Lisa Member completed Employment Agreement</li>
      </ul>
    </Card>
  )
}
