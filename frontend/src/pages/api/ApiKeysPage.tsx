import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/common/LoadingState'
import { Button } from '../../components/ui/Button'
import { ApiKeysTable, CreateApiKeyModal, CreatedApiKeyModal } from '../../components/api/ApiKeysPanel'
import { useApiKeys, useCreateApiKey } from '../../hooks/useApiKeys'

export function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('sandbox')

  const { data: keys = [], isLoading } = useApiKeys()
  const createKey = useCreateApiKey()

  const handleCreate = () => {
    createKey.mutate(
      { name, environment },
      {
        onSuccess: (key) => {
          setShowCreate(false)
          setName('')
          setCreatedKey(key.key)
        },
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Create and manage production and sandbox API keys for your application"
      >
        <Button icon={KeyRound} onClick={() => setShowCreate(true)}>Create API Key</Button>
      </PageHeader>
      {isLoading ? <LoadingState /> : <ApiKeysTable keys={keys} />}
      <CreateApiKeyModal
        open={showCreate}
        name={name}
        environment={environment}
        isPending={createKey.isPending}
        onClose={() => setShowCreate(false)}
        onNameChange={setName}
        onEnvironmentChange={setEnvironment}
        onSubmit={handleCreate}
      />
      <CreatedApiKeyModal
        open={createdKey !== null}
        apiKey={createdKey}
        onClose={() => setCreatedKey(null)}
      />
    </div>
  )
}
