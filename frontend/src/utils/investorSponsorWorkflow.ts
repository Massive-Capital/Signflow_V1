import type { Recipient } from '../types'

/** True when the document uses investor (buyer) + sponsor (seller) roles. */
export function isInvestorSponsorWorkflow(
  recipients: Pick<Recipient, 'role'>[],
): boolean {
  const hasBuyer = recipients.some((recipient) => recipient.role === 'buyer')
  const hasSeller = recipients.some((recipient) => recipient.role === 'seller')
  return hasBuyer && hasSeller
}
