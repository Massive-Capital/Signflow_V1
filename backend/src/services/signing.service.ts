import { documentRepository } from '../repositories/document.repository';
import { sdkConfigRepository } from '../repositories/sdk-config.repository';
import { signingRepository } from '../repositories/signing.repository';
import { billingRepository } from '../repositories/billing.repository';
import { documentService } from './document.service';
import { pdfDocumentService } from './pdf-document.service';
import { documentFileService } from './document-file.service';
import { AppError } from '../utils/app-error';
import { assertOrResyncDocumentContentIntegrity } from '../utils/document-integrity';
import { hashToken } from '../utils/crypto';
import { formatSigningDate } from '../utils/signing-timestamp';
import { toDocument } from '../utils/mappers';
import { webhookService } from './webhook.service';
import type { ProfileType } from '../types/domain';
import { applyResolvedRadioGroups } from '../utils/radio-field';
import { isInvestorSponsorWorkflow } from '../utils/investor-sponsor-workflow';
import { assertEmbedOriginAllowed } from '../utils/sdk-domain';

export interface SigningEmbedContext {
  isEmbed: boolean;
  parentOrigin?: string;
}

export class SigningService {
  private async assertEmbedAccessAllowed(
    documentId: string,
    embed?: SigningEmbedContext,
  ): Promise<void> {
    if (!embed?.isEmbed) return;

    const row = await documentRepository.findById(documentId);
    if (!row) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const config = await sdkConfigRepository.findByOrganization(row.organization_id);
    assertEmbedOriginAllowed(embed.parentOrigin, config?.allowed_domains ?? []);
  }

  async getSession(token: string, clientIp?: string, embed?: SigningEmbedContext) {
    const session = await signingRepository.findValidByTokenHash(hashToken(token));
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    await signingRepository.markViewed(hashToken(token), clientIp);

    const row = await documentRepository.findById(session.document_id);
    if (!row) throw new AppError('Document not found', 404, 'NOT_FOUND');

    if (!row.file_name) {
      throw new AppError('Document file has not been uploaded yet', 404, 'NOT_FOUND');
    }

    try {
      await documentFileService.readOriginalPdf(session.document_id);
    } catch {
      throw new AppError('Document file not found. Please contact the sender.', 404, 'NOT_FOUND');
    }

    const recipients = await documentRepository.findRecipients(session.document_id);
    const fields = await documentRepository.findFields(session.document_id);
    await assertOrResyncDocumentContentIntegrity(row, recipients, fields);

    const baseDocument = toDocument(row, recipients, fields);
    const signingInfo = await signingRepository.getRecipientSigningInfo(session.document_id);
    const document = {
      ...baseDocument,
      fields: applyResolvedRadioGroups(baseDocument.fields),
      recipients: baseDocument.recipients.map((recipient) => {
        const info = signingInfo.get(recipient.id);
        const signingStatus = info?.status ?? 'pending';
        return {
          ...recipient,
          signingStatus,
          signed: signingStatus === 'signed',
          sentAt: info?.sentAt,
          viewedAt: info?.viewedAt,
          signedAt: info?.signedAt,
        };
      }),
    };

    const orgId = row.organization_id;
    await webhookService.dispatch(orgId, 'document.viewed', {
      documentId: session.document_id,
      recipientId: session.recipient_id,
    });

    return {
      document: {
        ...document,
        fileUrl: `/api/v1/signing/sessions/${token}/file`,
      },
      recipientId: session.recipient_id,
      investorRecipientId: session.investor_recipient_id ?? undefined,
      token,
    };
  }

  async getSessionDocumentPdf(
    token: string,
    embed?: SigningEmbedContext,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const tokenHash = hashToken(token);
    const session = await signingRepository.findValidByTokenHash(tokenHash);
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    const { row } = await documentFileService.readOriginalPdf(session.document_id);
    const filename = row.file_name || `${row.title}.pdf`;

    const recipients = await documentRepository.findRecipients(session.document_id);
    const fields = await documentRepository.findFields(session.document_id);
    await assertOrResyncDocumentContentIntegrity(row, recipients, fields);

    if (session.investor_recipient_id) {
      const buffer = await pdfDocumentService.generateRecipientSignedPdf(
        session.document_id,
        session.investor_recipient_id,
      );
      return { buffer, filename };
    }

    const signedRecipientIds = await signingRepository.getSignedRecipientIds(session.document_id);
    if (signedRecipientIds.size > 0) {
      const buffer = await pdfDocumentService.generateInProgressSigningPdf(
        session.document_id,
        signedRecipientIds,
      );
      return { buffer, filename };
    }

    const { buffer } = await documentFileService.readOriginalPdf(session.document_id);
    return { buffer, filename };
  }

  private async isDocumentComplete(documentId: string): Promise<boolean> {
    return signingRepository.isWorkflowComplete(documentId);
  }

