import { env } from '../config/env';
import { sendEmail } from './sendEmail';

export interface SponsorCounterSignEmailInput {
  email: string;
  documentTitle: string;
  investorName: string;
  signingToken: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendSponsorCounterSignEmail(
  input: SponsorCounterSignEmailInput,
): Promise<void> {
  const signingUrl = `${env.frontendUrl}/sign/${input.signingToken}`;
  const investorName = escapeHtml(input.investorName);
  const documentTitle = escapeHtml(input.documentTitle);

  const textBody = [
    `${input.investorName} has signed "${input.documentTitle}".`,
    '',
    'Please review the investor details they provided and counter-sign the document.',
    '',
    `Open the document: ${signingUrl}`,
    '',
    'Thank you,',
    'SignFlow',
  ].join('\n');

  await sendEmail({
    to: input.email,
    subject: `${input.investorName} signed — please counter-sign: ${input.documentTitle}`,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb; margin-bottom: 0.5rem;">SignFlow</h2>
        <p>
          <strong>${investorName}</strong> has signed <strong>${documentTitle}</strong>.
        </p>
        <p>
          Please review the investor details they provided and counter-sign the document.
        </p>
        <p>
          <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Review and counter-sign
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

  console.log(`Sponsor counter-sign email sent to ${input.email} for investor ${input.investorName}`);
}
