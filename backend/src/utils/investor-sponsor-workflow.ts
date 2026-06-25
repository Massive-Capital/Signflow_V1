import type { RecipientRow } from './mappers';

export function isInvestorSponsorWorkflow(recipients: Pick<RecipientRow, 'role'>[]): boolean {
  const buyers = recipients.filter((recipient) => recipient.role === 'buyer');
  const sellers = recipients.filter((recipient) => recipient.role === 'seller');
  return buyers.length > 0 && sellers.length > 0;
}

export function getBuyers(recipients: RecipientRow[]): RecipientRow[] {
  return recipients.filter((recipient) => recipient.role === 'buyer');
}

export function getSeller(recipients: RecipientRow[]): RecipientRow | undefined {
  return recipients.find((recipient) => recipient.role === 'seller');
}
