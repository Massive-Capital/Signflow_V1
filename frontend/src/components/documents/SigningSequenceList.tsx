import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { formatRecipientRole } from '../../constants/fieldTypes'
import type { Recipient } from '../../types'
import { moveSigningOrderItem } from '../../utils/signingOrder'

interface SigningSequenceListProps {
  recipients: Recipient[]
  signingOrder: string[]
  onSigningOrderChange: (order: string[]) => void
}

export function SigningSequenceList({
  recipients,
  signingOrder,
  onSigningOrderChange,
}: SigningSequenceListProps) {
  const recipientById = new Map(recipients.map((recipient) => [recipient.id, recipient]))

  const move = (index: number, direction: 'up' | 'down') => {
    onSigningOrderChange(moveSigningOrderItem(signingOrder, index, direction))
  }

  return (
    <div className="send-signing-sequence">
      <div className="send-signing-sequence-header">
        <h3>Signing sequence</h3>
        <p>Recipients sign one after another in this order.</p>
      </div>
      <ol className="send-signing-sequence-list">
        {signingOrder.map((recipientId, index) => {
          const recipient = recipientById.get(recipientId)
          if (!recipient) return null

          return (
            <li key={recipientId} className="send-signing-sequence-item">
              <span className="send-signing-sequence-grip" aria-hidden>
                <GripVertical size={16} strokeWidth={2} />
              </span>
              <span className="send-signing-sequence-step">{index + 1}</span>
              <div
                className="send-signing-sequence-avatar"
                style={{ backgroundColor: recipient.color }}
                aria-hidden
              >
                {recipient.name.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <div className="send-signing-sequence-main">
                <strong>{recipient.name}</strong>
                <span>{recipient.email}</span>
              </div>
              <span className="role-tag send-workflow-role">{formatRecipientRole(recipient.role)}</span>
              <div className="send-signing-sequence-actions">
                <button
                  type="button"
                  className="send-signing-sequence-move"
                  aria-label={`Move ${recipient.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, 'up')}
                >
                  <ArrowUp size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="send-signing-sequence-move"
                  aria-label={`Move ${recipient.name} down`}
                  disabled={index === signingOrder.length - 1}
                  onClick={() => move(index, 'down')}
                >
                  <ArrowDown size={14} strokeWidth={2} />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
