import { useNavigate } from 'react-router-dom'
import { Code2, FilePlus2, KeyRound } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card title="Quick Actions">
      <div className="actions-row dashboard-actions">
        <Button
          className="quick-action-btn quick-action-create"
          icon={FilePlus2}
          onClick={() => navigate('/documents/new')}
        >
          Create Document
        </Button>
        <Button
          className="quick-action-btn quick-action-api"
          icon={KeyRound}
          onClick={() => navigate('/api-keys')}
        >
          Manage API Keys
        </Button>
        <Button
          className="quick-action-btn quick-action-playground"
          icon={Code2}
          onClick={() => navigate('/developer/playground')}
        >
          SDK Playground
        </Button>
      </div>
    </Card>
  )
}
