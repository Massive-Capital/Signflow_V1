import { isEmailConfigured } from '../functions/sendEmail';
import { sendPasswordResetEmail as sendPasswordReset } from '../functions/passwordResetEmail';
import {
  sendSigningInviteEmail,
  type SigningInviteEmailInput,
} from '../functions/signingInviteEmail';
import {
  sendSponsorCounterSignEmail,
  type SponsorCounterSignEmailInput,
} from '../functions/sponsorCounterSignEmail';

export class EmailService {
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!isEmailConfigured()) {
      throw new Error(
        'Email is not configured. Set EMAIL_SERVICE_TYPE and SENDER_EMAIL_ID / SENDER_EMAIL_PASSWORD in backend/.env.local',
      );
    }

    await sendPasswordReset(email, resetToken);
  }

  async sendSigningInvite(input: SigningInviteEmailInput): Promise<void> {
    if (!isEmailConfigured()) {
      const signingUrl = `${process.env.FRONTEND_URL ?? process.env.BASE_URL ?? 'http://localhost:5177'}/sign/${input.signingToken}`;
      console.log('\n--- Signing invite (email not configured) ---');
      console.log(`To: ${input.email}`);
      console.log(`Subject: ${input.subject}`);
      console.log(`Document: ${input.documentTitle}`);
      console.log(`Signing URL: ${signingUrl}`);
      if (input.messageHtml) {
        console.log(`Message HTML: ${input.messageHtml.slice(0, 200)}...`);
      }
      if (input.attachments?.length) {
        console.log(`Attachments: ${input.attachments.map((item) => item.filename).join(', ')}`);
      }
      console.log('-------------------------------------------\n');
      return;
    }

    await sendSigningInviteEmail(input);
  }

  async sendSponsorCounterSign(input: SponsorCounterSignEmailInput): Promise<void> {
    if (!isEmailConfigured()) {
      const signingUrl = `${process.env.FRONTEND_URL ?? process.env.BASE_URL ?? 'http://localhost:5177'}/sign/${input.signingToken}`;
      console.log('\n--- Sponsor counter-sign (email not configured) ---');
      console.log(`To: ${input.email}`);
      console.log(`Subject: ${input.investorName} signed — please counter-sign: ${input.documentTitle}`);
      console.log(`Investor: ${input.investorName}`);
      console.log(`Signing URL: ${signingUrl}`);
      if (input.attachments?.length) {
        console.log(`Attachments: ${input.attachments.map((item) => item.filename).join(', ')}`);
      }
      console.log('---------------------------------------------------\n');
      return;
    }

    await sendSponsorCounterSignEmail(input);
  }
}

export const emailService = new EmailService();
