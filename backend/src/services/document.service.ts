import { access, unlink } from 'fs/promises';
import { join } from 'path';
import { documentRepository } from '../repositories/document.repository';
import { apiKeyRepository } from '../repositories/api-key.repository';
import { userRepository } from '../repositories/user.repository';
import { DOCUMENT_UPLOAD_DIR } from '../middleware/upload.middleware';
import { getOriginalPdfPath, getSignedPdfPath } from '../utils/document-paths';
import { pdfDocumentService } from './pdf-document.service';
import { documentFileService } from './document-file.service';
import { signingRepository } from '../repositories/signing.repository';
import type { AuthContext, Document, DocumentStatus, RecipientSigningStatus } from '../types/domain';
import { AppError } from '../utils/app-error';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { toDocument } from '../utils/mappers';
import type { DocumentRow, FieldRow, RecipientRow } from '../utils/mappers';
import { computeDocumentContentHash } from '../utils/document-content-hash';
import {
  computePdfPageFingerprints,
  pageHashForPageNumber,
} from '../utils/pdf-page-fingerprint';
import { webhookService } from './webhook.service';
import { emailService } from './email.service';
import { emailAttachmentService } from './email-attachment.service';
import {
  getBuyers,
  getSeller,
  isInvestorSponsorWorkflow,
} from '../utils/investor-sponsor-workflow';
import { applyResolvedRadioGroups } from '../utils/radio-field';
import {
  getSigningInviteesForSend,
  getNextSequentialInvitee,
  isSequentialWorkflow,
} from '../utils/signing-workflow';
import { isUuid } from '../utils/uuid';

const SIGNING_TOKEN_TTL_DAYS = 30;

interface UpdateDocumentInput {
  title?: string;
  status?: DocumentStatus;
  pages?: number;
  workflowType?: string;
  emailSubject?: string;
  emailMessage?: string;
  recipients?: Array<{
    id?: string;
    name: string;
    email: string;
    role: string;
    color: string;
    order?: number;
    profileType?: string;
  }>;
  fields?: Array<{
    id?: string;
    type: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    recipientId: string;
    required: boolean;
    value?: string;
    options?: string[];
    radioGroupId?: string;
    profileType?: string;
    profileTypes?: string[];
    pageHash?: string;
    templatePage?: number;
  }>;
}

export class DocumentService {
  private normalizeRadioGroupIds(
    fields: NonNullable<UpdateDocumentInput['fields']>,
  ): NonNullable<UpdateDocumentInput['fields']> {
    return applyResolvedRadioGroups(
      fields.map((field) => ({
        ...field,
        id: field.id ?? `f_${Date.now()}`,
      })),
    );
  }

  private remapFieldRecipientIds(
    fields: NonNullable<UpdateDocumentInput['fields']>,
    inputRecipients: NonNullable<UpdateDocumentInput['recipients']>,
    insertedRecipients: Awaited<ReturnType<typeof documentRepository.replaceRecipients>>,
  ): NonNullable<UpdateDocumentInput['fields']> {
    const recipientIdMap = new Map<string, string>();

    inputRecipients.forEach((recipient, index) => {
      const dbId = insertedRecipients[index]?.id;
      if (!dbId) return;
      if (recipient.id) recipientIdMap.set(recipient.id, dbId);
      recipientIdMap.set(recipient.email.toLowerCase().trim(), dbId);
    });

    const soleRecipientId = insertedRecipients.length === 1 ? insertedRecipients[0].id : undefined;

    return fields.map((field) => {
      let recipientId = recipientIdMap.get(field.recipientId);

      if (!recipientId && soleRecipientId && field.recipientId.startsWith('rec_')) {
        recipientId = soleRecipientId;
      }

      if (!recipientId || !isUuid(recipientId)) {
        throw new AppError(
          `Field "${field.label}" references an unknown recipient. Re-select the recipient and try again.`,
          400,
          'VALIDATION_ERROR',
        );
      }

      return { ...field, recipientId };
    });
  }

