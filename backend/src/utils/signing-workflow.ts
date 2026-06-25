import type { RecipientRow } from './mappers';
import {
  getBuyers,
  getSeller,
  isInvestorSponsorWorkflow,
} from './investor-sponsor-workflow';

export function isSequentialWorkflow(workflowType: string | null | undefined): boolean {
  return workflowType === 'sequential';
}

/** Recipients in signing order (matches send-workflow sequence / order_index). */
export function getOrderedRecipients(recipients: RecipientRow[]): RecipientRow[] {
  return [...recipients].sort((a, b) => {
    const orderA = a.order_index ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order_index ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

/** True when the sponsor/seller phase precedes the investor/buyer phase. */
export function sponsorSignsFirstInWorkflow(recipients: RecipientRow[]): boolean {
  const sponsor = getSeller(recipients);
  const buyers = getBuyers(recipients);
  if (!sponsor || buyers.length === 0) return false;
  const sponsorOrder = sponsor.order_index ?? Number.MAX_SAFE_INTEGER;
  const minBuyerOrder = Math.min(
    ...buyers.map((buyer) => buyer.order_index ?? Number.MAX_SAFE_INTEGER),
  );
  return sponsorOrder < minBuyerOrder;
}

/**
 * Who receives signing invites when the document is first sent (or re-sent).
 * Parallel: all signers at once.
 * Sequential investor+sponsor: all investors OR sponsor only (by phase).
 * Other sequential: first signer in order only.
 */
export function getSigningInviteesForSend(
  recipients: RecipientRow[],
  workflowType: string | null | undefined,
): RecipientRow[] {
  const ordered = getOrderedRecipients(recipients);

  if (isSequentialWorkflow(workflowType)) {
    if (isInvestorSponsorWorkflow(recipients)) {
      if (sponsorSignsFirstInWorkflow(recipients)) {
        const seller = getSeller(recipients);
        return seller ? [seller] : [];
      }
      return getBuyers(ordered);
    }
    return ordered.length > 0 ? [ordered[0]] : [];
  }

  return ordered;
}

/**
 * Next recipient to invite after someone completes signing in generic sequential mode.
 */
export function getNextSequentialInvitee(
  recipients: RecipientRow[],
  signedRecipientIds: ReadonlySet<string>,
): RecipientRow | undefined {
  const ordered = getOrderedRecipients(recipients);
  return ordered.find((recipient) => !signedRecipientIds.has(recipient.id));
}

/**
 * Sequential investor+sponsor: role phases — investors may sign in any order within
 * their phase; sponsor signs only after at least one investor (investor-first), or
 * all investors wait until sponsor completes (sponsor-first).
 */
export function canRecipientStartSigning(
  recipients: RecipientRow[],
  workflowType: string | null | undefined,
  recipientId: string,
  signedRecipientIds: ReadonlySet<string>,
): { allowed: true } | { allowed: false; message: string } {
  if (!isSequentialWorkflow(workflowType)) {
    return { allowed: true };
  }

  const recipient = recipients.find((item) => item.id === recipientId);
  if (!recipient) {
    return { allowed: true };
  }

  if (isInvestorSponsorWorkflow(recipients)) {
    const sponsorSignsFirst = sponsorSignsFirstInWorkflow(recipients);
    const buyers = getBuyers(recipients);
    const seller = getSeller(recipients);
    const anyBuyerSigned = buyers.some((buyer) => signedRecipientIds.has(buyer.id));
    const sellerSigned = seller ? signedRecipientIds.has(seller.id) : false;

    if (recipient.role === 'buyer' && sponsorSignsFirst && !sellerSigned) {
      return {
        allowed: false,
        message:
          'The lead sponsor must sign first. You will be able to sign after they complete their signature.',
      };
    }

    if (recipient.role === 'seller' && !sponsorSignsFirst && !anyBuyerSigned) {
      return {
        allowed: false,
        message:
          'At least one investor must sign first. Sponsor signing will open after an investor completes their signature.',
      };
    }

    return { allowed: true };
  }

  const nextUnsigned = getNextSequentialInvitee(recipients, signedRecipientIds);
  if (!nextUnsigned || nextUnsigned.id === recipientId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message:
      'It is not your turn to sign yet. Please wait for the prior signer to complete their signature.',
  };
}
