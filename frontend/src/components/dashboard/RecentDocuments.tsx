import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { StatusBadge } from '../common/StatusBadge'
import { getDocumentStatusTimestamp } from '../../utils/recipientSigningStatus'
import type { Document } from '../../types'

interface RecentDocumentsProps {
  documents: Document[]
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  return (
    <Card
      title="Recent Documents"
      actions={
        <Link to="/documents">
          <Button variant="ghost" size="sm" iconRight={ArrowRight}>
            View all
          </Button>
        </Link>
      }
    >
      {documents.length === 0 ? (
        <p className="empty-state">No documents yet</p>
      ) : (
        <ul className="recent-list">
          {documents.map((doc) => {
            const timestamp = getDocumentStatusTimestamp(doc.status, doc)
            return (
              <li key={doc.id} className="recent-item">
                <Link to={`/documents/${doc.id}`}>
                  <span className="recent-title">{doc.title}</span>
                  <StatusBadge status={doc.status} timestamp={timestamp} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
