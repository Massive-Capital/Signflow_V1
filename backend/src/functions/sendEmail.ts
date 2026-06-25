import emailConfig, {
  outgoingMailCcBcc,
  smtpEnvelopeForSendMail,
} from './emailconfig';

export interface EmailAttachmentInput {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachmentInput[];
}

export function isEmailConfigured(): boolean {
  const serviceType = process.env.EMAIL_SERVICE_TYPE?.trim().toLowerCase();
  if (!serviceType) return false;

  if (serviceType === 'smtp') {
    return Boolean(process.env.SMTP_HOST?.trim());
  }

  return Boolean(
    process.env.SENDER_EMAIL_ID?.trim() && process.env.SENDER_EMAIL_PASSWORD?.trim(),
  );
}

export function getSenderFromAddress(): string {
  const sender = process.env.SENDER_EMAIL_ID?.trim() ?? 'noreply@signflow.local';
  return process.env.EMAIL_FROM?.trim() || `SignFlow <${sender}>`;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = emailConfig();
  const fromAddress = getSenderFromAddress();
  const ccBcc = outgoingMailCcBcc();

  await transporter.sendMail({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
    ...ccBcc,
    envelope: smtpEnvelopeForSendMail({
      fromAddress,
      to: input.to,
      cc: ccBcc.cc,
      bcc: ccBcc.bcc,
    }),
  });
}
