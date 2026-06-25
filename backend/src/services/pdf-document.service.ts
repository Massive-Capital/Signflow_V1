import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { documentRepository } from '../repositories/document.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { signingRepository } from '../repositories/signing.repository';
import type { DocumentRow, FieldRow } from '../utils/mappers';
import { AppError } from '../utils/app-error';
import { assertDocumentContentIntegrity } from '../utils/document-integrity';
import { appendDocumentAuditPage } from '../utils/pdf-audit-page';
import { stampDocumentIdOnAllPages } from '../utils/pdf-page-footer';
import { formatSigningTimestamp } from '../utils/signing-timestamp';
import { documentFileService } from './document-file.service';
import { filterFieldsForRecipientProfile } from '../utils/profile-field';
import type { ProfileType } from '../types/domain';

export { getOriginalPdfPath, getSignedPdfPath } from '../utils/document-paths';

interface ParsedFieldValue {
  kind: 'text' | 'image';
  text?: string;
  dataUrl?: string;
}

function parseFieldValue(value: string): ParsedFieldValue {
  if (value.startsWith('drawn:')) {
    return { kind: 'image', dataUrl: value.slice('drawn:'.length) };
  }

  if (value.startsWith('typed:')) {
    return { kind: 'text', text: value.slice('typed:'.length) };
  }

  if (value.startsWith('uploaded:')) {
    return { kind: 'text', text: value.slice('uploaded:'.length) };
  }

  return { kind: 'text', text: value };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

function fieldRect(field: FieldRow, pageWidth: number, pageHeight: number) {
  const width = (Number(field.width) / 100) * pageWidth;
  const height = (Number(field.height) / 100) * pageHeight;
  const x = (Number(field.x) / 100) * pageWidth;
  const y = pageHeight - ((Number(field.y) + Number(field.height)) / 100) * pageHeight;

  return { x, y, width, height };
}

function isSignatureFieldType(type: string): boolean {
  return type === 'signature' || type === 'initial';
}

const TIMESTAMP_FONT_SIZE = 7;
const TIMESTAMP_GAP = 4;
/** Minimum share of field width reserved for the signature (timestamp keeps fixed font size). */
const SIGNATURE_MIN_WIDTH_RATIO = 0.5;
const SIGNATURE_IMAGE_MAX_SCALE = 1;
const SIGNATURE_TEXT_MIN_FONT_SIZE = 8;
const SIGNATURE_TEXT_MAX_FONT_SIZE = 17;
/** Typed signature text scale — timestamp uses TIMESTAMP_FONT_SIZE above. */
const SIGNATURE_TEXT_HEIGHT_RATIO = 0.52;

function getSigningTimestampLayout(
  rect: { x: number; y: number; width: number; height: number },
  signedAt: Date,
  font: PDFFont,
) {
  const text = `Signed: ${formatSigningTimestamp(signedAt)}`;
  const fontSize = TIMESTAMP_FONT_SIZE;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const timestampWidth = textWidth + 1;
  const signatureWidth = Math.max(
    rect.width - timestampWidth - TIMESTAMP_GAP,
    rect.width * SIGNATURE_MIN_WIDTH_RATIO,
  );

  return {
    text,
    fontSize,
    signatureWidth,
    timestampX: rect.x + signatureWidth + TIMESTAMP_GAP,
    timestampY: rect.y + Math.max(0, (rect.height - fontSize) / 2),
  };
}

function drawSigningTimestamp(
  page: PDFPage,
  font: PDFFont,
  layout: ReturnType<typeof getSigningTimestampLayout>,
): void {
  page.drawText(layout.text, {
    x: layout.timestampX,
    y: layout.timestampY,
    size: layout.fontSize,
    font,
    color: rgb(0.35, 0.38, 0.42),
  });
}

async function drawFieldValue(
  pdfDoc: PDFDocument,
  field: FieldRow,
  parsed: ParsedFieldValue,
  signedAt?: Date,
): Promise<void> {
  const pageIndex = Math.max(0, field.page - 1);
  if (pageIndex >= pdfDoc.getPageCount()) return;

  const page = pdfDoc.getPage(pageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const rect = fieldRect(field, pageWidth, pageHeight);

  if (parsed.kind === 'image' && parsed.dataUrl) {
    const bytes = dataUrlToBytes(parsed.dataUrl);
    const image = parsed.dataUrl.includes('image/jpeg')
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);

    const showTimestamp = isSignatureFieldType(field.type) && signedAt;
    let timestampLayout: ReturnType<typeof getSigningTimestampLayout> | null = null;
    let timestampFont: PDFFont | null = null;
    if (showTimestamp && signedAt) {
      timestampFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      timestampLayout = getSigningTimestampLayout(rect, signedAt, timestampFont);
    }
    const signatureWidth = timestampLayout?.signatureWidth ?? rect.width;
    const scale = Math.min(
      signatureWidth / image.width,
      rect.height / image.height,
      SIGNATURE_IMAGE_MAX_SCALE,
    );
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;

    page.drawImage(image, {
      x: rect.x,
      y: rect.y + (rect.height - imageHeight) / 2,
      width: imageWidth,
      height: imageHeight,
    });

    if (timestampLayout && timestampFont) {
      drawSigningTimestamp(page, timestampFont, timestampLayout);
    }
    return;
  }

  const text = parsed.text?.trim();
  if (!text) return;

  if (field.type === 'checkbox') {
    if (text !== 'true') return;
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = Math.max(10, Math.min(rect.height * 0.7, 16));
    page.drawText('X', {
      x: rect.x + Math.max(0, (rect.width - fontSize) / 2),
      y: rect.y + Math.max(0, (rect.height - fontSize) / 2),
      size: fontSize,
      font,
      color: rgb(0.12, 0.16, 0.23),
    });
    return;
  }

  if (field.type === 'radio') {
    if (text !== 'selected') return;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = Math.max(7, Math.min(rect.height * 0.55, 11));
    page.drawText(`(x) ${field.label}`, {
      x: rect.x + 2,
      y: rect.y + Math.max(0, (rect.height - fontSize) / 2),
      size: fontSize,
      font,
      color: rgb(0.12, 0.16, 0.23),
      maxWidth: Math.max(rect.width - 4, 1),
    });
    return;
  }

  const useScriptFont = field.type === 'signature' || field.type === 'initial';
  const font = await pdfDoc.embedFont(
    useScriptFont ? StandardFonts.TimesRomanItalic : StandardFonts.Helvetica,
  );

  const showTimestamp = isSignatureFieldType(field.type) && signedAt;
  const timestampFont = showTimestamp
    ? await pdfDoc.embedFont(StandardFonts.Helvetica)
    : null;
  const timestampLayout =
    showTimestamp && timestampFont
      ? getSigningTimestampLayout(rect, signedAt, timestampFont)
      : null;
  const availableTextWidth = timestampLayout?.signatureWidth ?? rect.width;

  const fontSize = useScriptFont
    ? Math.max(
        SIGNATURE_TEXT_MIN_FONT_SIZE,
        Math.min(rect.height * SIGNATURE_TEXT_HEIGHT_RATIO, SIGNATURE_TEXT_MAX_FONT_SIZE),
      )
    : Math.max(9, Math.min(rect.height * 0.68, 22));
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const scale = textWidth > availableTextWidth ? availableTextWidth / textWidth : 1;
  const drawSize = fontSize * scale;

  page.drawText(text, {
    x: rect.x,
    y: rect.y + Math.max(0, (rect.height - drawSize) / 2),
    size: drawSize,
    font,
    color: rgb(0.12, 0.16, 0.23),
    maxWidth: availableTextWidth,
  });

  if (timestampLayout && timestampFont) {
    drawSigningTimestamp(page, timestampFont, timestampLayout);
  }
}

async function stampFieldsOnPdf(
  pdfDoc: PDFDocument,
  fields: FieldRow[],
  recipientSignedAt?: Map<string, Date>,
): Promise<void> {
  for (const field of fields) {
    if (!field.value) continue;
    const parsed = parseFieldValue(field.value);
    const signedAt = recipientSignedAt?.get(field.recipient_id);
    await drawFieldValue(pdfDoc, field, parsed, signedAt);
  }
}

async function buildRecipientSignedAtMap(documentId: string): Promise<Map<string, Date>> {
  const signingInfo = await signingRepository.getRecipientSigningInfo(documentId);
  const signedAtMap = new Map<string, Date>();

  for (const [recipientId, info] of signingInfo) {
    if (info.signedAt) {
      signedAtMap.set(recipientId, new Date(info.signedAt));
    }
  }

  return signedAtMap;
}

export class PdfDocumentService {
  private async loadDocumentPdf(documentId: string): Promise<{ pdfDoc: PDFDocument; documentTitle: string }> {
    const { buffer, row } = await documentFileService.readOriginalPdf(documentId);
    const pdfDoc = await PDFDocument.load(buffer);
    return { pdfDoc, documentTitle: row.title };
  }

  private async loadDocumentContext(documentId: string): Promise<{
    pdfDoc: PDFDocument;
    document: DocumentRow;
    fields: FieldRow[];
  }> {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const fields = await documentRepository.findFields(documentId);
    const recipients = await documentRepository.findRecipients(documentId);
    assertDocumentContentIntegrity(document, recipients, fields);

    const { pdfDoc } = await this.loadDocumentPdf(documentId);
    return { pdfDoc, document, fields };
  }

  private async appendAuditTrail(
    pdfDoc: PDFDocument,
    document: DocumentRow,
    recipientId?: string,
  ): Promise<void> {
    const allRecipients = await documentRepository.findRecipients(document.id);
    const recipients = recipientId
      ? allRecipients.filter((recipient) => recipient.id === recipientId)
      : allRecipients;

    if (recipientId && recipients.length === 0) {
      throw new AppError('Recipient not found', 404, 'NOT_FOUND');
    }

    const signingInfo = await signingRepository.getRecipientSigningInfo(document.id);
    const fields = await documentRepository.findFields(document.id);
    const organization = await organizationRepository.findById(document.organization_id);
    const sendEvent = await signingRepository.getDocumentSendEvent(document.id);
    const completedAt = recipientId
      ? signingInfo.get(recipientId)?.signedAt
      : await signingRepository.getDocumentCompletedAt(document.id);
    const generatedAt = completedAt
      ? new Date(completedAt)
      : document.updated_at;
    const senderName = document.sent_by_name ?? organization?.name ?? 'SignFlow';
    const senderEmail = document.sent_by_email ?? '—';
    const senderSentAt = document.sent_at ?? sendEvent?.sentAt;
    const senderSentIp = document.sent_ip ?? sendEvent?.sentIp;

    await appendDocumentAuditPage(pdfDoc, {
      document,
      recipients,
      signingInfo,
      generatedAt,
      organizationName: organization?.name,
      fields,
      sender: {
        name: senderName,
        email: senderEmail,
        organizationName: organization?.name,
        sentAt: senderSentAt ?? document.updated_at,
        sentIp: senderSentIp ?? undefined,
      },
    });
  }

  async generateSignedPdf(documentId: string): Promise<Buffer> {
    const { pdfDoc, document, fields } = await this.loadDocumentContext(documentId);
    const recipientSignedAt = await buildRecipientSignedAtMap(documentId);
    await stampFieldsOnPdf(pdfDoc, fields, recipientSignedAt);
    await this.appendAuditTrail(pdfDoc, document);
    await stampDocumentIdOnAllPages(pdfDoc, document.id);

    const output = Buffer.from(await pdfDoc.save());
    await documentFileService.persistSignedPdf(documentId, output);
    return output;
  }

  /** PDF for an in-progress signing session: original + fields from recipients who already signed. */
  async generateInProgressSigningPdf(
    documentId: string,
    signedRecipientIds: ReadonlySet<string>,
  ): Promise<Buffer> {
    const { pdfDoc, fields } = await this.loadDocumentContext(documentId);
    const recipients = await documentRepository.findRecipients(documentId);
    const recipientById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
    const recipientSignedAt = await buildRecipientSignedAtMap(documentId);
    const signedFields = fields.filter((field) => {
      if (!signedRecipientIds.has(field.recipient_id)) return false;
      const owner = recipientById.get(field.recipient_id);
      if (owner?.role === 'buyer' && owner.profile_type) {
        return filterFieldsForRecipientProfile(
          [field],
          field.recipient_id,
          owner.profile_type as ProfileType,
        ).length > 0;
      }
      return true;
    });
    await stampFieldsOnPdf(pdfDoc, signedFields, recipientSignedAt);
    return Buffer.from(await pdfDoc.save());
  }

  async generateRecipientSignedPdf(documentId: string, recipientId: string): Promise<Buffer> {
    const { pdfDoc, document, fields } = await this.loadDocumentContext(documentId);
    const recipients = await documentRepository.findRecipients(documentId);
    const recipient = recipients.find((item) => item.id === recipientId);
    if (!recipient) {
      throw new AppError('Recipient not found', 404, 'NOT_FOUND');
    }

    const recipientFields = filterFieldsForRecipientProfile(
      fields,
      recipientId,
      recipient.profile_type as ProfileType | null | undefined,
    );
    const recipientSignedAt = await buildRecipientSignedAtMap(documentId);
    await stampFieldsOnPdf(pdfDoc, recipientFields, recipientSignedAt);
    await this.appendAuditTrail(pdfDoc, document, recipientId);
    await stampDocumentIdOnAllPages(pdfDoc, document.id);

    return Buffer.from(await pdfDoc.save());
  }

  async getSignedPdfBuffer(documentId: string): Promise<Buffer> {
    return this.generateSignedPdf(documentId);
  }
}

export const pdfDocumentService = new PdfDocumentService();
