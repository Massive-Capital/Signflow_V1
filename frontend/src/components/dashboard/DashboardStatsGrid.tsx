import { Link } from 'react-router-dom'
import { CheckCircle2, Code2, Plug, Send, Timer, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatCard } from '../ui/Card'
import type { DashboardStats } from '../../types'

interface DashboardStatsGridProps {
  stats: DashboardStats
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const items: {
    label: string
    value: string | number
    trend?: string
    icon: LucideIcon
    link?: string
  }[] = [
    { label: 'Documents Sent', value: stats.documentsSent, trend: '+12% this month', icon: Send },
    { label: 'Completed', value: stats.completed, trend: 'Signed by clients', icon: CheckCircle2, link: '/documents?status=completed' },
    { label: 'Pending', value: stats.pending, icon: Timer },
    { label: 'API Calls', value: stats.apiCalls, trend: 'Monthly usage', icon: Plug },
    { label: 'Embedded Sessions', value: stats.embeddedSessions, icon: Code2 },
    { label: 'Monthly Usage', value: `${stats.monthlyUsage}%`, icon: TrendingUp },
  ]

  return (
    <div className="stats-grid">
      {items.map((item) => {
        const card = (
          <StatCard
            label={item.label}
            value={item.value}
            trend={item.trend}
            icon={item.icon}
          />
        )

        if (item.link) {
          return (
            <Link key={item.label} to={item.link} className="stat-card-link">
              {card}
            </Link>
          )
        }

        return (
          <div key={item.label} className="stat-card-wrap">
            {card}
          </div>
        )
      })}
    </div>
  )
}
