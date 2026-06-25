import { Link, useNavigate } from 'react-router-dom'
import { Hammer, Save, Send } from 'lucide-react'
import { PageBackButton } from '../common/PageBackButton'
import { Button } from '../ui/Button'
import { canSendForSignature, getSendDisabledReason } from '../../utils/documentSend'
import type { Document } from '../../types'

interface BuilderHeaderProps {
  title: string
  documentId: string
  document: Document
}

export function BuilderHeader({ title, documentId, document }: BuilderHeaderProps) {
  const navigate = useNavigate()
  const sendEnabled = canSendForSignature(document)
  const sendDisabledReason = getSendDisabledReason(document)

  return (
    <div className="builder-header page-header" data-section="documents">
      <div className="page-header-back">
        <PageBackButton to={`/documents/${documentId}`} />
      </div>
      <div className="builder-header-body">
        <div className="page-header-content">
          <div className="page-header-main">
            <span className="page-header-icon" aria-hidden>
              <Hammer size={20} strokeWidth={2} />
            </span>
            <div className="page-header-text">
              <h1>
                <span className="page-header-title">{title}</span>
              </h1>
              <p>Document Builder — click on the PDF to place fields</p>
            </div>
          </div>
        </div>
        <div className="actions-row">
          <Link to={`/documents/${documentId}`}>
            <Button variant="secondary" className="btn-bordered-action" icon={Save}>
              Save & Exit
            </Button>
          </Link>
          <Button
            icon={Send}
            disabled={!sendEnabled}
            title={sendDisabledReason}
            onClick={() => navigate(`/documents/${documentId}/send`)}
          >
            Send for Signature
          </Button>
        </div>
      </div>
    </div>
  )
}
