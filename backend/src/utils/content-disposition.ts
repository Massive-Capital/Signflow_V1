/** Strip characters illegal in HTTP header values and filename="..." tokens. */
export function sanitizeAsciiFilename(name: string, fallback = 'download'): string {
  const ascii = name
    .replace(/[\u0000-\u001F\u007F]+/g, '')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/[^\u0020-\u007E]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/_+/g, '_')
    .trim();

  return ascii || fallback;
}

export function buildContentDisposition(
  disposition: 'inline' | 'attachment',
  filename: string,
): string {
  const trimmed = filename.replace(/[\r\n\t\u0000-\u001F\u007F]+/g, '').trim() || 'download';
  const asciiFallback = sanitizeAsciiFilename(trimmed);
  const encoded = encodeURIComponent(trimmed);

  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