  async complete(
    token: string,
    fieldValues?: Record<string, string>,
    clientIp?: string,
    embed?: SigningEmbedContext,
  ) {
    const tokenHash = hashToken(token);
    const session = await signingRepository.findValidByTokenHash(tokenHash);
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    if (fieldValues && Object.keys(fieldValues).length > 0) {
      await documentRepository.updateFieldValues(session.document_id, fieldValues);
    }

    const completedSession = await signingRepository.markCompleted(tokenHash, clientIp);
    const signedAt = completedSession?.completed_at ?? new Date();
    await documentRepository.autofillEmptyDateFields(
      session.document_id,
      session.recipient_id,
      formatSigningDate(signedAt),
    );

    const documentRow = await documentRepository.findById(session.document_id);
    const isSequential = documentRow?.workflow_type === 'sequential';
    const recipients = await documentRepository.findRecipients(session.document_id);
    const currentRecipient = recipients.find((recipient) => recipient.id === session.recipient_id);
    const usesInvestorSponsor = isInvestorSponsorWorkflow(recipients);

    if (
      isSequential &&
      usesInvestorSponsor &&
      currentRecipient?.role === 'seller' &&
      !session.investor_recipient_id
    ) {
      await documentService.inviteAllInvestorsAfterSponsorSign(
        session.document_id,
        clientIp,
      );
    } else if (isSequential && usesInvestorSponsor && currentRecipient?.role === 'buyer') {
      await documentService.inviteSponsorAfterInvestorSign(
        session.document_id,
        session.recipient_id,
        clientIp,
      );
    } else if (isSequential) {
      await documentService.inviteNextInWorkflow(session.document_id, clientIp);
    }

    const allSigned = await this.isDocumentComplete(session.document_id);
    await documentRepository.update(session.document_id, {
      status: allSigned ? 'completed' : 'pending',
    });

    try {
      await pdfDocumentService.generateSignedPdf(session.document_id);
    } catch (error) {
      console.error('Failed to generate signed PDF:', error);
    }

    await billingRepository.incrementUsage(
      (await documentRepository.findById(session.document_id))!.organization_id,
      'documents_signed',
    );

    const row = await documentRepository.findById(session.document_id);
    if (row && allSigned) {
      await webhookService.dispatch(row.organization_id, 'document.completed', {
        documentId: session.document_id,
        recipientId: session.recipient_id,
      });
    }

    return { success: true, timestamp: signedAt.toISOString() };
  }

  async downloadCompletedDocument(token: string, embed?: SigningEmbedContext) {
    const tokenHash = hashToken(token);
    const session = await signingRepository.findByTokenHash(tokenHash);
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    if (!session.completed_at) {
      throw new AppError('Document has not been signed yet', 400, 'NOT_SIGNED');
    }

    const row = await documentRepository.findById(session.document_id);
    if (!row) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const pdfBuffer = await pdfDocumentService.generateRecipientSignedPdf(
      session.document_id,
      session.recipient_id,
    );

    const recipients = await documentRepository.findRecipients(session.document_id);
    const recipient = recipients.find((item) => item.id === session.recipient_id);
    const safeTitle = row.title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document';
    const safeName = recipient?.name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'recipient';

    return {
      buffer: pdfBuffer,
      filename: `${safeTitle}-${safeName}-signed.pdf`,
    };
  }

  async setRecipientProfile(token: string, profileType: ProfileType, embed?: SigningEmbedContext) {
    const tokenHash = hashToken(token);
    const session = await signingRepository.findValidByTokenHash(tokenHash);
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    const recipients = await documentRepository.findRecipients(session.document_id);
    const recipient = recipients.find((item) => item.id === session.recipient_id);
    if (!recipient) {
      throw new AppError('Recipient not found', 404, 'NOT_FOUND');
    }

    if (recipient.role !== 'buyer') {
      throw new AppError('Profile selection is only available for investors', 400, 'INVALID_RECIPIENT');
    }

    if (!isInvestorSponsorWorkflow(recipients)) {
      throw new AppError('Profile selection is not available for this document', 400, 'INVALID_WORKFLOW');
    }

    await documentRepository.updateRecipientProfileType(
      session.document_id,
      session.recipient_id,
      profileType,
    );

    return { success: true, profileType };
  }

  async decline(token: string, embed?: SigningEmbedContext) {
    const tokenHash = hashToken(token);
    const session = await signingRepository.findValidByTokenHash(tokenHash);
    if (!session) {
      throw new AppError('Invalid signing link', 404, 'INVALID_TOKEN');
    }

    await this.assertEmbedAccessAllowed(session.document_id, embed);

    await signingRepository.markDeclined(tokenHash);
    await documentRepository.update(session.document_id, { status: 'declined' });

    const row = await documentRepository.findById(session.document_id);
    if (row) {
      await webhookService.dispatch(row.organization_id, 'document.declined', {
        documentId: session.document_id,
        recipientId: session.recipient_id,
      });
    }

    return { success: true, timestamp: new Date().toISOString() };
  }
}

export const signingService = new SigningService();
