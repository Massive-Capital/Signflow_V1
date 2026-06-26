import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  GitBranch,
  ListOrdered,
  Mail,
  Send,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../ui/Button'
import { CancelButton } from '../ui/CancelButton'
import { Input } from '../ui/Input'
import { RichTextEditor } from '../ui/RichTextEditor'
import { EmailAttachments } from './EmailAttachments'
import { SigningSequenceList } from './SigningSequenceList'
import { formatRecipientRole } from '../../constants/fieldTypes'
import { RecipientSigningStatusBadge } from '../common/RecipientSigningStatusBadge'
import { shouldShowRecipientSigningStatus, getRecipientSigningTimestamp } from '../../utils/recipientSigningStatus'
import { canSendForSignature, getSendDisabledReason } from '../../utils/documentSend'
import type { Document, EmailAttachment, WorkflowType } from '../../types'

interface SendWorkflowStepsProps {
  step: number
  document: Document
  documentId: string
  workflowType: WorkflowType
  signingOrder: string[]
  subject: string
  message: string
  attachments: EmailAttachment[]
  uploadingAttachments: boolean
  sending: boolean
  onWorkflowTypeChange: (type: WorkflowType) => void
  onSigningOrderChange: (order: string[]) => void
  onSubjectChange: (value: string) => void
  onMessageChange: (value: string) => void
  onAddAttachments: (files: FileList) => void
  onRemoveAttachment: (attachmentId: string) => void
  onSend: () => void
  onBack: () => void
  onContinue: () => void
}

const STEP_META: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: 'Recipients',
    description: 'Confirm who will receive this document for signature.',
    icon: Users,
  },
  {
    title: 'Workflow type',
    description: 'Choose whether recipients sign in parallel or one after another.',
    icon: GitBranch,
  },
  {
    title: 'Email message',
    description: 'Customize the subject and message sent with the signing invite.',
    icon: Mail,
  },
  {
    title: 'Review',
    description: 'Double-check the details before sending.',
    icon: CheckCircle2,
  },
  {
    title: 'Send',
    description: 'Deliver signing invitations to your recipients.',
    icon: Send,
  },
]

