import { organizationRepository } from '../repositories/organization.repository';
import { emailVerificationRepository } from '../repositories/email-verification.repository';
import { passwordResetRepository } from '../repositories/password-reset.repository';
import { tokenRepository } from '../repositories/token.repository';
import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';
import { toPublicUser, tokenService } from './token.service';
import { env } from '../config/env';
import { isEmailConfigured } from '../functions/sendEmail';
import { AppError } from '../utils/app-error';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { hashPassword, verifyPassword } from '../utils/password';

interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface ResetPasswordInput {
  token: string;
  password: string;
}

export class AuthService {
  private async issueVerificationToken(userId: string, email: string): Promise<void> {
    const verificationToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + env.emailVerificationTtl * 1000);

    await emailVerificationRepository.create({
      userId,
      tokenHash: hashToken(verificationToken),
      expiresAt,
    });

    try {
      await emailService.sendEmailVerification(email, verificationToken);
    } catch (error) {
      const verifyUrl = `${env.frontendUrl}/verify-email?token=${verificationToken}`;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to send verification email to ${email}:`, message);
      console.log(`Verification URL for ${email}: ${verifyUrl}`);
    }
  }

  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
    }

    const organization = await organizationRepository.create(`${input.name}'s Workspace`);
    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      organizationId: organization.id,
      role: 'owner',
    });

    await this.issueVerificationToken(user.id, user.email);

    return {
      email: user.email,
      name: user.name,
      message: isEmailConfigured()
        ? 'Verification email sent'
        : 'Account created. Check server logs for the verification link.',
    };
  }

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const passwordValid = await verifyPassword(input.password, user.password_hash);
    if (!passwordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.email_verified) {
      throw new AppError(
        'Email address is not verified. Check your inbox or request a new verification link.',
        403,
        'EMAIL_NOT_VERIFIED',
      );
    }

    const tokens = await tokenService.issueTokenPair(user.id);

    return {
      ...tokens,
      user: toPublicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const { userId, ...tokens } = await tokenService.rotateRefreshToken(refreshToken);
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.email_verified) {
      throw new AppError('Email address is not verified', 403, 'EMAIL_NOT_VERIFIED');
    }

    return {
      ...tokens,
      user: toPublicUser(user),
    };
  }

  async logout(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      await tokenService.revokeToken(accessToken, 'access');
    }
    if (refreshToken) {
      await tokenService.revokeToken(refreshToken, 'refresh');
    }
  }

  async verifyEmail(token: string) {
    const record = await emailVerificationRepository.findValidByHash(hashToken(token));
    if (!record) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    await userRepository.markEmailVerified(record.user_id);
    await emailVerificationRepository.markUsed(hashToken(token));

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await userRepository.findByEmail(email);

    if (!user || user.email_verified) {
      return { message: 'If the account exists and is unverified, a verification email has been sent.' };
    }

    await this.issueVerificationToken(user.id, user.email);

    return { message: 'If the account exists and is unverified, a verification email has been sent.' };
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    const resetToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + env.passwordResetTtl * 1000);

    await passwordResetRepository.create({
      userId: user.id,
      tokenHash: hashToken(resetToken),
      expiresAt,
    });

    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to send password reset email to ${user.email}:`, message);
    }

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const record = await passwordResetRepository.findValidByHash(hashToken(input.token));
    if (!record) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await hashPassword(input.password);
    await userRepository.updatePassword(record.user_id, passwordHash);
    await passwordResetRepository.markUsed(hashToken(input.token));
    await tokenRepository.revokeAllForUser(record.user_id);

    return { message: 'Password has been reset successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toPublicUser(user);
  }
}

export const authService = new AuthService();
