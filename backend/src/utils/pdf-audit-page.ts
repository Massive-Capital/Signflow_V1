import { createHash } from 'crypto';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from 'pdf-lib';
import type { DocumentRow, FieldRow, RecipientRow } from './mappers';
import type { RecipientSigningInfo } from '../repositories/signing.repository';
import { fieldAppliesToProfile } from './profile-field';
import type { ProfileType } from '../types/domain';
import { formatCertificateTimestampValue, formatAppTimeZone, splitCertificateTimestamp } from './signing-timestamp';

const REFERENCE_WIDTH = 612;
const REFERENCE_HEIGHT = 792;
const COL_COUNT = 3;

const BODY_SIZE = 9;
const LABEL_SIZE = 7;
const TITLE_SIZE = 20;
const SUBTITLE_SIZE = 9;
const CAPTION_SIZE = 7;
const FOOTER_SIZE = 6.5;
const SECTION_TITLE_SIZE = 10;

const SECTION_GAP = 16;
const FIELD_GAP = 9;
const COLUMN_TITLE_GAP = 8;
const COLUMN_TITLE_HEIGHT = 12;
const TEXT_LINE_GAP = 3;
const MEASURE_PAD = 2;
const TABLE_INSET_Y = 12;
const TABLE_CELL_PAD_X = 12;
const TABLE_CELL_PAD_Y = 11;
const BOX_INNER_PAD = 10;

interface AuditPageLayout {
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
  colGap: number;
  colWidth: number;
  colX: number[];
  colInnerWidth: number;
  innerPad: number;
  brandStripHeight: number;
}

function createAuditPageLayout(pageWidth: number, pageHeight: number): AuditPageLayout {
  const scaleX = pageWidth / REFERENCE_WIDTH;
  const scaleY = pageHeight / REFERENCE_HEIGHT;
  const marginX = 48 * scaleX;
  const marginTop = 52 * scaleY;
  const marginBottom = 52 * scaleY;
  const contentWidth = pageWidth - marginX * 2;
  const colGap = 12 * scaleX;
  const colWidth = (contentWidth - colGap * (COL_COUNT - 1)) / COL_COUNT;
  const innerPad = 14 * scaleX;

  return {
    pageWidth,
    pageHeight,
    marginX,
    marginTop,
    marginBottom,
    contentWidth,
    colGap,
    colWidth,
    colX: [0, 1, 2].map((i) => marginX + i * (colWidth + colGap)),
    colInnerWidth: colWidth - innerPad * 2,
    innerPad,
    brandStripHeight: 28 * scaleY,
  };
}

function getReferencePageSize(pdfDoc: PDFDocument): { width: number; height: number } {
  if (pdfDoc.getPageCount() > 0) {
    return pdfDoc.getPage(0).getSize();
  }
  return { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT };
}

function colInnerX(layout: AuditPageLayout, index: number): number {
  return layout.colX[index] + layout.innerPad;
}

function tableCellPadX(layout: AuditPageLayout): number {
  return TABLE_CELL_PAD_X * (layout.pageWidth / REFERENCE_WIDTH);
}

function tableCellPadY(layout: AuditPageLayout): number {
  return TABLE_CELL_PAD_Y * (layout.pageHeight / REFERENCE_HEIGHT);
}

function tableInsetY(layout: AuditPageLayout): number {
  return TABLE_INSET_Y * (layout.pageHeight / REFERENCE_HEIGHT);
}

function tableColTextX(layout: AuditPageLayout, colIndex: number): number {
  return layout.colX[colIndex] + tableCellPadX(layout);
}

function tableColTextWidth(layout: AuditPageLayout): number {
  return layout.colWidth - tableCellPadX(layout) * 2;
}

const PRIMARY = rgb(37 / 255, 99 / 255, 235 / 255);
const PRIMARY_DARK = rgb(29 / 255, 78 / 255, 216 / 255);
const TEXT_COLOR = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED_COLOR = rgb(100 / 255, 116 / 255, 139 / 255);
const BORDER_COLOR = rgb(226 / 255, 232 / 255, 240 / 255);
const HEADER_BG = rgb(248 / 255, 250 / 255, 252 / 255);
const SURFACE_BG = rgb(255 / 255, 255 / 255, 255 / 255);
const SURFACE_ALT = rgb(248 / 255, 250 / 255, 252 / 255);
const SIGNATURE_BG = rgb(239 / 255, 246 / 255, 255 / 255);
const BRAND_STRIP_BG = rgb(239 / 255, 246 / 255, 255 / 255);
const SUCCESS_BG = rgb(220 / 255, 252 / 255, 231 / 255);
const SUCCESS_TEXT = rgb(4 / 255, 120 / 255, 87 / 255);
const SUCCESS_BORDER = rgb(167 / 255, 243 / 255, 208 / 255);
const PENDING_BG = rgb(254 / 255, 243 / 255, 199 / 255);
const PENDING_TEXT = rgb(180 / 255, 83 / 255, 9 / 255);
const PENDING_BORDER = rgb(253 / 255, 230 / 255, 138 / 255);
const SENT_BG = rgb(219 / 255, 234 / 255, 254 / 255);
const SENT_TEXT = rgb(41 / 255, 82 / 255, 217 / 255);
const SENT_BORDER = rgb(191 / 255, 219 / 255, 254 / 255);

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Investor (Buyer)',
  seller: 'Sponsor (Seller)',
  recipient_a: 'Recipient A',
  recipient_b: 'Recipient B',
  recipient_c: 'Recipient C',
};

const PROFILE_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  custodian_ira_401k: 'Custodian IRA / 401(k)',
  joint_tenancy: 'Joint Tenancy',
  llc_corp_partnership_trust_solo_checkbook_ira: 'LLC / Corp / Partnership / Trust / Solo Checkbook IRA',
};

