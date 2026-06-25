import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Document, EmailAttachment, WorkflowType } from '../types'
import { canSendForSignature } from '../utils/documentSend'
import { buildInitialSigningOrder, orderRecipientsBySigningOrder } from '../utils/signingOrder'

const DEFAULT_MESSAGE_HTML = [
  '<p>Hi,</p>',
  '<p>Please review and sign the attached document at your earliest convenience.</p>',
  '<p>Thank you!</p>',
].join('')

export function useSendWorkflow(documentId: string, document?: Document) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [workflowType, setWorkflowType] = useState<WorkflowType>(
    document?.workflowType ?? 'parallel',
  )
  const [signingOrder, setSigningOrder] = useState<string[]>([])
  const [subject, setSubject] = useState(document?.emailSubject ?? 'Please sign this document')
  const [message, setMessage] = useState(document?.emailMessage ?? DEFAULT_MESSAGE_HTML)
  const [attachments, setAttachments] = useState<EmailAttachment[]>(document?.emailAttachments ?? [])
  const [sending, setSending] = useState(false)
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  useEffect(() => {
    if (!document) return
    setWorkflowType(document.workflowType ?? 'parallel')
    setSigningOrder(buildInitialSigningOrder(document.recipients))
    setSubject(document.emailSubject ?? 'Please sign this document')
    setMessage(document.emailMessage ?? DEFAULT_MESSAGE_HTML)
    setAttachments(document.emailAttachments ?? [])
  }, [document])

  useEffect(() => {
    if (!document) return
    setSigningOrder((current) => {
      const validIds = new Set(document.recipients.map((recipient) => recipient.id))
      const filtered = current.filter((id) => validIds.has(id))
      const missing = document.recipients
        .map((recipient) => recipient.id)
        .filter((id) => !filtered.includes(id))

      if (filtered.length === 0) {
        return buildInitialSigningOrder(document.recipients)
      }

      return [...filtered, ...missing]
    })
  }, [document?.recipients])

  const nextStep = () => setStep((current) => current + 1)
  const prevStep = () => setStep((current) => current - 1)

  const addAttachments = useCallback(
    async (files: FileList) => {
      setAttachmentError(null)
      setUploadingAttachments(true)

      try {
        const uploaded: EmailAttachment[] = []
        for (const file of Array.from(files)) {
          const attachment = await api.documents.uploadEmailAttachment(documentId, file)
          uploaded.push(attachment)
        }
        setAttachments((current) => [...current, ...uploaded])
      } catch (error) {
        setAttachmentError(
          error instanceof Error ? error.message : 'Failed to upload attachment.',
        )
      } finally {
        setUploadingAttachments(false)
      }
    },
    [documentId],
  )

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      setAttachmentError(null)
      setUploadingAttachments(true)

      try {
        await api.documents.deleteEmailAttachment(documentId, attachmentId)
        setAttachments((current) => current.filter((item) => item.id !== attachmentId))
      } catch (error) {
        setAttachmentError(
          error instanceof Error ? error.message : 'Failed to remove attachment.',
        )
      } finally {
        setUploadingAttachments(false)
      }
    },
    [documentId],
  )

  const sendDocument = async () => {
    if (!document || !canSendForSignature(document)) return

    setSending(true)
    try {
      const recipients =
        workflowType === 'sequential'
          ? orderRecipientsBySigningOrder(document.recipients, signingOrder)
          : document.recipients.map((recipient, index) => ({ ...recipient, order: index + 1 }))

      const updatedDocument = await api.documents.update(documentId, {
        status: 'sent',
        workflowType,
        emailSubject: subject.trim(),
        emailMessage: message,
        recipients,
        fields: document.fields,
      })
      queryClient.setQueryData(['document', documentId], updatedDocument)
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate('/documents')
    } finally {
      setSending(false)
    }
  }

  return {
    step,
    workflowType,
    setWorkflowType,
    signingOrder,
    setSigningOrder,
    subject,
    setSubject,
    message,
    setMessage,
    attachments,
    uploadingAttachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    sending,
    nextStep,
    prevStep,
    sendDocument,
  }
}