const WORKFLOW_OPTIONS: {
  value: WorkflowType
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'parallel',
    title: 'Parallel',
    description: 'All recipients receive signing emails immediately and can sign at the same time.',
    icon: Users,
  },
  {
    value: 'sequential',
    title: 'Sequential',
    description: 'Only the first recipient is emailed now; each next person is emailed after the previous one signs.',
    icon: ListOrdered,
  },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function SendWorkflowSteps({
  step,
  document,
  documentId,
  workflowType,
  signingOrder,
  subject,
  message,
  attachments,
  uploadingAttachments,
  sending,
  onWorkflowTypeChange,
  onSigningOrderChange,
  onSubjectChange,
  onMessageChange,
  onAddAttachments,
  onRemoveAttachment,
  onSend,
  onBack,
  onContinue,
}: SendWorkflowStepsProps) {
  const navigate = useNavigate()
  const meta = STEP_META[step]
  const StepIcon = meta.icon
  const canSend = canSendForSignature(document)
  const sendDisabledReason = getSendDisabledReason(document)
  const totalSteps = STEP_META.length
  const progressPercent = ((step + 1) / totalSteps) * 100
  const workflowLabel =
    workflowType === 'sequential'
      ? `Sequential — ${signingOrder
          .map((recipientId) => document.recipients.find((recipient) => recipient.id === recipientId)?.name)
          .filter(Boolean)
          .join(' → ')}`
      : 'Parallel — all sign at once'

  return (
    <div className="send-workflow-card card">
      <div
        className="send-workflow-progress"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${step + 1} of ${totalSteps}`}
      >
        <div className="send-workflow-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="send-workflow-card-header">
        <div className="send-workflow-card-icon" aria-hidden>
          <StepIcon size={22} strokeWidth={2} />
        </div>
        <div className="send-workflow-card-heading">
          <div className="send-workflow-card-title-row">
            <h2>{meta.title}</h2>
            <span className="send-workflow-step-badge">
              Step {step + 1} of {totalSteps}
            </span>
          </div>
          <p>{meta.description}</p>
        </div>
      </div>

      <div className="send-workflow-card-body">
        {step === 0 && (
          <>
            {document.recipients.length === 0 ? (
              <div className="send-workflow-empty">
                <div className="send-workflow-empty-icon" aria-hidden>
                  <Users size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="send-workflow-empty-title">No recipients yet</p>
                  <p className="send-workflow-empty-desc">
                    Add signers in the document builder before sending invitations.
                  </p>
                </div>
                <Link to={`/documents/${documentId}/builder`} className="filter-bar-action">
                  <Button size="sm" variant="secondary" className="btn-bordered-action" icon={UserPlus}>
                    Add recipients in builder
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="send-workflow-recipients">
                {document.recipients.map((recipient) => (
                  <div key={recipient.id} className="send-workflow-recipient">
                    <div
                      className="send-workflow-recipient-avatar"
                      style={{ backgroundColor: recipient.color }}
                      aria-hidden
                    >
                      {getInitials(recipient.name)}
                    </div>
                    <div className="send-workflow-recipient-main">
                      <div className="send-workflow-recipient-title-row">
                        <strong>{recipient.name}</strong>
                        {shouldShowRecipientSigningStatus(document.status, recipient.signingStatus) &&
                          recipient.signingStatus && (
                            <RecipientSigningStatusBadge
                              status={recipient.signingStatus}
                              timestamp={getRecipientSigningTimestamp(
                                recipient.signingStatus,
                                recipient,
                              )}
                            />
                          )}
                      </div>
                      <span>{recipient.email}</span>
                    </div>
                    <span className="role-tag send-workflow-role">{formatRecipientRole(recipient.role)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="send-workflow-options" role="radiogroup" aria-label="Signing order">
              {WORKFLOW_OPTIONS.map((option) => {
                const OptionIcon = option.icon
                const isSelected = workflowType === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`send-workflow-option ${isSelected ? 'active' : ''}`}
                    onClick={() => onWorkflowTypeChange(option.value)}
                    aria-pressed={isSelected}
                  >
                    <span className="send-workflow-option-icon" aria-hidden>
                      <OptionIcon size={20} strokeWidth={2} />
                    </span>
                    <span className="send-workflow-option-content">
                      <span className="send-workflow-option-title">{option.title}</span>
                      <span className="send-workflow-option-desc">{option.description}</span>
                    </span>
                    <span className="send-workflow-option-check" aria-hidden>
                      {isSelected && <Check size={16} strokeWidth={2.5} />}
                    </span>
                  </button>
                )
              })}
            </div>

            {workflowType === 'sequential' && document.recipients.length > 0 && (
              <SigningSequenceList
                recipients={document.recipients}
                signingOrder={signingOrder}
                onSigningOrderChange={onSigningOrderChange}
              />
            )}

            {workflowType === 'sequential' && document.recipients.length === 0 && (
              <p className="send-signing-sequence-empty">
                Add recipients in the document builder to set a signing sequence.
              </p>
            )}
          </>
        )}

        {step === 2 && (
          <div className="send-email-form">
            <div className="send-email-preview-hint">
              <Mail size={16} strokeWidth={2} aria-hidden />
              <span>Recipients will receive this message with a secure signing link.</span>
            </div>
            <div className="form-grid">
              <Input
                label="Email subject"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Please sign this document"
              />
              <RichTextEditor
                label="Email message"
                value={message}
                onChange={onMessageChange}
                placeholder="Add a personal note for your recipients..."
              />
              <EmailAttachments
                attachments={attachments}
                uploading={uploadingAttachments}
                onAdd={onAddAttachments}
                onRemove={onRemoveAttachment}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <dl className="send-review-grid">
            <div className="send-review-item">
              <dt>
                <FileText size={14} strokeWidth={2} aria-hidden />
                Document
              </dt>
              <dd>{document.title}</dd>
            </div>
            <div className="send-review-item send-review-item--stacked">
              <dt>
                <Users size={14} strokeWidth={2} aria-hidden />
                Recipients
              </dt>
              <dd>
                {document.recipients.length === 0 ? (
                  'None'
                ) : (
                  <ul className="send-review-recipients">
                    {document.recipients.map((recipient) => (
                      <li key={recipient.id}>
                        <span
                          className="send-review-recipient-dot"
                          style={{ backgroundColor: recipient.color }}
                          aria-hidden
                        />
                        <span className="send-review-recipient-name">{recipient.name}</span>
                        <span className="send-review-recipient-email">{recipient.email}</span>
                        {shouldShowRecipientSigningStatus(document.status, recipient.signingStatus) &&
                          recipient.signingStatus && (
                            <RecipientSigningStatusBadge
                              status={recipient.signingStatus}
                              timestamp={getRecipientSigningTimestamp(
                                recipient.signingStatus,
                                recipient,
                              )}
                            />
                          )}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div className="send-review-item send-review-item--stacked">
              <dt>
                <GitBranch size={14} strokeWidth={2} aria-hidden />
                Workflow
              </dt>
              <dd>{workflowLabel}</dd>
            </div>
            {workflowType === 'sequential' && document.recipients.length > 0 && (
              <div className="send-review-item send-review-item--stacked">
                <dt>
                  <ListOrdered size={14} strokeWidth={2} aria-hidden />
                  Signing sequence
                </dt>
                <dd>
                  <ol className="send-review-sequence">
                    {signingOrder.map((recipientId, index) => {
                      const recipient = document.recipients.find((item) => item.id === recipientId)
                      if (!recipient) return null
                      return (
                        <li key={recipientId}>
                          <span className="send-review-sequence-step">{index + 1}.</span>
                          <span>{recipient.name}</span>
                        </li>
                      )
                    })}
                  </ol>
                </dd>
              </div>
            )}
            <div className="send-review-item">
              <dt>Fields</dt>
              <dd>{document.fields.length} placed</dd>
            </div>
            <div className="send-review-item send-review-item--stacked">
              <dt>
                <Mail size={14} strokeWidth={2} aria-hidden />
                Subject
              </dt>
              <dd>{subject || '—'}</dd>
            </div>
            <div className="send-review-item send-review-item--stacked">
              <dt>
                <Mail size={14} strokeWidth={2} aria-hidden />
                Message preview
              </dt>
              <dd>
                <div
                  className="send-review-message-preview"
                  dangerouslySetInnerHTML={{ __html: message || '<p>—</p>' }}
                />
              </dd>
            </div>
            {attachments.length > 0 && (
              <div className="send-review-item send-review-item--stacked">
                <dt>Attachments</dt>
                <dd>
                  <ul className="send-review-attachments">
                    {attachments.map((attachment) => (
                      <li key={attachment.id}>{attachment.originalName}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        )}

        {step === 4 && (
          <div className="send-ready-panel">
            <div className="send-ready-icon-ring" aria-hidden>
              <div className="send-ready-icon">
                <Send size={26} strokeWidth={2} />
              </div>
            </div>
            <h3>Ready to send</h3>
            <p>
              {document.recipients.length} recipient{document.recipients.length === 1 ? '' : 's'} will
              receive an email with a secure signing link for <strong>{document.title}</strong>.
            </p>
            <Button
              size="lg"
              className="send-ready-btn"
              icon={Send}
              onClick={onSend}
              disabled={sending || !canSend}
              title={sendDisabledReason}
            >
              {sending ? 'Sending...' : 'Send now'}
            </Button>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="send-workflow-footer">
          <CancelButton
            className="send-workflow-footer-btn send-workflow-footer-btn--cancel"
            onClick={() => navigate(`/documents/${documentId}`)}
            disabled={sending}
          />
          <div className="send-workflow-footer-actions">
            {step > 0 && (
              <Button
                variant="secondary"
                className="send-workflow-footer-btn send-workflow-footer-btn--back btn-bordered-action"
                icon={ArrowLeft}
                onClick={onBack}
                disabled={sending}
              >
                Back
              </Button>
            )}
            <Button
              className="send-workflow-footer-btn send-workflow-footer-btn--continue"
              iconRight={ArrowRight}
              onClick={onContinue}
              disabled={sending || (step === 0 && document.recipients.length === 0) || (step === 1 && workflowType === 'sequential' && document.recipients.length === 0)}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="send-workflow-footer">
          <CancelButton
            className="send-workflow-footer-btn send-workflow-footer-btn--cancel"
            onClick={() => navigate(`/documents/${documentId}`)}
            disabled={sending}
          />
          <div className="send-workflow-footer-actions">
            <Button
              variant="secondary"
              className="send-workflow-footer-btn send-workflow-footer-btn--back btn-bordered-action"
              icon={ArrowLeft}
              onClick={onBack}
              disabled={sending}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