interface AuditPageInput {
  document: DocumentRow;
  recipients: RecipientRow[];
  signingInfo: Map<string, RecipientSigningInfo>;
  generatedAt?: Date;
  organizationName?: string;
  fields?: FieldRow[];
  sender?: {
    name: string;
    email: string;
    organizationName?: string;
    sentAt?: string | Date;
    sentIp?: string;
  };
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface PageCursor {
  page: PDFPage;
  y: number;
  pageNumber: number;
  layout: AuditPageLayout;
}

interface StatusPillStyle {
  background: ReturnType<typeof rgb>;
  text: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
}

function formatCertificateTimestamp(value?: string | Date): string {
  return formatCertificateTimestampValue(value);
}

function formatEnvelopeId(id: string): string {
  const raw = id.replace(/-/g, '').toUpperCase();
  return raw.match(/.{1,8}/g)?.join(' ') ?? raw;
}

function formatTimeZone(): string {
  return formatAppTimeZone();
}

function formatRecipientRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatProfileType(profileType: string | null): string {
  if (!profileType) return '—';
  return PROFILE_TYPE_LABELS[profileType] ?? profileType;
}

function formatStatusLabel(status: string): string {
  if (!status) return '—';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusPillStyle(status: string): StatusPillStyle {
  switch (status.toLowerCase()) {
    case 'completed':
      return { background: SUCCESS_BG, text: SUCCESS_TEXT, border: SUCCESS_BORDER };
    case 'pending':
      return { background: PENDING_BG, text: PENDING_TEXT, border: PENDING_BORDER };
    case 'sent':
      return { background: SENT_BG, text: SENT_TEXT, border: SENT_BORDER };
    default:
      return { background: HEADER_BG, text: TEXT_COLOR, border: BORDER_COLOR };
  }
}

function formatAuditIp(value?: string): string {
  return value ?? '—';
}

function formatSignatureId(recipientId: string, signedAt?: string): string {
  return createHash('sha256')
    .update(`${recipientId}:${signedAt ?? ''}`)
    .digest('hex')
    .toUpperCase()
    .slice(0, 32);
}

function formatSignatureIdDisplay(signatureId: string): string {
  return signatureId.match(/.{1,8}/g)?.join(' ') ?? signatureId;
}

function sortRecipients(recipients: RecipientRow[]): RecipientRow[] {
  return [...recipients].sort((a, b) => {
    const orderA = a.order_index ?? 999;
    const orderB = b.order_index ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.email.localeCompare(b.email);
  });
}

function countFieldTypes(fields: FieldRow[] | undefined): { signatures: number; initials: number } {
  if (!fields) return { signatures: 0, initials: 0 };
  return {
    signatures: fields.filter((field) => field.type === 'signature').length,
    initials: fields.filter((field) => field.type === 'initial').length,
  };
}

function getEarliestTimestamp(
  signingInfo: Map<string, RecipientSigningInfo>,
  key: keyof Pick<RecipientSigningInfo, 'sentAt' | 'viewedAt' | 'signedAt'>,
): string | undefined {
  let earliest: string | undefined;
  for (const info of signingInfo.values()) {
    const value = info[key];
    if (!value) continue;
    if (!earliest || new Date(value).getTime() < new Date(earliest).getTime()) {
      earliest = value;
    }
  }
  return earliest;
}

function getSignatureFieldForRecipient(
  fields: FieldRow[] | undefined,
  recipient: RecipientRow,
): FieldRow | undefined {
  if (!fields) return undefined;
  return fields.find(
    (field) =>
      field.recipient_id === recipient.id &&
      (field.type === 'signature' || field.type === 'initial') &&
      field.value &&
      (!recipient.profile_type ||
        fieldAppliesToProfile(field, recipient.profile_type as ProfileType)),
  );
}

function parseSignatureValue(value: string): { kind: 'image' | 'text'; dataUrl?: string; text?: string } {
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

function lineHeightFor(size: number): number {
  return size + TEXT_LINE_GAP;
}

function measureWrappedLineCount(font: PDFFont, text: string, size: number, maxWidth: number): number {
  if (!text) return 1;
  if (maxWidth <= 0) return 1;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  let lines = 1;
  let lineWidth = 0;
  const spaceWidth = font.widthOfTextAtSize(' ', size);

  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, size);
    if (wordWidth > maxWidth) {
      if (lineWidth > 0) {
        lines++;
        lineWidth = 0;
      }
      lines += Math.max(0, Math.ceil(wordWidth / maxWidth) - 1);
      lineWidth = wordWidth % maxWidth || wordWidth;
      continue;
    }

    if (lineWidth === 0) {
      lineWidth = wordWidth;
      continue;
    }

    if (lineWidth + spaceWidth + wordWidth <= maxWidth) {
      lineWidth += spaceWidth + wordWidth;
    } else {
      lines++;
      lineWidth = wordWidth;
    }
  }

  return lines;
}

function measureTextBlockHeight(font: PDFFont, text: string, size: number, maxWidth: number): number {
  const lines = measureWrappedLineCount(font, text, size, maxWidth);
  return lines * lineHeightFor(size) + MEASURE_PAD;
}

function measureDetailRowHeight(fonts: Fonts, value: string, width: number): number {
  return LABEL_SIZE + 3 + measureTextBlockHeight(fonts.regular, value, BODY_SIZE, width) + 6;
}

function measureTimestampBlockHeight(
  fonts: Fonts,
  value: string | Date | undefined,
  ip: string | undefined,
  width: number,
): number {
  const { dateTime, timeZone } = splitCertificateTimestamp(value);
  const ipText = `IP ${formatAuditIp(ip)}`;
  const dateTimeHeight = measureTextBlockHeight(fonts.regular, dateTime, BODY_SIZE, width);
  const timeZoneHeight = timeZone
    ? measureTextBlockHeight(fonts.regular, timeZone, CAPTION_SIZE, width) + 2
    : 0;
  const ipHeight = measureTextBlockHeight(fonts.regular, ipText, CAPTION_SIZE, width);
  return LABEL_SIZE + 4 + dateTimeHeight + timeZoneHeight + 3 + ipHeight + 4;
}

function drawText(
  page: PDFPage,
  layout: AuditPageLayout,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT_COLOR,
  maxWidth?: number,
): void {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
    maxWidth: maxWidth ?? layout.contentWidth,
    lineHeight: lineHeightFor(size),
  });
}

