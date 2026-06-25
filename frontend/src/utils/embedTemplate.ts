import type { DocumentField, Recipient } from '../types'
import { isInvestorSponsorWorkflow } from './investorSponsorWorkflow'

/** True when at least one field is assigned to an investor and one to a sponsor. */
export function canSaveEmbedTemplate(fields: DocumentField[], recipients: Recipient[]): boolean {
  if (!isInvestorSponsorWorkflow(recipients)) {
    return fields.length > 0
  }

  const buyerIds = new Set(
    recipients.filter((recipient) => recipient.role === 'buyer').map((recipient) => recipient.id),
  )
  const sellerIds = new Set(
    recipients.filter((recipient) => recipient.role === 'seller').map((recipient) => recipient.id),
  )

  if (buyerIds.size === 0 || sellerIds.size === 0) {
    return false
  }

  let hasInvestorField = false
  let hasSponsorField = false

  for (const field of fields) {
    if (buyerIds.has(field.recipientId)) hasInvestorField = true
    if (sellerIds.has(field.recipientId)) hasSponsorField = true
    if (hasInvestorField && hasSponsorField) return true
  }

  return false
}

export function getSaveEmbedTemplateDisabledReason(
  fields: DocumentField[],
  recipients: Recipient[],
): string | undefined {
  if (canSaveEmbedTemplate(fields, recipients)) return undefined

  if (!isInvestorSponsorWorkflow(recipients)) {
    return 'Place at least one field on the document'
  }

  return 'Place at least one field for both Investor and Sponsor'
}