  private remapFieldRecipientIdsToExisting(
    fields: NonNullable<UpdateDocumentInput['fields']>,
    existingRecipients: Awaited<ReturnType<typeof documentRepository.findRecipients>>,
  ): NonNullable<UpdateDocumentInput['fields']> {
    const recipientIdMap = new Map<string, string>();

    existingRecipients.forEach((recipient) => {
      recipientIdMap.set(recipient.id, recipient.id);
      recipientIdMap.set(recipient.email.toLowerCase().trim(), recipient.id);
    });

    const soleRecipientId = existingRecipients.length === 1 ? existingRecipients[0].id : undefined;

    return fields.map((field) => {
      let recipientId = recipientIdMap.get(field.recipientId);

      if (!recipientId && soleRecipientId && field.recipientId.startsWith('rec_')) {
        recipientId = soleRecipientId;
      }

      if (!recipientId || !isUuid(recipientId)) {
        throw new AppError(
          `Field "${field.label}" references an unknown recipient. Re-select the recipient and try again.`,
          400,
          'VALIDATION_ERROR',
        );
      }

      return { ...field, recipientId };
    });
  }

  private async enrichFieldsWithPageHashes(
    documentId: string,
    fields: NonNullable<UpdateDocumentInput['fields']>,
  ): Promise<NonNullable<UpdateDocumentInput['fields']>> {
    if (!fields.length) return fields;

    let fingerprints: string[] = [];
    try {
      const { buffer } = await documentFileService.readOriginalPdf(documentId);
      fingerprints = await computePdfPageFingerprints(buffer);
    } catch {
      return fields.map((field) => ({
        ...field,
        templatePage: field.templatePage ?? field.page,
      }));
    }

    return fields.map((field) => {
      const templatePage = Math.max(1, Math.floor(field.templatePage ?? field.page));
      const page = Math.max(1, Math.floor(field.page));
      return {
        ...field,
        page,
        templatePage,
        pageHash:
          field.pageHash?.trim() ||
          pageHashForPageNumber(fingerprints, templatePage) ||
          pageHashForPageNumber(fingerprints, page),
      };
    });
  }

  private async resolveSentContentHash(
    row: DocumentRow,
    recipients: RecipientRow[],
    fields: FieldRow[],
  ): Promise<string | null> {
    if (!['sent', 'pending'].includes(row.status)) {
      return row.sent_content_hash;
    }

    const currentHash = computeDocumentContentHash({
      fileHash: row.file_hash,
      pages: row.pages,
      workflowType: row.workflow_type,
      emailSubject: row.email_subject,
      emailMessage: row.email_message,
      recipients,
      fields,
    });

    if (!row.sent_content_hash) {
      await documentRepository.update(row.id, { sentContentHash: currentHash });
      return currentHash;
    }

    return row.sent_content_hash;
  }

  private computeHasUnsentChanges(
    row: DocumentRow,
    recipients: RecipientRow[],
    fields: FieldRow[],
    sentContentHash: string | null,
  ): boolean {
    if (!['sent', 'pending'].includes(row.status) || !sentContentHash) {
      return false;
    }

    const currentHash = computeDocumentContentHash({
      fileHash: row.file_hash,
      pages: row.pages,
      workflowType: row.workflow_type,
      emailSubject: row.email_subject,
      emailMessage: row.email_message,
      recipients,
      fields,
    });

    return currentHash !== sentContentHash;
  }

