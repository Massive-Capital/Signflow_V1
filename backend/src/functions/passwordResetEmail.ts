import { env } from '../config/env';
import { sendEmail } from './sendEmail';

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
  const expiresHours = Math.max(1, Math.round(env.passwordResetTtl / 3600));

  await sendEmail({
    to: email,
    subject: 'Reset your SignFlow password',
    text: [
      'You requested a password reset for your SignFlow account.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      `This link expires in ${expiresHours} hour(s).`,
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb; margin-bottom: 0.5rem;">SignFlow</h2>
        <p>You requested a password reset for your account.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="font-size: 14px; color: #64748b;">
          Or copy this link into your browser:<br />
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="font-size: 14px; color: #64748b;">
          This link expires in ${expiresHours} hour(s). If you did not request this, you can ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`Password reset email sent to ${email}`);
}
