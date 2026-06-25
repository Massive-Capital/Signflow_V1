import { organizationRepository } from '../repositories/organization.repository';
import { passwordResetRepository } from '../repositories/password-reset.repository';
import { tokenRepository } from '../repositories/token.repository';
import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';
import { toPublicUser, tokenService } from './token.service';
import { env } from '../config/env';
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

    return {
      email: user.email,
      name: user.name,
      message: 'Verification email sent',
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

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);

    // Always return success to avoid email enumeration
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
