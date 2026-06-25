import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/common/LoadingState'
import { DashboardStatsGrid } from '../../components/dashboard/DashboardStatsGrid'
import { RecentDocuments } from '../../components/dashboard/RecentDocuments'
import { QuickActions } from '../../components/dashboard/QuickActions'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import { useDocuments } from '../../hooks/useDocuments'

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: documents } = useDocuments()
  const recentDocs = documents?.slice(0, 5) ?? []

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your signing activity and usage" />

      {isLoading ? <LoadingState message="Loading stats..." /> : stats && <DashboardStatsGrid stats={stats} />}

      <div className="page-grid dashboard-page-grid page-section">
        <RecentDocuments documents={recentDocs} />
        <QuickActions />
      </div>
    </div>
  )
}