  private async resolveInvestorSponsorSellerStatus(
    documentId: string,
    sellerId: string,
    buyers: Document['recipients'],
    signingInfo: Awaited<ReturnType<typeof signingRepository.getRecipientSigningInfo>>,
  ): Promise<{
    signingStatus: RecipientSigningStatus;
    signed: boolean;
    viewedAt?: string;
    signedAt?: string;
    sentAt?: string;
  }> {
    const info = signingInfo.get(sellerId);
    const sellerOwnSigned = await signingRepository.hasCompletedOwnSigningSession(
      documentId,
      sellerId,
    );

    const signedBuyerIds: string[] = [];
    for (const buyer of buyers) {
      const buyerSigned = await signingRepository.hasCompletedOwnSigningSession(
        documentId,
        buyer.id,
      );
      if (buyerSigned) {
        signedBuyerIds.push(buyer.id);
      }
    }

    if (signedBuyerIds.length === 0) {
      const signingStatus: RecipientSigningStatus = info?.status ?? 'pending';
      return {
        signingStatus,
        signed: signingStatus === 'signed',
        viewedAt: info?.viewedAt,
        signedAt: info?.signedAt,
        sentAt: info?.sentAt,
      };
    }

    for (const buyerId of signedBuyerIds) {
      const countersigned = await signingRepository.hasCompletedSponsorSessionForInvestor(
        documentId,
        sellerId,
        buyerId,
      );
      if (!countersigned) {
        if (sellerOwnSigned) {
          return {
            signingStatus: 'awaiting_countersign',
            signed: false,
            viewedAt: info?.viewedAt,
            signedAt: info?.signedAt,
            sentAt: info?.sentAt,
          };
        }

        const signingStatus: RecipientSigningStatus =
          info?.status === 'viewed' ? 'viewed' : info?.status === 'signed' ? 'sent' : (info?.status ?? 'sent');
        return {
          signingStatus,
          signed: false,
          viewedAt: info?.viewedAt,
          signedAt: info?.signedAt,
          sentAt: info?.sentAt,
        };
      }
    }

    return {
      signingStatus: 'signed',
      signed: true,
      viewedAt: info?.viewedAt,
      signedAt: info?.signedAt,
      sentAt: info?.sentAt,
    };
  }

  private async attachRecipientSigningStatuses(
    documentId: string,
    documentStatus: DocumentStatus,
    recipients: Document['recipients'],
  ): Promise<Document['recipients']> {
    if (!['sent', 'pending', 'completed', 'declined'].includes(documentStatus)) {
      return recipients;
    }

    const signingInfo = await signingRepository.getRecipientSigningInfo(documentId);
    const usesInvestorSponsor = isInvestorSponsorWorkflow(recipients);
    const seller = usesInvestorSponsor ? recipients.find((recipient) => recipient.role === 'seller') : undefined;
    const buyers = usesInvestorSponsor
      ? recipients.filter((recipient) => recipient.role === 'buyer')
      : [];

    let sellerStatus:
      | {
          signingStatus: RecipientSigningStatus;
          signed: boolean;
          viewedAt?: string;
          signedAt?: string;
          sentAt?: string;
        }
      | undefined;
    if (seller && buyers.length > 0) {
      sellerStatus = await this.resolveInvestorSponsorSellerStatus(
        documentId,
        seller.id,
        buyers,
        signingInfo,
      );
    }

    return recipients.map((recipient) => {
      if (usesInvestorSponsor && seller && recipient.id === seller.id && sellerStatus) {
        return {
          ...recipient,
          signingStatus: sellerStatus.signingStatus,
          signed: sellerStatus.signed,
          viewedAt: sellerStatus.viewedAt,
          signedAt: sellerStatus.signedAt,
          sentAt: sellerStatus.sentAt,
        };
      }

      const info = signingInfo.get(recipient.id);
      const signingStatus: RecipientSigningStatus = info?.status ?? 'pending';
      return {
        ...recipient,
        signingStatus,
        signed: signingStatus === 'signed',
        viewedAt: info?.viewedAt,
        signedAt: info?.signedAt,
        sentAt: info?.sentAt,
      };
    });
  }

  private async attachDocumentCompletedAt(
    documentId: string,
    documentStatus: DocumentStatus,
    document: Document,
  ): Promise<Document> {
    if (documentStatus !== 'completed') {
      return document;
    }

    const completedAt = await signingRepository.getDocumentCompletedAt(documentId);
    if (completedAt) {
      document.completedAt = completedAt;
    }

    return document;
  }

  private async getFullDocument(documentId: string): Promise<Document> {
    const row = await documentRepository.findById(documentId);
    if (!row) throw new AppError('Document not found', 404, 'NOT_FOUND');

    const recipients = await documentRepository.findRecipients(documentId);
    const fields = await documentRepository.findFields(documentId);
    const sentContentHash = await this.resolveSentContentHash(row, recipients, fields);
    const hasUnsentChanges = this.computeHasUnsentChanges(row, recipients, fields, sentContentHash);
    const document = toDocument(row, recipients, fields, { hasUnsentChanges });
    document.fields = applyResolvedRadioGroups(document.fields);

    document.recipients = await this.attachRecipientSigningStatuses(
      documentId,
      row.status as DocumentStatus,
      document.recipients,
    );

    return this.attachDocumentCompletedAt(documentId, row.status as DocumentStatus, document);
  }

