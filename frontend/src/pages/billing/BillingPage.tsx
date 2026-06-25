import { PageHeader } from '../../components/common/PageHeader'
import { InvoicesTable, SubscriptionCard, UsageMetrics } from '../../components/billing/BillingPanel'
import { useBilling } from '../../hooks/useBilling'

export function BillingPage() {
  const { invoicesQuery, usageQuery } = useBilling()

  return (
    <div>
      <PageHeader title="Billing" description="Subscription, invoices, and usage metrics" />
      <SubscriptionCard />
      {usageQuery.data && (
        <UsageMetrics
          apiCalls={usageQuery.data.apiCalls}
          embeddedSessions={usageQuery.data.embeddedSessions}
          documentsSigned={usageQuery.data.documentsSigned}
          limit={usageQuery.data.limit}
        />
      )}
      <div className="page-section">
        <InvoicesTable invoices={invoicesQuery.data ?? []} />
      </div>
    </div>
  )
}
