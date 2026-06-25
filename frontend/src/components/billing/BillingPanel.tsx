import { ArrowUpCircle, CreditCard } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, StatCard } from '../ui/Card'
import { Table, type Column } from '../ui/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDisplayDate } from '../../utils/date'
import type { Invoice } from '../../types'

export function SubscriptionCard() {
  return (
    <Card title="Current Plan" subtitle="Professional — $299/month">
      <div className="actions-row">
        <Button variant="secondary" icon={ArrowUpCircle}>Upgrade Plan</Button>
        <Button variant="ghost" icon={CreditCard}>Manage Payment</Button>
      </div>
    </Card>
  )
}

interface UsageMetricsProps {
  apiCalls: number
  embeddedSessions: number
  documentsSigned: number
  limit: number
}

export function UsageMetrics({ apiCalls, embeddedSessions, documentsSigned, limit }: UsageMetricsProps) {
  return (
    <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
      <StatCard label="API Calls" value={apiCalls.toLocaleString()} />
      <StatCard label="Embedded Sessions" value={embeddedSessions} />
      <StatCard label="Documents Signed" value={documentsSigned} />
      <StatCard label="Usage Limit" value={`${Math.round((apiCalls / limit) * 100)}%`} />
    </div>
  )
}

interface InvoicesTableProps {
  invoices: Invoice[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const columns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice' },
    {
      key: 'date',
      header: 'Date',
      sortValue: (row) => new Date(row.date).getTime(),
      render: (row) => formatDisplayDate(row.date),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortValue: (row) => row.amount,
      render: (row) => `$${row.amount.toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge status={row.status} variant={row.status === 'paid' ? 'completed' : 'pending'} />
      ),
    },
  ]

  return (
    <Card title="Invoices">
      <Table
        columns={columns}
        data={invoices}
        keyField="id"
        defaultSort={{ key: 'date', direction: 'desc' }}
      />
    </Card>
  )
}
