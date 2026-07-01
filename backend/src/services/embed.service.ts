import { env } from '../config/env';
import { documentRepository } from '../repositories/document.repository';
import { signingRepository } from '../repositories/signing.repository';
import type { AuthContext, ProfileType } from '../types/domain';
import { AppError } from '../utils/app-error';
import { generateSecureToken, hashToken } from '../utils/crypto';
import {
  getBuyers,
  getSeller,
  isInvestorSponsorWorkflow,
} from '../utils/investor-sponsor-workflow';
import {
  canRecipientStartSigning,
  sponsorSignsFirstInWorkflow,
} from '../utils/signing-workflow';
import type { RecipientRow } from '../utils/mappers';

const SIGNING_TOKEN_TTL_DAYS = 30;

export type EmbedSigningSessionType = 'own' | 'countersign';

export interface CreateEmbedSigningSessionInput {
  recipientEmail?: string;
  recipientId?: string;
  /** Required when multiple investors need sponsor counter-signature. */
  investorRecipientId?: string;
  /** Pre-select investor profile (skips profile chooser in embed). */
  profileType?: string;
}

export interface EmbedSigningSessionResult {
  token: string;
  signUrl: string;
  sessionType: EmbedSigningSessionType;
  investorRecipientId?: string;
}

async function findInvestorsAwaitingSponsorCountersign(
  documentId: string,
  sellerId: string,
  buyers: RecipientRow[],
): Promise<RecipientRow[]> {
  const pending: RecipientRow[] = [];

  for (const buyer of buyers) {
    const buyerSigned = await signingRepository.hasCompletedOwnSigningSession(
      documentId,
      buyer.id,
    );
    if (!buyerSigned) continue;

    const countersigned = await signingRepository.hasCompletedSponsorSessionForInvestor(
      documentId,
      sellerId,
      buyer.id,
    );
    if (!countersigned) {
      pending.push(buyer);
    }
  }

  return pending;
}

export const embedService = {
  async createSigningSession(
    auth: AuthContext,
    documentId: string,
    input: CreateEmbedSigningSessionInput,
  ): Promise<EmbedSigningSessionResult> {
    const document = await documentRepository.findById(documentId);
    if (!document || document.organization_id !== auth.organizationId) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const status = String(document.status ?? '').toLowerCase();
    if (!['sent', 'pending'].includes(status)) {
      throw new AppError(
        'Document must be sent before creating a signing session',
        400,
        'VALIDATION_ERROR',
      );
    }

    const recipients = await documentRepository.findRecipients(documentId);
    const email = input.recipientEmail?.trim().toLowerCase();
    const recipientId = input.recipientId?.trim();

    const recipient =
      (recipientId ? recipients.find((r) => r.id === recipientId) : undefined) ??
      (email ? recipients.find((r) => r.email.trim().toLowerCase() === email) : undefined);

    if (!recipient) {
      throw new AppError('Recipient not found on this document', 404, 'NOT_FOUND');
    }

    const profileType = input.profileType?.trim() as ProfileType | undefined;
    if (
      profileType &&
      recipient.role === 'buyer' &&
      isInvestorSponsorWorkflow(recipients)
    ) {
      await documentRepository.updateRecipientProfileType(
        documentId,
        recipient.id,
        profileType,
      );
    }

    let investorRecipientId: string | undefined;
    let sessionType: EmbedSigningSessionType = 'own';

    if (isInvestorSponsorWorkflow(recipients) && recipient.role === 'seller') {
      const seller = getSeller(recipients);
      if (!seller) {
        throw new AppError('Sponsor not found on this document', 404, 'NOT_FOUND');
      }

      const buyers = getBuyers(recipients);
      const sponsorSignsFirst = sponsorSignsFirstInWorkflow(recipients);
      const sellerOwnSigned = await signingRepository.hasCompletedOwnSigningSession(
        documentId,
        seller.id,
      );
      const pendingCountersignBuyers = await findInvestorsAwaitingSponsorCountersign(
        documentId,
        seller.id,
        buyers,
      );

      if (pendingCountersignBuyers.length > 0) {
        const requestedInvestorId = input.investorRecipientId?.trim();
        const targetBuyer = requestedInvestorId
          ? pendingCountersignBuyers.find((buyer) => buyer.id === requestedInvestorId)
          : pendingCountersignBuyers[0];

        if (!targetBuyer) {
          throw new AppError(
            'That investor does not require sponsor counter-signature yet',
            400,
            'VALIDATION_ERROR',
          );
        }

        investorRecipientId = targetBuyer.id;
        sessionType = 'countersign';
      } else if (sponsorSignsFirst && !sellerOwnSigned) {
        sessionType = 'own';
      } else {
        const waitingOnInvestors = await Promise.all(
          buyers.map((buyer) =>
            signingRepository.hasCompletedOwnSigningSession(documentId, buyer.id),
          ),
        ).then((results) => results.some((signed) => !signed));

        if (sponsorSignsFirst && sellerOwnSigned && waitingOnInvestors) {
          throw new AppError(
            'Waiting for investors to sign. Sponsor counter-signature opens after each investor signs.',
            403,
            'WAITING_FOR_PRIOR_SIGNER',
          );
        }

        throw new AppError(
          'Sponsor has already completed all required signatures for this document',
          400,
          'ALREADY_SIGNED',
        );
      }
    }

    const signedRecipientIds = await signingRepository.getSignedRecipientIds(documentId);
    const access = canRecipientStartSigning(
      recipients,
      document.workflow_type,
      recipient.id,
      signedRecipientIds,
    );
    if (!access.allowed) {
      throw new AppError(access.message, 403, 'WAITING_FOR_PRIOR_SIGNER');
    }

    const token = generateSecureToken(24);
    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await signingRepository.create({
      tokenHash: hashToken(token),
      documentId,
      recipientId: recipient.id,
      investorRecipientId,
      expiresAt,
    });

    return {
      token,
      signUrl: `${env.frontendUrl.replace(/\/$/, '')}/embed/sign/${token}`,
      sessionType,
      ...(investorRecipientId ? { investorRecipientId } : {}),
    };
  },
};
