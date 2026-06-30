import { env } from '../config/env';
import { sendEmail } from './sendEmail';

export async function sendEmailVerificationEmail(
  email: string,
  verificationToken: string,
): Promise<void> {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${verificationToken}`;
  const expiresHours = Math.max(1, Math.round(env.emailVerificationTtl / 3600));

  await sendEmail({
    to: email,
    subject: 'Verify your SignFlow email',
    text: [
      'Welcome to SignFlow.',
      '',
      `Verify your email: ${verifyUrl}`,
      '',
      `This link expires in ${expiresHours} hour(s).`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb; margin-bottom: 0.5rem;">SignFlow</h2>
        <p>Welcome! Please verify your email address to activate your account.</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Verify email
          </a>
        </p>
        <p style="font-size: 14px; color: #64748b;">
          Or copy this link into your browser:<br />
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="font-size: 14px; color: #64748b;">
          This link expires in ${expiresHours} hour(s).
        </p>
      </div>
    `,
  });

  console.log(`Verification email sent to ${email}`);
}
