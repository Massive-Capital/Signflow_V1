import { Save } from 'lucide-react'
import { getSaveEmbedTemplateDisabledReason } from '../../utils/embedTemplate'
import type { DocumentField, Recipient } from '../../types'

interface EmbedToolbarProps {
  activeAssignRole: 'buyer' | 'seller'
  fields: DocumentField[]
  recipients: Recipient[]
  canSaveTemplate: boolean
  isSaving?: boolean
  onSelectAssignRole: (role: 'buyer' | 'seller') => void
  onSaveTemplate: () => void
}

export function EmbedToolbar({
  activeAssignRole,
  fields,
  recipients,
  canSaveTemplate,
  isSaving = false,
  onSelectAssignRole,
  onSaveTemplate,
}: EmbedToolbarProps) {
  const saveDisabledReason = getSaveEmbedTemplateDisabledReason(fields, recipients)

  return (
    <div className="embed-builder-toolbar">
      <span className="embed-builder-toolbar-label">Place fields for</span>
      <div className="embed-builder-role-toggle" role="group" aria-label="Assign fields to">
        <button
          type="button"
          className={`embed-builder-role-btn embed-builder-role-btn--investor${
            activeAssignRole === 'buyer' ? ' is-active' : ''
          }`}
          onClick={() => onSelectAssignRole('buyer')}
        >
          Investor
        </button>
        <button
          type="button"
          className={`embed-builder-role-btn embed-builder-role-btn--sponsor${
            activeAssignRole === 'seller' ? ' is-active' : ''
          }`}
          onClick={() => onSelectAssignRole('seller')}
        >
          Sponsor
        </button>
      </div>
      <span className="embed-builder-toolbar-hint">Click the PDF to place fields</span>
      <button
        type="button"
        className="embed-builder-save-btn"
        disabled={!canSaveTemplate || isSaving}
        title={saveDisabledReason}
        onClick={onSaveTemplate}
      >
        <Save size={15} strokeWidth={2.25} aria-hidden />
        {isSaving ? 'Saving…' : 'Save template'}
      </button>
    </div>
  )
}