  private assertOrgAccess(documentOrgId: string, auth: AuthContext): void {
    if (documentOrgId !== auth.organizationId) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }
  }

  async list(
    auth: AuthContext,
    filters?: { status?: DocumentStatus; search?: string },
  ): Promise<Document[]> {
    const rows = await documentRepository.listByOrganization(auth.organizationId, filters);
    const documents: Document[] = [];

    for (const row of rows) {
      const recipients = await documentRepository.findRecipients(row.id);
      const fields = await documentRepository.findFields(row.id);
      const sentContentHash = await this.resolveSentContentHash(row, recipients, fields);
      const hasUnsentChanges = this.computeHasUnsentChanges(row, recipients, fields, sentContentHash);
      const document = toDocument(row, recipients, fields, { hasUnsentChanges });
      document.recipients = await this.attachRecipientSigningStatuses(
        row.id,
        row.status as DocumentStatus,
        document.recipients,
      );
      documents.push(
        await this.attachDocumentCompletedAt(row.id, row.status as DocumentStatus, document),
      );
    }

    return documents;
  }

  async get(auth: AuthContext, id: string): Promise<Document> {
    const row = await documentRepository.findById(id);
    if (!row) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(row.organization_id, auth);
    return this.getFullDocument(id);
  }

  async create(auth: AuthContext, title: string, pages?: number): Promise<Document> {
    const row = await documentRepository.create({
      organizationId: auth.organizationId,
      title,
      pages,
    });
    return toDocument(row, [], []);
  }

  async createWithFile(
    auth: AuthContext,
    title: string,
    file: Express.Multer.File,
    pages?: number,
  ): Promise<Document> {
    const row = await documentRepository.create({
      organizationId: auth.organizationId,
      title,
      pages,
    });

    await documentFileService.persistOriginalPdf(row.id, file.buffer, file.originalname);

    return this.getFullDocument(row.id);
  }

  async uploadFile(auth: AuthContext, id: string, fileName: string): Promise<Document> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    const filePath = getOriginalPdfPath(id);
    try {
      await access(filePath);
    } catch {
      throw new AppError('Failed to save document file', 500, 'UPLOAD_FAILED');
    }

    await documentFileService.hashAndStoreUploadedPdf(id, fileName);

    return this.getFullDocument(id);
  }

  async getOriginalPdf(
    auth: AuthContext,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string; fileHash: string }> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    const { buffer, row } = await documentFileService.readOriginalPdf(id);
    const filename = row.file_name || `${row.title}.pdf`;
    const fileHash = row.file_hash ?? '';

    return { buffer, filename, fileHash };
  }

  private async resolveSenderDetails(
    auth: AuthContext,
  ): Promise<{ name: string; email: string }> {
    if (auth.authType === 'user' && auth.userId) {
      const user = await userRepository.findById(auth.userId);
      if (user) {
        return { name: user.name, email: user.email };
      }
    }

    if (auth.authType === 'api_key' && auth.apiKeyId) {
      const apiKey = await apiKeyRepository.findById(auth.apiKeyId);
      if (apiKey) {
        return { name: apiKey.name, email: 'API Integration' };
      }
    }

    return { name: 'SignFlow', email: '—' };
  }

  private async recordSenderDetails(
    documentId: string,
    auth: AuthContext,
    clientIp?: string,
  ): Promise<void> {
    const sender = await this.resolveSenderDetails(auth);
    await documentRepository.update(documentId, {
      sentAt: new Date(),
      sentIp: clientIp,
      sentByName: sender.name,
      sentByEmail: sender.email,
    });
  }

  async update(auth: AuthContext, id: string, input: UpdateDocumentInput, clientIp?: string): Promise<Document> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    const previousStatus = existing.status;
    await documentRepository.update(id, {
      title: input.title,
      status: input.status,
      pages: input.pages,
      workflowType: input.workflowType,
      emailSubject: input.emailSubject,
      emailMessage: input.emailMessage,
    });

    if (input.recipients) {
      const inserted = await documentRepository.replaceRecipients(id, input.recipients);

      if (input.fields) {
        const normalizedFields = this.normalizeRadioGroupIds(input.fields);
        const remappedFields = this.remapFieldRecipientIds(normalizedFields, input.recipients, inserted);
        const anchoredFields = await this.enrichFieldsWithPageHashes(id, remappedFields);
        await documentRepository.replaceFields(id, anchoredFields);
      } else {
        await documentRepository.replaceFields(id, []);
      }
    } else if (input.fields) {
      const existingRecipients = await documentRepository.findRecipients(id);
      const normalizedFields = this.normalizeRadioGroupIds(input.fields);
      const remappedFields = this.remapFieldRecipientIdsToExisting(normalizedFields, existingRecipients);
      const anchoredFields = await this.enrichFieldsWithPageHashes(id, remappedFields);
      await documentRepository.replaceFields(id, anchoredFields);
    }

    if (input.status === 'sent' && ['sent', 'pending'].includes(previousStatus)) {
      const recipients = await documentRepository.findRecipients(id);
      const fields = await documentRepository.findFields(id);
      const updatedRow = await documentRepository.findById(id);
      const sentContentHash = updatedRow?.sent_content_hash ?? null;
      const hasUnsentChanges = updatedRow
        ? this.computeHasUnsentChanges(updatedRow, recipients, fields, sentContentHash)
        : false;

      if (!hasUnsentChanges) {
        throw new AppError(
          'No document changes to send. Edit the document before sending again.',
          400,
          'NO_CHANGES',
        );
      }

      await this.resetSigningAndResend(id, clientIp);
      await webhookService.dispatch(auth.organizationId, 'document.sent', { documentId: id });
    } else if (input.status === 'sent' && !['sent', 'pending'].includes(previousStatus)) {
      await this.createSigningSessions(id, clientIp);
      await webhookService.dispatch(auth.organizationId, 'document.sent', { documentId: id });
    }

    if (input.status === 'sent') {
      await this.recordSenderDetails(id, auth, clientIp);

      const recipients = await documentRepository.findRecipients(id);
      const fields = await documentRepository.findFields(id);
      const updatedRow = await documentRepository.findById(id);
      if (updatedRow) {
        const sentContentHash = computeDocumentContentHash({
          fileHash: updatedRow.file_hash,
          pages: updatedRow.pages,
          workflowType: updatedRow.workflow_type,
          emailSubject: updatedRow.email_subject,
          emailMessage: updatedRow.email_message,
          recipients,
          fields,
        });
        await documentRepository.update(id, { sentContentHash });
      }
    }

    const contentWasPatched =
      input.recipients !== undefined ||
      input.fields !== undefined ||
      input.workflowType !== undefined ||
      input.pages !== undefined ||
      input.emailSubject !== undefined ||
      input.emailMessage !== undefined;

    if (contentWasPatched && input.status !== 'sent') {
      const finalRow = await documentRepository.findById(id);
      if (finalRow && ['sent', 'pending'].includes(finalRow.status)) {
        const latestRecipients = await documentRepository.findRecipients(id);
        const latestFields = await documentRepository.findFields(id);
        const sentContentHash = computeDocumentContentHash({
          fileHash: finalRow.file_hash,
          pages: finalRow.pages,
          workflowType: finalRow.workflow_type,
          emailSubject: finalRow.email_subject,
          emailMessage: finalRow.email_message,
          recipients: latestRecipients,
          fields: latestFields,
        });
        await documentRepository.update(id, { sentContentHash });
      }
    }

    return this.getFullDocument(id);
  }

  async addEmailAttachment(
    auth: AuthContext,
    id: string,
    file: Express.Multer.File,
  ) {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    return emailAttachmentService.add(id, file);
  }

  async removeEmailAttachment(
    auth: AuthContext,
    id: string,
    attachmentId: string,
  ): Promise<void> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    await emailAttachmentService.remove(id, attachmentId);
  }

  async downloadSigned(auth: AuthContext, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    if (!['sent', 'pending', 'completed'].includes(existing.status)) {
      throw new AppError('Document has not been sent yet', 400, 'NOT_SENT');
    }

    const allSigned = await signingRepository.isWorkflowComplete(id);
    if (!allSigned) {
      throw new AppError('Not all recipients have signed yet', 400, 'NOT_ALL_SIGNED');
    }

    const buffer = await pdfDocumentService.getSignedPdfBuffer(id);
    const filename = `${existing.title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document'}-signed.pdf`;

    return { buffer, filename };
  }

  async getRecipientSignedPdf(
    auth: AuthContext,
    documentId: string,
    recipientId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const existing = await documentRepository.findById(documentId);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    if (!['sent', 'pending', 'completed'].includes(existing.status)) {
      throw new AppError('Document has not been sent yet', 400, 'NOT_SENT');
    }

    const recipients = await documentRepository.findRecipients(documentId);
    const recipient = recipients.find((item) => item.id === recipientId);
    if (!recipient) {
      throw new AppError('Recipient not found', 404, 'NOT_FOUND');
    }

    const signedRecipientIds = await signingRepository.getSignedRecipientIds(documentId);
    if (!signedRecipientIds.has(recipientId)) {
      throw new AppError('Recipient has not signed yet', 400, 'RECIPIENT_NOT_SIGNED');
    }

    const buffer = await pdfDocumentService.generateRecipientSignedPdf(documentId, recipientId);
    const safeTitle = existing.title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document';
    const safeName = recipient.name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'recipient';
    const filename = `${safeTitle}-${safeName}-signed.pdf`;

    return { buffer, filename };
  }

  async delete(auth: AuthContext, id: string): Promise<void> {
    const existing = await documentRepository.findById(id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');
    this.assertOrgAccess(existing.organization_id, auth);

    await documentRepository.delete(id);

    try {
      await unlink(join(DOCUMENT_UPLOAD_DIR, `${id}.pdf`));
    } catch {
      // uploaded file may not exist
    }

    try {
      await unlink(getSignedPdfPath(id));
    } catch {
      // signed file may not exist
    }
  }

  private async resetSigningAndResend(documentId: string, clientIp?: string): Promise<void> {
    await signingRepository.deleteByDocumentId(documentId);
    await documentRepository.clearFieldValues(documentId);
    await documentRepository.update(documentId, { status: 'sent' });

    try {
      await unlink(getSignedPdfPath(documentId));
    } catch {
      // signed file may not exist
    }

    await documentRepository.clearSignedFileMetadata(documentId);

    await this.createSigningSessions(documentId, clientIp);
  }

  private async buildSigningInviteAttachments(documentId: string, documentTitle: string) {
    const { buffer: documentPdf, row: documentRow } = await documentFileService.readOriginalPdf(documentId);
    const documentAttachment = {
      filename: documentRow.file_name || `${documentTitle}.pdf`,
      content: documentPdf,
      contentType: 'application/pdf' as const,
    };
    const extraAttachments = await emailAttachmentService.getBuffers(documentId);
    return [documentAttachment, ...extraAttachments];
  }

  private async inviteRecipientToSign(
    documentId: string,
    documentTitle: string,
    emailSubject: string | null,
    messageHtml: string | null,
    recipient: { id: string; email: string },
    attachments: Awaited<ReturnType<typeof this.buildSigningInviteAttachments>>,
    expiresAt: Date,
    investorRecipientId?: string,
    sentIp?: string,
  ): Promise<void> {
    const token = generateSecureToken(24);
    await signingRepository.create({
      tokenHash: hashToken(token),
      documentId,
      recipientId: recipient.id,
      investorRecipientId,
      expiresAt,
      sentIp,
    });

    await emailService.sendSigningInvite({
      email: recipient.email,
      documentTitle,
      signingToken: token,
      subject: emailSubject?.trim() || `Please sign: ${documentTitle}`,
      messageHtml: messageHtml?.trim() || '',
      attachments,
    });
  }

  async inviteAllInvestorsAfterSponsorSign(
    documentId: string,
    clientIp?: string,
  ): Promise<void> {
    const document = await documentRepository.findById(documentId);
    if (!document || !isSequentialWorkflow(document.workflow_type)) return;

    const recipients = await documentRepository.findRecipients(documentId);
    if (!isInvestorSponsorWorkflow(recipients)) return;

    const buyers = getBuyers(recipients);
    if (buyers.length === 0) return;

    const signedRecipientIds = await signingRepository.getSignedRecipientIds(documentId);
    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const attachments = await this.buildSigningInviteAttachments(documentId, document.title);

    for (const buyer of buyers) {
      if (signedRecipientIds.has(buyer.id)) continue;
      const hasActiveSession = await signingRepository.hasActiveSessionForRecipient(
        documentId,
        buyer.id,
      );
      if (hasActiveSession) continue;

      await this.inviteRecipientToSign(
        documentId,
        document.title,
        document.email_subject,
        document.email_message,
        buyer,
        attachments,
        expiresAt,
        undefined,
        clientIp,
      );
    }
  }

  async inviteSponsorAfterInvestorSign(
    documentId: string,
    investorRecipientId: string,
    clientIp?: string,
  ): Promise<void> {
    const document = await documentRepository.findById(documentId);
    if (!document) return;

    const recipients = await documentRepository.findRecipients(documentId);
    if (!isInvestorSponsorWorkflow(recipients)) return;

    const seller = getSeller(recipients);
    const investor = recipients.find((recipient) => recipient.id === investorRecipientId);
    if (!seller || !investor || investor.role !== 'buyer') return;

    const alreadyCompleted = await signingRepository.hasCompletedSponsorSessionForInvestor(
      documentId,
      seller.id,
      investorRecipientId,
    );
    if (alreadyCompleted) return;

    const hasActiveSession = await signingRepository.hasActiveSponsorSessionForInvestor(
      documentId,
      seller.id,
      investorRecipientId,
    );
    if (hasActiveSession) return;

    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const investorPdf = await pdfDocumentService.generateRecipientSignedPdf(
      documentId,
      investorRecipientId,
    );
    const safeTitle = document.title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document';
    const safeInvestorName = investor.name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'investor';
    const attachments = [
      {
        filename: `${safeTitle}-${safeInvestorName}-investor-signed.pdf`,
        content: investorPdf,
        contentType: 'application/pdf' as const,
      },
    ];

    const token = generateSecureToken(24);
    await signingRepository.create({
      tokenHash: hashToken(token),
      documentId,
      recipientId: seller.id,
      investorRecipientId,
      expiresAt,
      sentIp: clientIp,
    });

    await emailService.sendSponsorCounterSign({
      email: seller.email,
      documentTitle: document.title,
      investorName: investor.name,
      signingToken: token,
      attachments,
    });
  }

  async inviteNextInWorkflow(documentId: string, clientIp?: string): Promise<void> {
    const document = await documentRepository.findById(documentId);
    if (!document || !isSequentialWorkflow(document.workflow_type)) return;

    const recipients = await documentRepository.findRecipients(documentId);
    const signedRecipientIds = await signingRepository.getSignedRecipientIds(documentId);
    const nextRecipient = getNextSequentialInvitee(recipients, signedRecipientIds);
    if (!nextRecipient) return;

    const alreadyInvited = await signingRepository.hasActiveSessionForRecipient(
      documentId,
      nextRecipient.id,
    );
    if (alreadyInvited) return;

    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const attachments = await this.buildSigningInviteAttachments(documentId, document.title);

    await this.inviteRecipientToSign(
      documentId,
      document.title,
      document.email_subject,
      document.email_message,
      nextRecipient,
      attachments,
      expiresAt,
      undefined,
      clientIp,
    );
  }

  private async createSigningSessions(documentId: string, clientIp?: string): Promise<void> {
    const document = await documentRepository.findById(documentId);
    if (!document) return;

    const recipients = await documentRepository.findRecipients(documentId);
    if (recipients.length === 0) {
      throw new AppError('Add at least one recipient before sending.', 400, 'VALIDATION_ERROR');
    }

    const invitees = getSigningInviteesForSend(recipients, document.workflow_type);
    if (invitees.length === 0) {
      throw new AppError('Add at least one investor before sending.', 400, 'VALIDATION_ERROR');
    }

    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const attachments = await this.buildSigningInviteAttachments(documentId, document.title);

    for (const recipient of invitees) {
      await this.inviteRecipientToSign(
        documentId,
        document.title,
        document.email_subject,
        document.email_message,
        recipient,
        attachments,
        expiresAt,
        undefined,
        clientIp,
      );
    }
  }
}

export const documentService = new DocumentService();
