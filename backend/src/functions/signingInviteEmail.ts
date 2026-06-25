import { env } from '../config/env';
import { sendEmail } from './sendEmail';

export interface SigningInviteEmailInput {
  email: string;
  documentTitle: string;
  signingToken: string;
  subject: string;
  messageHtml: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendSigningInviteEmail(input: SigningInviteEmailInput): Promise<void> {
  const signingUrl = `${env.frontendUrl}/sign/${input.signingToken}`;
  const customMessage = input.messageHtml.trim();
  const messageBlock = customMessage
    ? `<div style="margin: 1rem 0; line-height: 1.6;">${customMessage}</div>`
    : `<p>You have been invited to sign <strong>${escapeHtml(input.documentTitle)}</strong>.</p>`;

  const textBody = [
    customMessage ? htmlToPlainText(customMessage) : `You have been invited to sign "${input.documentTitle}".`,
    '',
    `Open the document: ${signingUrl}`,
    '',
    'Thank you,',
    'SignFlow',
  ].join('\n');

  await sendEmail({
    to: input.email,
    subject: input.subject,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb; margin-bottom: 0.5rem;">SignFlow</h2>
        ${messageBlock}
        <p>
          <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Review and sign
          </a>
        </p>
        <p style="font-size: 14px; color: #64748b;">
          Or copy this link into your browser:<br />
          <a href="${signingUrl}">${signingUrl}</a>
        </p>
      </div>
    `,
    attachments: input.attachments,
  });

  console.log(`Signing invite email sent to ${input.email}`);
}
