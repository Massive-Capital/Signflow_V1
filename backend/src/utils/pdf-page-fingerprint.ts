import { createHash } from 'crypto';
import { PDFDocument } from 'pdf-lib';

/** Stable fingerprint for a single PDF page (content-based). */
export async function computePdfPageFingerprints(buffer: Buffer): Promise<string[]> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const hashes: string[] = [];

  for (const idx of doc.getPageIndices()) {
    const single = await PDFDocument.create();
    const [page] = await single.copyPages(doc, [idx]);
    single.addPage(page);
    const bytes = await single.save();
    hashes.push(createHash('sha256').update(bytes).digest('hex').slice(0, 16));
  }

  return hashes;
}

export function pageHashForPageNumber(
  fingerprints: string[],
  page: number,
): string | undefined {
  const index = Math.max(0, Math.floor(page) - 1);
  return fingerprints[index]?.trim() || undefined;
}