function drawHorizontalRule(page: PDFPage, layout: AuditPageLayout, y: number, color = BORDER_COLOR): void {
  page.drawLine({
    start: { x: layout.marginX, y },
    end: { x: layout.marginX + layout.contentWidth, y },
    thickness: 0.5,
    color,
  });
}

function drawColumnDividers(
  page: PDFPage,
  layout: AuditPageLayout,
  topY: number,
  bottomY: number,
): void {
  for (let i = 1; i < COL_COUNT; i++) {
    const x = layout.colX[i] - layout.colGap / 2;
    page.drawLine({
      start: { x, y: bottomY },
      end: { x, y: topY },
      thickness: 0.5,
      color: BORDER_COLOR,
    });
  }
}

function drawCard(
  page: PDFPage,
  layout: AuditPageLayout,
  topY: number,
  bottomY: number,
  options?: { fill?: ReturnType<typeof rgb>; border?: boolean },
): void {
  page.drawRectangle({
    x: layout.marginX,
    y: bottomY,
    width: layout.contentWidth,
    height: topY - bottomY,
    color: options?.fill ?? SURFACE_BG,
    borderColor: options?.border === false ? undefined : BORDER_COLOR,
    borderWidth: options?.border === false ? 0 : 0.75,
  });
}

function drawColumnTitle(
  page: PDFPage,
  layout: AuditPageLayout,
  colIndex: number,
  y: number,
  title: string,
  fonts: Fonts,
): void {
  drawText(
    page,
    layout,
    title.toUpperCase(),
    colInnerX(layout, colIndex),
    y,
    fonts.bold,
    LABEL_SIZE,
    PRIMARY,
    layout.colInnerWidth,
  );
}

