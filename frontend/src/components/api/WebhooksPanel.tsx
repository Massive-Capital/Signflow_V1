import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Card } from '../ui/Card'
import { StatusBadge } from '../common/StatusBadge'
import type { Webhook } from '../../types'

interface WebhookCardProps {
  webhook: Webhook
}

export function WebhookCard({ webhook }: WebhookCardProps) {
  return (
    <Card title={webhook.url}>
      <p><strong>Events:</strong> {webhook.events.join(', ')}</p>
      <p><strong>Secret:</strong> <code>{webhook.secret}</code></p>
      <p><strong>Retries:</strong> {webhook.retries}</p>
      <StatusBadge status={webhook.active ? 'Active' : 'Inactive'} variant={webhook.active ? 'completed' : 'draft'} />
    </Card>
  )
}

interface CreateWebhookModalProps {
  open: boolean
  url: string
  onClose: () => void
  onUrlChange: (value: string) => void
  onSubmit: () => void
}

export function CreateWebhookModal({ open, url, onClose, onUrlChange, onSubmit }: CreateWebhookModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Webhook Endpoint"
      footer={
        <>
          <CancelButton onClick={onClose} />
          <Button icon={Plus} onClick={onSubmit} disabled={!url.trim()}>Add</Button>
        </>
      }
    >
      <Input label="Endpoint URL" value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://api.example.com/webhooks" />
    </Modal>
  )
}
