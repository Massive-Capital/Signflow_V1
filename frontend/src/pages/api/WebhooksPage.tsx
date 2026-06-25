import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { CreateWebhookModal, WebhookCard } from '../../components/api/WebhooksPanel'
import { useCreateWebhook, useWebhooks } from '../../hooks/useWebhooks'

export function WebhooksPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [url, setUrl] = useState('')

  const { data: webhooks = [] } = useWebhooks()
  const createWebhook = useCreateWebhook()

  const handleCreate = () => {
    createWebhook.mutate(url, {
      onSuccess: () => {
        setShowCreate(false)
        setUrl('')
      },
    })
  }

  return (
    <div>
      <PageHeader title="Webhooks" description="Manage endpoints, secrets, and retry settings">
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Add Endpoint</Button>
      </PageHeader>
      <div className="page-grid">
        {webhooks.map((webhook) => (
          <WebhookCard key={webhook.id} webhook={webhook} />
        ))}
      </div>
      <CreateWebhookModal
        open={showCreate}
        url={url}
        onClose={() => setShowCreate(false)}
        onUrlChange={setUrl}
        onSubmit={handleCreate}
      />
    </div>
  )
}
