import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const FOOTER_FONT_SIZE = 7;
const FOOTER_MARGIN_X = 24;
const FOOTER_MARGIN_Y = 18;

export async function stampDocumentIdOnAllPages(
  pdfDoc: PDFDocument,
  documentId: string,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const text = `Document ID: ${documentId}`;

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, FOOTER_FONT_SIZE);

    page.drawText(text, {
      x: width - FOOTER_MARGIN_X - textWidth,
      y: FOOTER_MARGIN_Y,
      size: FOOTER_FONT_SIZE,
      font,
      color: rgb(0.42, 0.45, 0.5),
    });
  }
}
