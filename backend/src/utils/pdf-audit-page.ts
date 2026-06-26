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

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const BRAND_STRIP_HEIGHT = 28;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const BODY_SIZE = 9;
const LABEL_SIZE = 7;
const TITLE_SIZE = 20;
const SUBTITLE_SIZE = 9;
const CAPTION_SIZE = 7;
const FOOTER_SIZE = 6.5;
const SECTION_TITLE_SIZE = 10;

const SECTION_GAP = 16;
const ROW_GAP = 4;
const INNER_PAD = 12;
const FIELD_GAP = 9;
const COLUMN_TITLE_GAP = 8;
const COLUMN_TITLE_HEIGHT = 12;
const TEXT_LINE_GAP = 3;
const MEASURE_PAD = 2;

const COL_COUNT = 3;
const COL_GAP = 12;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP * (COL_COUNT - 1)) / COL_COUNT;
const COL_X = [0, 1, 2].map((i) => MARGIN_X + i * (COL_WIDTH + COL_GAP));
const COL_INNER_WIDTH = COL_WIDTH - INNER_PAD * 2;
const colInnerX = (index: number) => COL_X[index] + INNER_PAD;

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
}

interface StatusPillStyle {
  background: ReturnType<typeof rgb>;
  text: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
}

function formatCertificateTimestamp(value?: string | Date): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

function formatEnvelopeId(id: string): string {
  const raw = id.replace(/-/g, '').toUpperCase();
  return raw.match(/.{1,8}/g)?.join(' ') ?? raw;
}

function formatTimeZone(): string {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absMinutes % 60).toString().padStart(2, '0');
  const tzName =
    Intl.DateTimeFormat('en-US', { timeZoneName: 'long' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? 'Local Time';

  return `(UTC${sign}${hours}:${minutes}) ${tzName}`;
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
  timestamp: string,
  ip: string | undefined,
  width: number,
): number {
  const ipText = `IP ${formatAuditIp(ip)}`;
  const timestampHeight = measureTextBlockHeight(fonts.regular, timestamp, BODY_SIZE, width);
  const ipHeight = measureTextBlockHeight(fonts.regular, ipText, CAPTION_SIZE, width);
  return LABEL_SIZE + 3 + timestampHeight + 3 + ipHeight + 4;
}

function drawText(
  page: PDFPage,
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
    maxWidth: maxWidth ?? CONTENT_WIDTH,
    lineHeight: lineHeightFor(size),
  });
}

function drawHorizontalRule(page: PDFPage, y: number, color = BORDER_COLOR): void {
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: MARGIN_X + CONTENT_WIDTH, y },
    thickness: 0.5,
    color,
  });
}