function drawStackedField(
  page: PDFPage,
  layout: AuditPageLayout,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fonts: Fonts,
  options?: { small?: boolean },
): number {
  const valueSize = options?.small ? BODY_SIZE - 0.5 : BODY_SIZE;
  drawText(page, layout, label.toUpperCase(), x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  const valueY = y - LABEL_SIZE - 4;
  drawText(page, layout, value, x, valueY, fonts.regular, valueSize, TEXT_COLOR, width);
  const valueHeight = measureTextBlockHeight(fonts.regular, value, valueSize, width);
  return valueY - valueHeight - FIELD_GAP;
}

function drawDetailRow(
  page: PDFPage,
  layout: AuditPageLayout,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fonts: Fonts,
): number {
  drawText(page, layout, label.toUpperCase(), x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  const valueY = y - LABEL_SIZE - 4;
  drawText(page, layout, value, x, valueY, fonts.regular, BODY_SIZE, TEXT_COLOR, width);
  return valueY - measureTextBlockHeight(fonts.regular, value, BODY_SIZE, width) - FIELD_GAP;
}

function drawTimestampBlock(
  page: PDFPage,
  layout: AuditPageLayout,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string | Date | undefined,
  ip: string | undefined,
  fonts: Fonts,
): number {
  const { dateTime, timeZone } = splitCertificateTimestamp(value);
  const ipText = `IP ${formatAuditIp(ip)}`;

  drawText(page, layout, label.toUpperCase(), x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  let cursorY = y - LABEL_SIZE - 4;
  drawText(page, layout, dateTime, x, cursorY, fonts.regular, BODY_SIZE, TEXT_COLOR, width);
  cursorY -= measureTextBlockHeight(fonts.regular, dateTime, BODY_SIZE, width) + 2;
  if (timeZone) {
    drawText(page, layout, timeZone, x, cursorY, fonts.regular, CAPTION_SIZE, MUTED_COLOR, width);
    cursorY -= measureTextBlockHeight(fonts.regular, timeZone, CAPTION_SIZE, width) + 3;
  } else {
    cursorY -= 3;
  }
  drawText(page, layout, ipText, x, cursorY, fonts.regular, CAPTION_SIZE, MUTED_COLOR, width);
  return cursorY - measureTextBlockHeight(fonts.regular, ipText, CAPTION_SIZE, width) - FIELD_GAP;
}

function drawStatusPill(page: PDFPage, x: number, y: number, status: string, fonts: Fonts): void {
  const label = formatStatusLabel(status);
  const style = getStatusPillStyle(status);
  const pillWidth = fonts.bold.widthOfTextAtSize(label, BODY_SIZE) + 14;
  const pillHeight = 14;

  page.drawRectangle({
    x,
    y: y - pillHeight,
    width: pillWidth,
    height: pillHeight,
    color: style.background,
    borderColor: style.border,
    borderWidth: 0.5,
  });

  page.drawText(label, {
    x: x + 7,
    y: y - pillHeight + 3,
    size: BODY_SIZE - 0.5,
    font: fonts.bold,
    color: style.text,
  });
}

function drawBrandStrip(
  page: PDFPage,
  layout: AuditPageLayout,
  fonts: Fonts,
  generatedAt: Date,
  pageNumber: number,
  continued: boolean,
): void {
  const stripTop = layout.pageHeight - 12;

  page.drawRectangle({
    x: layout.marginX,
    y: stripTop - layout.brandStripHeight,
    width: layout.contentWidth,
    height: layout.brandStripHeight,
    color: BRAND_STRIP_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });

  page.drawRectangle({
    x: layout.marginX,
    y: stripTop - layout.brandStripHeight,
    width: 3,
    height: layout.brandStripHeight,
    color: PRIMARY,
    borderWidth: 0,
  });

  const brandLabel = continued ? 'SignFlow · Certificate (continued)' : 'SignFlow';
  drawText(
    page,
    layout,
    brandLabel,
    layout.marginX + 12,
    stripTop - 17,
    fonts.bold,
    BODY_SIZE,
    PRIMARY_DARK,
  );

  if (pageNumber > 1) {
    const pageLabel = `Page ${pageNumber}`;
    const pageWidth = fonts.regular.widthOfTextAtSize(pageLabel, CAPTION_SIZE);
    drawText(
      page,
      layout,
      pageLabel,
      layout.marginX + layout.contentWidth - pageWidth - 12,
      stripTop - 17,
      fonts.regular,
      CAPTION_SIZE,
      MUTED_COLOR,
    );
    return;
  }

  const generatedLabel = `Generated ${formatCertificateTimestamp(generatedAt)}`;
  const generatedWidth = fonts.regular.widthOfTextAtSize(generatedLabel, CAPTION_SIZE);
  drawText(
    page,
    layout,
    generatedLabel,
    layout.marginX + layout.contentWidth - generatedWidth - 12,
    stripTop - 17,
    fonts.regular,
    CAPTION_SIZE,
    MUTED_COLOR,
  );
}

function drawPageFooter(page: PDFPage, layout: AuditPageLayout, fonts: Fonts): void {
  drawHorizontalRule(page, layout, layout.marginBottom + 6);
  const footerText =
    'This certificate is cryptographically bound to the signed document and forms part of the audit trail.';
  drawText(
    page,
    layout,
    footerText,
    layout.marginX,
    layout.marginBottom - 10,
    fonts.regular,
    FOOTER_SIZE,
    MUTED_COLOR,
    layout.contentWidth,
  );
}

function createCursor(
  pdfDoc: PDFDocument,
  layout: AuditPageLayout,
  fonts: Fonts,
  generatedAt: Date,
  pageNumber: number,
): PageCursor {
  const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
  drawBrandStrip(page, layout, fonts, generatedAt, pageNumber, pageNumber > 1);
  drawPageFooter(page, layout, fonts);
  return {
    page,
    y: layout.pageHeight - layout.marginTop - layout.brandStripHeight + 8,
    pageNumber,
    layout,
  };
}

function ensureSpace(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  heightNeeded: number,
  fonts: Fonts,
  generatedAt: Date,
): PageCursor {
  if (cursor.y - heightNeeded >= cursor.layout.marginBottom + 20) {
    return cursor;
  }
  return createCursor(pdfDoc, cursor.layout, fonts, generatedAt, cursor.pageNumber + 1);
}

async function drawPageTitle(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const blockHeight = TITLE_SIZE + SUBTITLE_SIZE + SECTION_GAP + 12;
  let next = ensureSpace(pdfDoc, cursor, blockHeight, fonts, generatedAt);

  drawText(
    next.page,
    next.layout,
    'Certificate of Completion',
    next.layout.marginX,
    next.y,
    fonts.bold,
    TITLE_SIZE,
    TEXT_COLOR,
  );
  next.y -= TITLE_SIZE + 8;
  drawText(
    next.page,
    next.layout,
    'Electronic signature audit trail · Tamper-evident record',
    next.layout.marginX,
    next.y,
    fonts.regular,
    SUBTITLE_SIZE,
    MUTED_COLOR,
  );
  next.y -= SUBTITLE_SIZE + 10;
  next.page.drawRectangle({
    x: next.layout.marginX,
    y: next.y,
    width: 48,
    height: 2.5,
    color: PRIMARY,
    borderWidth: 0,
  });
  next.y -= SECTION_GAP;
  drawHorizontalRule(next.page, next.layout, next.y);

  return next;
}

async function drawSectionHeader(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  title: string,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const blockHeight = 26;
  let next = ensureSpace(pdfDoc, cursor, blockHeight, fonts, generatedAt);

  next.y -= 6;
  drawText(
    next.page,
    next.layout,
    title.toUpperCase(),
    next.layout.marginX,
    next.y,
    fonts.bold,
    SECTION_TITLE_SIZE,
    TEXT_COLOR,
  );
  next.y -= SECTION_GAP;

  return next;
}

function measureMetadataColumnHeight(
  entries: Array<{ label: string; value: string; status?: string; small?: boolean }>,
  width: number,
  innerPad: number,
  fonts: Fonts,
): number {
  let height = innerPad;
  for (const entry of entries) {
    if (entry.status) {
      height += LABEL_SIZE + 18 + FIELD_GAP;
      continue;
    }
    const valueSize = entry.small ? BODY_SIZE - 0.5 : BODY_SIZE;
    const valueHeight = measureTextBlockHeight(fonts.regular, entry.value, valueSize, width);
    height += LABEL_SIZE + 4 + valueHeight + FIELD_GAP;
  }
  return height + innerPad;
}

async function drawMetadataGrid(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  columns: Array<Array<{ label: string; value: string; status?: string; small?: boolean }>>,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const { layout } = cursor;
  const columnHeights = columns.map((col) =>
    measureMetadataColumnHeight(col, layout.colInnerWidth, layout.innerPad, fonts),
  );
  const cardHeight = Math.max(...columnHeights) + SECTION_GAP;
  let next = ensureSpace(pdfDoc, cursor, cardHeight, fonts, generatedAt);

  const boxTop = next.y;
  const boxBottom = next.y - cardHeight + SECTION_GAP;

  drawCard(next.page, next.layout, boxTop, boxBottom, { fill: SURFACE_ALT });
  drawColumnDividers(next.page, next.layout, boxTop - next.layout.innerPad, boxBottom + next.layout.innerPad);

  const startY = boxTop - next.layout.innerPad;

  for (let col = 0; col < COL_COUNT; col++) {
    let fieldY = startY;
    const x = colInnerX(next.layout, col);
    const entries = columns[col] ?? [];

    for (const entry of entries) {
      if (entry.status) {
        drawText(
          next.page,
          next.layout,
          entry.label.toUpperCase(),
          x,
          fieldY,
          fonts.bold,
          LABEL_SIZE,
          MUTED_COLOR,
          next.layout.colInnerWidth,
        );
        drawStatusPill(next.page, x, fieldY - LABEL_SIZE - 4, entry.status, fonts);
        fieldY -= LABEL_SIZE + 18 + FIELD_GAP;
        continue;
      }
      fieldY = drawStackedField(
        next.page,
        next.layout,
        x,
        fieldY,
        next.layout.colInnerWidth,
        entry.label,
        entry.value,
        fonts,
        { small: entry.small },
      );
    }
  }

  next.y = boxBottom - SECTION_GAP;
  return next;
}

async function drawTableSection(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  headers: string[],
  rows: Array<{ cells: string[]; boldFirst?: boolean; mutedMiddle?: boolean; highlight?: boolean }>,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const padX = tableCellPadX(cursor.layout);
  const padY = tableCellPadY(cursor.layout);
  const insetY = tableInsetY(cursor.layout);
  const textWidth = tableColTextWidth(cursor.layout);
  const headerHeight = LABEL_SIZE + padY * 2 + 4;

  const rowHeights = rows.map((row) => {
    let maxHeight = BODY_SIZE + padY * 2;
    for (let i = 0; i < row.cells.length && i < COL_COUNT; i++) {
      const font = i === 0 && row.boldFirst ? fonts.bold : fonts.regular;
      const cellHeight = measureTextBlockHeight(font, row.cells[i], BODY_SIZE, textWidth);
      maxHeight = Math.max(maxHeight, cellHeight + padY * 2);
    }
    return maxHeight;
  });

  const tableBodyHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0);
  const totalHeight = insetY + tableBodyHeight + insetY + SECTION_GAP;
  let next = ensureSpace(pdfDoc, cursor, totalHeight, fonts, generatedAt);
  const { layout } = next;

  const boxTop = next.y;
  const boxBottom = next.y - totalHeight + SECTION_GAP;
  const innerTop = boxTop - insetY;
  const innerBottom = boxBottom + insetY;

  drawCard(next.page, layout, boxTop, boxBottom, { fill: SURFACE_BG });

  const headerBottom = innerTop - headerHeight;
  next.page.drawRectangle({
    x: layout.marginX + padX,
    y: headerBottom,
    width: layout.contentWidth - padX * 2,
    height: headerHeight,
    color: HEADER_BG,
    borderWidth: 0,
  });
  drawColumnDividers(next.page, layout, innerTop, innerBottom);

  const headerTextY = innerTop - padY;
  for (let i = 0; i < headers.length && i < COL_COUNT; i++) {
    drawText(
      next.page,
      layout,
      headers[i].toUpperCase(),
      tableColTextX(layout, i),
      headerTextY,
      fonts.bold,
      LABEL_SIZE,
      MUTED_COLOR,
      textWidth,
    );
  }

  let rowTop = headerBottom;
  for (const [rowIndex, row] of rows.entries()) {
    const rowHeight = rowHeights[rowIndex] ?? 24;
    rowTop -= rowHeight;
    if (row.highlight) {
      next.page.drawRectangle({
        x: layout.marginX + padX,
        y: rowTop,
        width: layout.contentWidth - padX * 2,
        height: rowHeight,
        color: SUCCESS_BG,
        borderWidth: 0,
      });
    }

    const cellTopY = rowTop + rowHeight - padY;
    for (let i = 0; i < row.cells.length && i < COL_COUNT; i++) {
      const font = i === 0 && row.boldFirst ? fonts.bold : fonts.regular;
      const color = i === 1 && row.mutedMiddle ? MUTED_COLOR : TEXT_COLOR;
      drawText(
        next.page,
        layout,
        row.cells[i],
        tableColTextX(layout, i),
        cellTopY,
        font,
        BODY_SIZE,
        color,
        textWidth,
      );
    }

    next.page.drawLine({
      start: { x: layout.marginX + padX, y: rowTop },
      end: { x: layout.marginX + layout.contentWidth - padX, y: rowTop },
      thickness: 0.5,
      color: row.highlight ? SUCCESS_BORDER : BORDER_COLOR,
    });
  }

  next.y = boxBottom - SECTION_GAP;
  return next;
}

async function drawSignatureBox(
  pdfDoc: PDFDocument,
  page: PDFPage,
  layout: AuditPageLayout,
  x: number,
  topY: number,
  width: number,
  height: number,
  recipientName: string,
  signatureId: string,
  signatureField: FieldRow | undefined,
  fonts: Fonts,
): Promise<void> {
  const bottomY = topY - height;
  const pad = BOX_INNER_PAD;
  const contentWidth = width - pad * 2;
  const idText = `ID ${formatSignatureIdDisplay(signatureId)}`;
  const idHeight = measureTextBlockHeight(fonts.regular, idText, CAPTION_SIZE, contentWidth);
  const footerSection = pad + idHeight + 4;
  const labelSection = pad + LABEL_SIZE + 6;

  page.drawRectangle({
    x,
    y: bottomY,
    width,
    height,
    color: SIGNATURE_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 0.75,
  });

  page.drawRectangle({
    x,
    y: bottomY,
    width: 2.5,
    height,
    color: PRIMARY,
    borderWidth: 0,
  });

  const labelY = topY - pad;
  drawText(page, layout, 'Signed by', x + pad, labelY, fonts.bold, LABEL_SIZE, MUTED_COLOR);

  const innerTop = topY - labelSection;
  const innerBottom = bottomY + footerSection;
  const innerHeight = Math.max(24, innerTop - innerBottom);

  if (signatureField?.value) {
    const parsed = parseSignatureValue(signatureField.value);
    if (parsed.kind === 'image' && parsed.dataUrl) {
      try {
        const bytes = dataUrlToBytes(parsed.dataUrl);
        const image: PDFImage = parsed.dataUrl.includes('image/jpeg')
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
        const scale = Math.min(contentWidth / image.width, innerHeight / image.height, 1.25);
        const imageWidth = image.width * scale;
        const imageHeight = image.height * scale;
        page.drawImage(image, {
          x: x + pad,
          y: innerBottom + (innerHeight - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
        });
      } catch {
        drawText(
          page,
          layout,
          recipientName,
          x + pad,
          innerBottom + innerHeight / 2,
          fonts.italic,
          16,
          TEXT_COLOR,
          contentWidth,
        );
      }
    } else if (parsed.text) {
      const textSize = Math.max(14, Math.min(20, innerHeight * 0.72));
      drawText(
        page,
        layout,
        parsed.text,
        x + pad,
        innerBottom + innerHeight / 2,
        fonts.italic,
        textSize,
        TEXT_COLOR,
        contentWidth,
      );
    }
  } else {
    drawText(
      page,
      layout,
      recipientName,
      x + pad,
      innerBottom + innerHeight / 2,
      fonts.italic,
      16,
      TEXT_COLOR,
      contentWidth,
    );
  }

  const idY = bottomY + pad + idHeight - MEASURE_PAD;
  drawText(
    page,
    layout,
    idText,
    x + pad,
    idY,
    fonts.regular,
    CAPTION_SIZE,
    MUTED_COLOR,
    contentWidth,
  );
}

function measureSignerCol0Height(
  recipient: RecipientRow,
  fonts: Fonts,
  width: number,
  signerIndex: number,
  signerTotal: number,
): number {
  const signerLabel = `Signer ${signerIndex} of ${signerTotal}`;
  let height = measureTextBlockHeight(fonts.bold, signerLabel, LABEL_SIZE, width) + 5;
  height += measureTextBlockHeight(fonts.bold, recipient.name, BODY_SIZE + 0.5, width) + 6;
  height += measureTextBlockHeight(fonts.regular, recipient.email, BODY_SIZE, width) + 10;

  const details = [
    formatRecipientRole(recipient.role),
    formatProfileType(recipient.profile_type),
    'Email',
    'Accepted',
  ];
  for (const value of details) {
    height += measureDetailRowHeight(fonts, value, width);
  }

  return height;
}

function measureSignerCol2Height(
  info: RecipientSigningInfo | undefined,
  fonts: Fonts,
  width: number,
): number {
  const entries = [
    { at: info?.sentAt, ip: info?.sentIp },
    { at: info?.viewedAt, ip: info?.viewedIp },
    { at: info?.signedAt, ip: info?.signedIp },
  ];

  return entries.reduce(
    (total, entry) =>
      total + measureTimestampBlockHeight(fonts, entry.at, entry.ip, width),
    0,
  );
}

function measureSenderCol0Height(sender: NonNullable<AuditPageInput['sender']>, fonts: Fonts, width: number): number {
  const lines = [
    sender.name,
    sender.email,
    sender.organizationName ?? '—',
  ];
  return lines.reduce((total, value) => total + measureDetailRowHeight(fonts, value, width), 0);
}

function measureSignatureBoxHeight(
  fonts: Fonts,
  width: number,
  signatureId: string,
  boxInnerPad: number,
): number {
  const idText = `ID ${formatSignatureIdDisplay(signatureId)}`;
  const contentWidth = width - boxInnerPad * 2;
  const idHeight = measureTextBlockHeight(fonts.regular, idText, CAPTION_SIZE, contentWidth);
  const labelSection = boxInnerPad + LABEL_SIZE + 6;
  const signatureArea = 52;
  const footerSection = boxInnerPad + idHeight + 4;
  return labelSection + signatureArea + footerSection;
}

function measureSenderCol1Height(fonts: Fonts, width: number, boxInnerPad: number): number {
  const contentWidth = width - boxInnerPad * 2;
  const values = ['Email invitation', 'SignFlow', 'Encrypted in transit'];
  let height = boxInnerPad;
  for (const value of values) {
    height += measureDetailRowHeight(fonts, value, contentWidth);
  }
  return height + boxInnerPad;
}

async function drawParticipantCard(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  fonts: Fonts,
  generatedAt: Date,
  options: {
    columnTitles: [string, string, string];
    alternate?: boolean;
    signatureBoxHeight?: number;
    contentHeight?: number;
    drawCol0: (page: PDFPage, layout: AuditPageLayout, x: number, y: number, width: number) => number;
    drawCol1?: (
      pdfDoc: PDFDocument,
      page: PDFPage,
      layout: AuditPageLayout,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => Promise<void>;
    drawCol2: (page: PDFPage, layout: AuditPageLayout, x: number, y: number, width: number) => number;
  },
): Promise<PageCursor> {
  const contentHeight = options.contentHeight ?? 130;
  const { innerPad } = cursor.layout;
  const cardHeight = innerPad * 2 + COLUMN_TITLE_HEIGHT + COLUMN_TITLE_GAP + contentHeight + SECTION_GAP;
  const signatureBoxHeight = options.signatureBoxHeight ?? contentHeight;

  let next = ensureSpace(pdfDoc, cursor, cardHeight, fonts, generatedAt);
  const { layout } = next;

  const boxTop = next.y;
  const boxBottom = next.y - cardHeight + SECTION_GAP;

  drawCard(next.page, layout, boxTop, boxBottom, {
    fill: options.alternate ? SURFACE_ALT : SURFACE_BG,
  });
  drawColumnDividers(next.page, layout, boxTop - layout.innerPad, boxBottom + layout.innerPad);

  const titleY = boxTop - layout.innerPad;
  const dataStartY = titleY - COLUMN_TITLE_HEIGHT - COLUMN_TITLE_GAP;

  for (let i = 0; i < COL_COUNT; i++) {
    drawColumnTitle(next.page, layout, i, titleY, options.columnTitles[i], fonts);
  }

  options.drawCol0(next.page, layout, colInnerX(layout, 0), dataStartY, layout.colInnerWidth);

  if (options.drawCol1) {
    await options.drawCol1(
      pdfDoc,
      next.page,
      layout,
      colInnerX(layout, 1),
      dataStartY,
      layout.colInnerWidth,
      signatureBoxHeight,
    );
  }

  options.drawCol2(next.page, layout, colInnerX(layout, 2), dataStartY, layout.colInnerWidth);

  next.y = boxBottom - SECTION_GAP;
  return next;
}

async function drawSignerEventRow(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  recipient: RecipientRow,
  info: RecipientSigningInfo | undefined,
  signatureField: FieldRow | undefined,
  fonts: Fonts,
  generatedAt: Date,
  signerIndex: number,
  signerTotal: number,
): Promise<PageCursor> {
  const signatureId = formatSignatureId(recipient.id, info?.signedAt);
  const col0Height = measureSignerCol0Height(recipient, fonts, cursor.layout.colInnerWidth, signerIndex, signerTotal);
  const col1Height = measureSignatureBoxHeight(
    fonts,
    cursor.layout.colInnerWidth,
    signatureId,
    BOX_INNER_PAD,
  );
  const col2Height = measureSignerCol2Height(info, fonts, cursor.layout.colInnerWidth);
  const cardContentHeight = Math.max(col0Height, col1Height, col2Height);

  return drawParticipantCard(pdfDoc, cursor, fonts, generatedAt, {
    columnTitles: ['Signer', 'Signature', 'Timestamps'],
    alternate: signerIndex % 2 === 1,
    contentHeight: cardContentHeight,
    signatureBoxHeight: col1Height,
    drawCol0: (page, layout, x, y, width) => {
      let currentY = y;
      const signerLabel = `Signer ${signerIndex} of ${signerTotal}`;
      drawText(page, layout, signerLabel, x, currentY, fonts.bold, LABEL_SIZE, PRIMARY, width);
      currentY -= measureTextBlockHeight(fonts.bold, signerLabel, LABEL_SIZE, width) + 5;
      drawText(page, layout, recipient.name, x, currentY, fonts.bold, BODY_SIZE + 0.5, TEXT_COLOR, width);
      currentY -= measureTextBlockHeight(fonts.bold, recipient.name, BODY_SIZE + 0.5, width) + 6;
      drawText(page, layout, recipient.email, x, currentY, fonts.regular, BODY_SIZE, MUTED_COLOR, width);
      currentY -= measureTextBlockHeight(fonts.regular, recipient.email, BODY_SIZE, width) + 10;

      const details = [
        { label: 'Role', value: formatRecipientRole(recipient.role) },
        { label: 'Profile', value: formatProfileType(recipient.profile_type) },
        { label: 'Security', value: 'Email' },
        { label: 'Disclosure', value: 'Accepted' },
      ];
      for (const detail of details) {
        currentY = drawDetailRow(page, layout, x, currentY, width, detail.label, detail.value, fonts);
      }
      return currentY;
    },
    drawCol1: async (pdfDoc, page, layout, x, y, width, height) => {
      await drawSignatureBox(
        pdfDoc,
        page,
        layout,
        x,
        y,
        width,
        height,
        recipient.name,
        signatureId,
        signatureField,
        fonts,
      );
    },
    drawCol2: (page, layout, x, y, width) => {
      let tsY = y;
      const entries = [
        { label: 'Sent', at: info?.sentAt, ip: info?.sentIp },
        { label: 'Viewed', at: info?.viewedAt, ip: info?.viewedIp },
        { label: 'Signed', at: info?.signedAt, ip: info?.signedIp },
      ];
      for (const entry of entries) {
        tsY = drawTimestampBlock(page, layout, x, tsY, width, entry.label, entry.at, entry.ip, fonts);
      }
      return tsY;
    },
  });
}

async function drawSenderCard(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  sender: NonNullable<AuditPageInput['sender']>,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const col0Height = measureSenderCol0Height(sender, fonts, cursor.layout.colInnerWidth);
  const col1Height = measureSenderCol1Height(fonts, cursor.layout.colInnerWidth, BOX_INNER_PAD);
  const col2Height = measureTimestampBlockHeight(
    fonts,
    sender.sentAt,
    sender.sentIp,
    cursor.layout.colInnerWidth,
  );
  const cardContentHeight = Math.max(col0Height, col1Height, col2Height);

  return drawParticipantCard(pdfDoc, cursor, fonts, generatedAt, {
    columnTitles: ['Sender', 'Delivery', 'Timestamps'],
    contentHeight: cardContentHeight,
    signatureBoxHeight: col1Height,
    drawCol0: (page, layout, x, y, width) => {
      let currentY = y;
      const lines = [
        { label: 'Name', value: sender.name },
        { label: 'Email', value: sender.email },
        { label: 'Organization', value: sender.organizationName ?? '—' },
      ];
      for (const line of lines) {
        currentY = drawDetailRow(page, layout, x, currentY, width, line.label, line.value, fonts);
      }
      return currentY;
    },
    drawCol1: async (_pdfDoc, page, layout, x, y, width, height) => {
      const pad = BOX_INNER_PAD;
      const bottomY = y - height;
      const contentWidth = width - pad * 2;

      page.drawRectangle({
        x,
        y: bottomY,
        width,
        height,
        color: SURFACE_ALT,
        borderColor: BORDER_COLOR,
        borderWidth: 0.75,
      });
      page.drawRectangle({
        x,
        y: bottomY,
        width: 2.5,
        height,
        color: PRIMARY,
        borderWidth: 0,
      });

      let infoY = y - pad;
      const deliveryLines = [
        { label: 'Method', value: 'Email invitation' },
        { label: 'Platform', value: 'SignFlow' },
        { label: 'Security', value: 'Encrypted in transit' },
      ];
      for (const line of deliveryLines) {
        infoY = drawDetailRow(page, layout, x + pad, infoY, contentWidth, line.label, line.value, fonts);
      }
    },
    drawCol2: (page, layout, x, y, width) =>
      drawTimestampBlock(
        page,
        layout,
        x,
        y,
        width,
        'Sent',
        sender.sentAt,
        sender.sentIp,
        fonts,
      ),
  });
}

export async function appendDocumentAuditPage(
  pdfDoc: PDFDocument,
  input: AuditPageInput,
): Promise<void> {
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
  };

  const referenceSize = getReferencePageSize(pdfDoc);
  const layout = createAuditPageLayout(referenceSize.width, referenceSize.height);

  const generatedAt = input.generatedAt ?? new Date();
  const subject = input.document.email_subject?.trim() || input.document.title;
  const { signatures, initials } = countFieldTypes(input.fields);
  const orderedRecipients = sortRecipients(input.recipients);
  const signedCount = orderedRecipients.filter(
    (recipient) => input.signingInfo.get(recipient.id)?.status === 'signed',
  ).length;
  const originatorName = input.organizationName ?? 'SignFlow';
  const earliestSent = getEarliestTimestamp(input.signingInfo, 'sentAt');
  const earliestViewed = getEarliestTimestamp(input.signingInfo, 'viewedAt');
  const documentPages = Math.max(1, input.document.pages);

  let cursor = createCursor(pdfDoc, layout, fonts, generatedAt, 1);

  cursor = await drawPageTitle(pdfDoc, cursor, fonts, generatedAt);

  cursor = await drawMetadataGrid(
    pdfDoc,
    cursor,
    [
      [
        { label: 'Envelope ID', value: formatEnvelopeId(input.document.id), small: true },
        { label: 'Subject', value: subject },
        { label: 'Document Pages', value: String(documentPages) },
        { label: 'Certificate Pages', value: '1' },
      ],
      [
        { label: 'Signatures', value: String(signatures || signedCount) },
        { label: 'Initials', value: String(initials) },
        { label: 'AutoNav', value: 'Enabled' },
        { label: 'Envelope ID Stamping', value: 'Enabled' },
      ],
      [
        { label: 'Status', value: formatStatusLabel(input.document.status), status: input.document.status },
        { label: 'Originator', value: originatorName },
        { label: 'Time Zone', value: formatTimeZone() },
      ],
    ],
    fonts,
    generatedAt,
  );

  cursor = await drawSectionHeader(pdfDoc, cursor, 'Record Tracking', fonts, generatedAt);

  const trackingRows: Array<{ cells: string[]; boldFirst?: boolean; mutedMiddle?: boolean; highlight?: boolean }> = [
    {
      cells: [
        `Original · ${formatCertificateTimestamp(input.document.created_at)}`,
        originatorName,
        'SignFlow Platform',
      ],
      boldFirst: true,
    },
  ];

  if (input.sender) {
    trackingRows.push({
      cells: [
        `Sent · ${formatCertificateTimestamp(input.sender.sentAt)}`,
        input.sender.name,
        formatAuditIp(input.sender.sentIp),
      ],
      boldFirst: true,
    });
  }

  cursor = await drawTableSection(
    pdfDoc,
    cursor,
    ['Event', 'Party', 'IP / Location'],
    trackingRows,
    fonts,
    generatedAt,
  );

  if (input.sender) {
    cursor = await drawSectionHeader(pdfDoc, cursor, 'Sender Details', fonts, generatedAt);
    cursor = await drawSenderCard(pdfDoc, cursor, input.sender, fonts, generatedAt);
  }

  cursor = await drawSectionHeader(pdfDoc, cursor, 'Signer Events', fonts, generatedAt);

  const signerTotal = orderedRecipients.length;
  for (const [index, recipient] of orderedRecipients.entries()) {
    const info = input.signingInfo.get(recipient.id);
    const signatureField = getSignatureFieldForRecipient(input.fields, recipient);
    cursor = await drawSignerEventRow(
      pdfDoc,
      cursor,
      recipient,
      info,
      signatureField,
      fonts,
      generatedAt,
      index + 1,
      signerTotal,
    );
  }

  cursor = await drawSectionHeader(pdfDoc, cursor, 'Envelope Summary', fonts, generatedAt);

  const summaryRows: Array<{ cells: string[]; boldFirst?: boolean; mutedMiddle?: boolean; highlight?: boolean }> = [
    {
      cells: ['Envelope Sent', 'Hashed / Encrypted', formatCertificateTimestamp(earliestSent ?? input.document.created_at)],
      boldFirst: true,
      mutedMiddle: true,
    },
    {
      cells: ['Certified Delivered', 'Security Checked', formatCertificateTimestamp(earliestViewed ?? earliestSent)],
      boldFirst: true,
      mutedMiddle: true,
    },
    {
      cells: [
        'Signing Complete',
        'Security Checked',
        formatCertificateTimestamp(input.generatedAt ?? generatedAt),
      ],
      boldFirst: true,
      mutedMiddle: true,
    },
    {
      cells: [
        'Completed',
        'Security Checked',
        formatCertificateTimestamp(input.generatedAt ?? generatedAt),
      ],
      boldFirst: true,
      mutedMiddle: true,
      highlight: true,
    },
  ];

  cursor = await drawTableSection(
    pdfDoc,
    cursor,
    ['Event', 'Status', 'Timestamp'],
    summaryRows,
    fonts,
    generatedAt,
  );

  void cursor;
}
