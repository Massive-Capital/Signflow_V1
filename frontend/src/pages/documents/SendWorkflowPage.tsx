import { Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { PageTitle } from '../../components/common/PageTitle'
import { WizardSteps } from '../../components/common/WizardSteps'
import { LoadingState } from '../../components/common/LoadingState'
import { SendWorkflowSteps } from '../../components/documents/SendWorkflowSteps'
import { SEND_WORKFLOW_STEPS } from '../../constants/fieldTypes'
import { useDocument } from '../../hooks/useDocuments'
import { useSendWorkflow } from '../../hooks/useSendWorkflow'
import { canSendForSignature } from '../../utils/documentSend'
import './send-document.css'

export function SendWorkflowPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: document, isLoading } = useDocument(id)
  const workflow = useSendWorkflow(id, document)

  if (isLoading || !document) {
    return (
      <>
        <PageTitle title="Send Document" />
        <LoadingState />
      </>
    )
  }

  if (!canSendForSignature(document)) {
    return <Navigate to={`/documents/${id}`} replace />
  }

  return (
    <div className="send-document-page">
      <PageHeader
        back={`/documents/${id}`}
        title="Send Document"
        description={document.title}
      />
      <div className="send-document-layout">
        <WizardSteps
          steps={SEND_WORKFLOW_STEPS}
          currentStep={workflow.step}
          className="send-wizard-steps"
        />
        <SendWorkflowSteps
          step={workflow.step}
          document={document}
          documentId={id}
          workflowType={workflow.workflowType}
          signingOrder={workflow.signingOrder}
          subject={workflow.subject}
          message={workflow.message}
          attachments={workflow.attachments}
          uploadingAttachments={workflow.uploadingAttachments}
          sending={workflow.sending}
          onWorkflowTypeChange={workflow.setWorkflowType}
          onSigningOrderChange={workflow.setSigningOrder}
          onSubjectChange={workflow.setSubject}
          onMessageChange={workflow.setMessage}
          onAddAttachments={workflow.addAttachments}
          onRemoveAttachment={workflow.removeAttachment}
          onSend={workflow.sendDocument}
          onBack={workflow.prevStep}
          onContinue={workflow.nextStep}
        />
      </div>
    </div>
  )
}