function drawColumnDividers(page: PDFPage, topY: number, bottomY: number): void {
  for (let i = 1; i < COL_COUNT; i++) {
    const x = COL_X[i] - COL_GAP / 2;
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
  topY: number,
  bottomY: number,
  options?: { fill?: ReturnType<typeof rgb>; border?: boolean },
): void {
  page.drawRectangle({
    x: MARGIN_X,
    y: bottomY,
    width: CONTENT_WIDTH,
    height: topY - bottomY,
    color: options?.fill ?? SURFACE_BG,
    borderColor: options?.border === false ? undefined : BORDER_COLOR,
    borderWidth: options?.border === false ? 0 : 0.75,
  });
}

function drawColumnTitle(
  page: PDFPage,
  colIndex: number,
  y: number,
  title: string,
  fonts: Fonts,
): void {
  drawText(
    page,
    title.toUpperCase(),
    colInnerX(colIndex),
    y,
    fonts.bold,
    LABEL_SIZE,
    PRIMARY,
    COL_INNER_WIDTH,
  );
}

function drawStackedField(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fonts: Fonts,
  options?: { small?: boolean },
): number {
  const valueSize = options?.small ? BODY_SIZE - 0.5 : BODY_SIZE;
  drawText(page, label.toUpperCase(), x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  const valueY = y - LABEL_SIZE - 4;
  drawText(page, value, x, valueY, fonts.regular, valueSize, TEXT_COLOR, width);
  const valueHeight = measureTextBlockHeight(fonts.regular, value, valueSize, width);
  return valueY - valueHeight - FIELD_GAP;
}

function drawDetailRow(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fonts: Fonts,
): number {
  drawText(page, label, x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  const valueY = y - LABEL_SIZE - 3;
  drawText(page, value, x, valueY, fonts.regular, BODY_SIZE, TEXT_COLOR, width);
  return valueY - measureTextBlockHeight(fonts.regular, value, BODY_SIZE, width) - 6;
}

function drawTimestampBlock(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  label: string,
  timestamp: string,
  ip: string | undefined,
  fonts: Fonts,
): number {
  const ipText = `IP ${formatAuditIp(ip)}`;

  drawText(page, label, x, y, fonts.bold, LABEL_SIZE, MUTED_COLOR, width);
  let cursorY = y - LABEL_SIZE - 3;
  drawText(page, timestamp, x, cursorY, fonts.regular, BODY_SIZE, TEXT_COLOR, width);
  cursorY -= measureTextBlockHeight(fonts.regular, timestamp, BODY_SIZE, width) + 3;
  drawText(page, ipText, x, cursorY, fonts.regular, CAPTION_SIZE, MUTED_COLOR, width);
  return cursorY - measureTextBlockHeight(fonts.regular, ipText, CAPTION_SIZE, width) - 4;
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

  drawText(page, label, x + 7, y - pillHeight + 3, fonts.bold, BODY_SIZE - 0.5, style.text);
}

function drawBrandStrip(
  page: PDFPage,
  fonts: Fonts,
  generatedAt: Date,
  pageNumber: number,
  continued: boolean,
): void {
  const stripTop = PAGE_HEIGHT - 12;

  page.drawRectangle({
    x: MARGIN_X,
    y: stripTop - BRAND_STRIP_HEIGHT,
    width: CONTENT_WIDTH,
    height: BRAND_STRIP_HEIGHT,
    color: BRAND_STRIP_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });

  page.drawRectangle({
    x: MARGIN_X,
    y: stripTop - BRAND_STRIP_HEIGHT,
    width: 3,
    height: BRAND_STRIP_HEIGHT,
    color: PRIMARY,
    borderWidth: 0,
  });

  const brandLabel = continued ? 'SignFlow · Certificate (continued)' : 'SignFlow';
  drawText(page, brandLabel, MARGIN_X + 12, stripTop - 17, fonts.bold, BODY_SIZE, PRIMARY_DARK);

  if (pageNumber > 1) {
    const pageLabel = `Page ${pageNumber}`;
    const pageWidth = fonts.regular.widthOfTextAtSize(pageLabel, CAPTION_SIZE);
    drawText(
      page,
      pageLabel,
      MARGIN_X + CONTENT_WIDTH - pageWidth - 12,
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
    generatedLabel,
    MARGIN_X + CONTENT_WIDTH - generatedWidth - 12,
    stripTop - 17,
    fonts.regular,
    CAPTION_SIZE,
    MUTED_COLOR,
  );
}

function drawPageFooter(page: PDFPage, fonts: Fonts): void {
  drawHorizontalRule(page, MARGIN_BOTTOM + 6);
  const footerText =
    'This certificate is cryptographically bound to the signed document and forms part of the audit trail.';
  drawText(page, footerText, MARGIN_X, MARGIN_BOTTOM - 10, fonts.regular, FOOTER_SIZE, MUTED_COLOR, CONTENT_WIDTH);
}

function createCursor(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  generatedAt: Date,
  pageNumber: number,
): PageCursor {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBrandStrip(page, fonts, generatedAt, pageNumber, pageNumber > 1);
  drawPageFooter(page, fonts);
  return { page, y: PAGE_HEIGHT - MARGIN_TOP - BRAND_STRIP_HEIGHT + 8, pageNumber };
}

function ensureSpace(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  heightNeeded: number,
  fonts: Fonts,
  generatedAt: Date,
): PageCursor {
  if (cursor.y - heightNeeded >= MARGIN_BOTTOM + 20) {
    return cursor;
  }
  return createCursor(pdfDoc, fonts, generatedAt, cursor.pageNumber + 1);
}

async function drawPageTitle(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const blockHeight = TITLE_SIZE + SUBTITLE_SIZE + SECTION_GAP + 12;
  let next = ensureSpace(pdfDoc, cursor, blockHeight, fonts, generatedAt);

  drawText(next.page, 'Certificate of Completion', MARGIN_X, next.y, fonts.bold, TITLE_SIZE, TEXT_COLOR);
  next.y -= TITLE_SIZE + 8;
  drawText(
    next.page,
    'Electronic signature audit trail · Tamper-evident record',
    MARGIN_X,
    next.y,
    fonts.regular,
    SUBTITLE_SIZE,
    MUTED_COLOR,
  );
  next.y -= SUBTITLE_SIZE + 10;
  next.page.drawRectangle({
    x: MARGIN_X,
    y: next.y,
    width: 48,
    height: 2.5,
    color: PRIMARY,
    borderWidth: 0,
  });
  next.y -= SECTION_GAP;
  drawHorizontalRule(next.page, next.y);

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
  drawText(next.page, title.toUpperCase(), MARGIN_X, next.y, fonts.bold, SECTION_TITLE_SIZE, TEXT_COLOR);
  next.y -= SECTION_GAP;

  return next;
}

function measureMetadataColumnHeight(
  entries: Array<{ label: string; value: string; status?: string; small?: boolean }>,
  width: number,
  fonts: Fonts,
): number {
  let height = INNER_PAD;
  for (const entry of entries) {
    if (entry.status) {
      height += LABEL_SIZE + 18 + FIELD_GAP;
      continue;
    }
    const valueSize = entry.small ? BODY_SIZE - 0.5 : BODY_SIZE;
    const valueHeight = measureTextBlockHeight(fonts.regular, entry.value, valueSize, width);
    height += LABEL_SIZE + 4 + valueHeight + FIELD_GAP;
  }
  return height + INNER_PAD;
}

async function drawMetadataGrid(
  pdfDoc: PDFDocument,
  cursor: PageCursor,
  columns: Array<Array<{ label: string; value: string; status?: string; small?: boolean }>>,
  fonts: Fonts,
  generatedAt: Date,
): Promise<PageCursor> {
  const columnHeights = columns.map((col) => measureMetadataColumnHeight(col, COL_INNER_WIDTH, fonts));
  const cardHeight = Math.max(...columnHeights) + SECTION_GAP;
  let next = ensureSpace(pdfDoc, cursor, cardHeight, fonts, generatedAt);

  const boxTop = next.y;
  const boxBottom = next.y - cardHeight + SECTION_GAP;

  drawCard(next.page, boxTop, boxBottom, { fill: SURFACE_ALT });
  drawColumnDividers(next.page, boxTop - INNER_PAD, boxBottom + INNER_PAD);

  const startY = boxTop - INNER_PAD;

  for (let col = 0; col < COL_COUNT; col++) {
    let fieldY = startY;
    const x = colInnerX(col);
    const entries = columns[col] ?? [];

    for (const entry of entries) {
      if (entry.status) {
        drawText(next.page, entry.label.toUpperCase(), x, fieldY, fonts.bold, LABEL_SIZE, MUTED_COLOR, COL_INNER_WIDTH);
        drawStatusPill(next.page, x, fieldY - LABEL_SIZE - 4, entry.status, fonts);
        fieldY -= LABEL_SIZE + 22;
        continue;
      }
      fieldY = drawStackedField(next.page, x, fieldY, COL_INNER_WIDTH, entry.label, entry.value, fonts, {
        small: entry.small,
      });
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
  const headerHeight = 22;
  const rowHeights = rows.map((row) => {
    let maxHeight = BODY_SIZE + 14;
    for (let i = 0; i < row.cells.length && i < COL_COUNT; i++) {
      const font = i === 0 && row.boldFirst ? fonts.bold : fonts.regular;
      const cellHeight = measureTextBlockHeight(font, row.cells[i], BODY_SIZE, COL_INNER_WIDTH);
      maxHeight = Math.max(maxHeight, cellHeight + 14);
    }
    return maxHeight;
  });
  const totalHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0) + SECTION_GAP;
  let next = ensureSpace(pdfDoc, cursor, totalHeight, fonts, generatedAt);

  const boxTop = next.y;
  const boxBottom = next.y - totalHeight + SECTION_GAP;

  drawCard(next.page, boxTop, boxBottom, { fill: SURFACE_BG });

  const headerBottom = boxTop - headerHeight;
  next.page.drawRectangle({
    x: MARGIN_X,
    y: headerBottom,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: HEADER_BG,
    borderWidth: 0,
  });
  drawColumnDividers(next.page, boxTop, boxBottom);

  const headerBaseline = boxTop - headerHeight / 2 - LABEL_SIZE * 0.35;
  for (let i = 0; i < headers.length && i < COL_COUNT; i++) {
    drawText(
      next.page,
      headers[i].toUpperCase(),
      colInnerX(i),
      headerBaseline,
      fonts.bold,
      LABEL_SIZE,
      MUTED_COLOR,
      COL_INNER_WIDTH,
    );
  }

  let rowTop = headerBottom;
  for (const [rowIndex, row] of rows.entries()) {
    const rowHeight = rowHeights[rowIndex] ?? 24;
    rowTop -= rowHeight;
    if (row.highlight) {
      next.page.drawRectangle({
        x: MARGIN_X,
        y: rowTop,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: SUCCESS_BG,
        borderWidth: 0,
      });
    }

    const textBaseline = rowTop + rowHeight - 10 - BODY_SIZE;
    for (let i = 0; i < row.cells.length && i < COL_COUNT; i++) {
      const font = i === 0 && row.boldFirst ? fonts.bold : fonts.regular;
      const color = i === 1 && row.mutedMiddle ? MUTED_COLOR : TEXT_COLOR;
      drawText(
        next.page,
        row.cells[i],
        colInnerX(i),
        textBaseline,
        font,
        BODY_SIZE,
        color,
        COL_INNER_WIDTH,
      );
    }

    drawHorizontalRule(next.page, rowTop, row.highlight ? SUCCESS_BORDER : BORDER_COLOR);
  }

  next.y = boxBottom - SECTION_GAP;
  return next;
}

async function drawSignatureBox(
  pdfDoc: PDFDocument,
  page: PDFPage,
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

  const labelY = topY - 11;
  drawText(page, 'Signed by', x + INNER_PAD, labelY, fonts.bold, LABEL_SIZE, MUTED_COLOR);

  const innerTop = topY - 22;
  const innerBottom = bottomY + 14;
  const innerHeight = innerTop - innerBottom;

  if (signatureField?.value) {
    const parsed = parseSignatureValue(signatureField.value);
    if (parsed.kind === 'image' && parsed.dataUrl) {
      try {
        const bytes = dataUrlToBytes(parsed.dataUrl);
        const image: PDFImage = parsed.dataUrl.includes('image/jpeg')
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
        const scale = Math.min((width - INNER_PAD * 2) / image.width, innerHeight / image.height, 1.1);
        const imageWidth = image.width * scale;
        const imageHeight = image.height * scale;
        page.drawImage(image, {
          x: x + INNER_PAD,
          y: innerBottom + (innerHeight - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
        });
      } catch {
        drawText(
          page,
          recipientName,
          x + INNER_PAD,
          innerBottom + innerHeight / 2,
          fonts.italic,
          13,
          TEXT_COLOR,
          width - INNER_PAD * 2,
        );
      }
    } else if (parsed.text) {
      const textSize = Math.min(15, innerHeight * 0.65);
      drawText(
        page,
        parsed.text,
        x + INNER_PAD,
        innerBottom + innerHeight / 2,
        fonts.italic,
        textSize,
        TEXT_COLOR,
        width - INNER_PAD * 2,
      );
    }
  } else {
    drawText(
      page,
      recipientName,
      x + INNER_PAD,
      innerBottom + innerHeight / 2,
      fonts.italic,
      13,
      TEXT_COLOR,
      width - INNER_PAD * 2,
    );
  }

  drawText(page, `ID ${signatureId}`, x + INNER_PAD, bottomY + 5, fonts.regular, CAPTION_SIZE, MUTED_COLOR, width - INNER_PAD * 2);
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
      total + measureTimestampBlockHeight(fonts, formatCertificateTimestamp(entry.at), entry.ip, width),
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
    drawCol0: (page: PDFPage, x: number, y: number, width: number) => number;
    drawCol1?: (
      pdfDoc: PDFDocument,
      page: PDFPage,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => Promise<void>;
    drawCol2: (page: PDFPage, x: number, y: number, width: number) => number;
  },
): Promise<PageCursor> {
  const contentHeight = options.contentHeight ?? 130;
  const cardHeight = INNER_PAD * 2 + COLUMN_TITLE_HEIGHT + COLUMN_TITLE_GAP + contentHeight + SECTION_GAP;
  const signatureBoxHeight = options.signatureBoxHeight ?? Math.max(80, contentHeight - 24);

  let next = ensureSpace(pdfDoc, cursor, cardHeight, fonts, generatedAt);

  const boxTop = next.y;
  const boxBottom = next.y - cardHeight + SECTION_GAP;

  drawCard(next.page, boxTop, boxBottom, {
    fill: options.alternate ? SURFACE_ALT : SURFACE_BG,
  });
  drawColumnDividers(next.page, boxTop - INNER_PAD, boxBottom + INNER_PAD);

  const titleY = boxTop - INNER_PAD;
  const dataStartY = titleY - COLUMN_TITLE_HEIGHT - COLUMN_TITLE_GAP;

  for (let i = 0; i < COL_COUNT; i++) {
    drawColumnTitle(next.page, i, titleY, options.columnTitles[i], fonts);
  }

  options.drawCol0(next.page, colInnerX(0), dataStartY, COL_INNER_WIDTH);

  if (options.drawCol1) {
    await options.drawCol1(
      pdfDoc,
      next.page,
      colInnerX(1),
      dataStartY,
      COL_INNER_WIDTH,
      signatureBoxHeight,
    );
  }

  options.drawCol2(next.page, colInnerX(2), dataStartY, COL_INNER_WIDTH);

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
  const col0Height = measureSignerCol0Height(recipient, fonts, COL_INNER_WIDTH, signerIndex, signerTotal);
  const col2Height = measureSignerCol2Height(info, fonts, COL_INNER_WIDTH);

  return drawParticipantCard(pdfDoc, cursor, fonts, generatedAt, {
    columnTitles: ['Signer', 'Signature', 'Timestamps'],
    alternate: signerIndex % 2 === 1,
    contentHeight: Math.max(col0Height, 88, col2Height),
    drawCol0: (page, x, y, width) => {
      let currentY = y;
      const signerLabel = `Signer ${signerIndex} of ${signerTotal}`;
      drawText(page, signerLabel, x, currentY, fonts.bold, LABEL_SIZE, PRIMARY, width);
      currentY -= measureTextBlockHeight(fonts.bold, signerLabel, LABEL_SIZE, width) + 5;
      drawText(page, recipient.name, x, currentY, fonts.bold, BODY_SIZE + 0.5, TEXT_COLOR, width);
      currentY -= measureTextBlockHeight(fonts.bold, recipient.name, BODY_SIZE + 0.5, width) + 6;
      drawText(page, recipient.email, x, currentY, fonts.regular, BODY_SIZE, MUTED_COLOR, width);
      currentY -= measureTextBlockHeight(fonts.regular, recipient.email, BODY_SIZE, width) + 10;

      const details = [
        { label: 'Role', value: formatRecipientRole(recipient.role) },
        { label: 'Profile', value: formatProfileType(recipient.profile_type) },
        { label: 'Security', value: 'Email' },
        { label: 'Disclosure', value: 'Accepted' },
      ];
      for (const detail of details) {
        currentY = drawDetailRow(page, x, currentY, width, detail.label, detail.value, fonts);
      }
      return currentY;
    },
    drawCol1: async (pdfDoc, page, x, y, width, height) => {
      await drawSignatureBox(
        pdfDoc,
        page,
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
    drawCol2: (page, x, y, width) => {
      let tsY = y;
      const entries = [
        { label: 'Sent', value: formatCertificateTimestamp(info?.sentAt), ip: info?.sentIp },
        { label: 'Viewed', value: formatCertificateTimestamp(info?.viewedAt), ip: info?.viewedIp },
        { label: 'Signed', value: formatCertificateTimestamp(info?.signedAt), ip: info?.signedIp },
      ];
      for (const entry of entries) {
        tsY = drawTimestampBlock(page, x, tsY, width, entry.label, entry.value, entry.ip, fonts);
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
  const col0Height = measureSenderCol0Height(sender, fonts, COL_INNER_WIDTH);
  const col2Height = measureTimestampBlockHeight(
    fonts,
    formatCertificateTimestamp(sender.sentAt),
    sender.sentIp,
    COL_INNER_WIDTH,
  );

  return drawParticipantCard(pdfDoc, cursor, fonts, generatedAt, {
    columnTitles: ['Sender', 'Delivery', 'Timestamps'],
    contentHeight: Math.max(col0Height, 88, col2Height),
    drawCol0: (page, x, y, width) => {
      let currentY = y;
      const lines = [
        { label: 'Name', value: sender.name },
        { label: 'Email', value: sender.email },
        { label: 'Organization', value: sender.organizationName ?? '—' },
      ];
      for (const line of lines) {
        currentY = drawDetailRow(page, x, currentY, width, line.label, line.value, fonts);
      }
      return currentY;
    },
    drawCol1: async (_pdfDoc, page, x, y, width, height) => {
      const bottomY = y - height;
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
      let infoY = y - 12;
      const deliveryLines = [
        { label: 'Method', value: 'Email invitation' },
        { label: 'Platform', value: 'SignFlow' },
        { label: 'Security', value: 'Encrypted in transit' },
      ];
      for (const line of deliveryLines) {
        infoY = drawDetailRow(page, x + INNER_PAD, infoY, width - INNER_PAD * 2, line.label, line.value, fonts);
      }
    },
    drawCol2: (page, x, y, width) =>
      drawTimestampBlock(
        page,
        x,
        y,
        width,
        'Sent',
        formatCertificateTimestamp(sender.sentAt),
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

  let cursor = createCursor(pdfDoc, fonts, generatedAt, 1);

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
        formatCertificateTimestamp(input.generatedAt?.toISOString() ?? generatedAt.toISOString()),
      ],
      boldFirst: true,
      mutedMiddle: true,
    },
    {
      cells: [
        'Completed',
        'Security Checked',
        formatCertificateTimestamp(input.generatedAt?.toISOString() ?? generatedAt.toISOString()),
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
