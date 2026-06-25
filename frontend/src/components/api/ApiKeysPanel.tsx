import { Check, Copy, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Input, Select } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Table, type Column } from '../ui/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDisplayDate } from '../../utils/date'
import type { ApiKey } from '../../types'

interface ApiKeysTableProps {
  keys: ApiKey[]
}

export function ApiKeysTable({ keys }: ApiKeysTableProps) {
  const columns: Column<ApiKey>[] = [
    {
      key: 'name',
      header: 'Key Name',
      sortValue: (row) => row.name.toLowerCase(),
      render: (row) => <strong>{row.name}</strong>,
    },
    {
      key: 'environment',
      header: 'Environment',
      sortValue: (row) => row.environment,
      render: (row) => (
        <StatusBadge
          status={row.environment}
          variant={row.environment === 'production' ? 'sent' : 'draft'}
        />
      ),
    },
    { key: 'key', header: 'Key', sortValue: (row) => row.key, render: (row) => <code>{row.key}</code> },
    {
      key: 'createdAt',
      header: 'Created',
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => formatDisplayDate(row.createdAt),
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      sortValue: (row) => (row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : null),
      render: (row) => (row.lastUsedAt ? formatDisplayDate(row.lastUsedAt) : 'Never'),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      sortValue: (row) => row.permissions.join(', ').toLowerCase(),
      render: (row) => row.permissions.join(', '),
    },
  ]

  return (
    <Table
      columns={columns}
      data={keys}
      keyField="id"
      defaultSort={{ key: 'createdAt', direction: 'desc' }}
    />
  )
}

interface CreateApiKeyModalProps {
  open: boolean
  name: string
  environment: 'production' | 'sandbox'
  isPending: boolean
  onClose: () => void
  onNameChange: (value: string) => void
  onEnvironmentChange: (value: 'production' | 'sandbox') => void
  onSubmit: () => void
}

interface CreatedApiKeyModalProps {
  open: boolean
  apiKey: string | null
  onClose: () => void
}

export function CreatedApiKeyModal({ open, apiKey, onClose }: CreatedApiKeyModalProps) {
  const handleCopy = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="API Key Created"
      footer={<Button icon={Check} onClick={onClose}>Done</Button>}
    >
      <p className="api-key-created-hint">
        Copy this key now. For security, it will not be shown again.
      </p>
      <div className="api-key-created-value">
        <code>{apiKey}</code>
        <Button type="button" size="sm" variant="secondary" icon={Copy} onClick={handleCopy}>
          Copy
        </Button>
      </div>
      <p className="api-key-created-usage">
        Use it in your application with{' '}
        <code>Authorization: Bearer &lt;api_key&gt;</code> or the{' '}
        <code>X-API-Key</code> header.
      </p>
    </Modal>
  )
}

export function CreateApiKeyModal({
  open,
  name,
  environment,
  isPending,
  onClose,
  onNameChange,
  onEnvironmentChange,
  onSubmit,
}: CreateApiKeyModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create API Key"
      footer={
        <>
          <CancelButton onClick={onClose} />
          <Button icon={Plus} onClick={onSubmit} disabled={!name.trim() || isPending}>Create</Button>
        </>
      }
    >
      <div className="form-grid">
        <Input label="Key name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Production API" />
        <Select
          label="Environment"
          value={environment}
          onChange={(e) => onEnvironmentChange(e.target.value as 'production' | 'sandbox')}
          options={[
            { value: 'sandbox', label: 'Sandbox' },
            { value: 'production', label: 'Production' },
          ]}
        />
      </div>
    </Modal>
  )
}
