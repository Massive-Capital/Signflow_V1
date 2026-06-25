import type { Recipient } from '../../types'

interface RecipientListProps {
  recipients: Recipient[]
  emptyMessage?: string
}

export function RecipientList({ recipients, emptyMessage = 'No recipients assigned' }: RecipientListProps) {
  if (recipients.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <ul className="recipient-list">
      {recipients.map((recipient) => (
        <li key={recipient.id} style={{ borderLeftColor: recipient.color }}>
          <div className="recipient-list-main">
            <div className="recipient-list-title-row">
              <strong className="recipient-list-label">{recipient.name}</strong>
            </div>
            <div className="recipient-list-meta">
              <span className="recipient-list-role-chip">
                {recipient.role.replace('_', ' ')}
              </span>
              <span className="recipient-list-meta-text">{recipient.email}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
