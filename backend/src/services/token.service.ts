import { env } from '../config/env';
import { tokenRepository } from '../repositories/token.repository';
import type { AuthTokensResponse, PublicUser, TokenType, UserRow } from '../types';
import { AppError } from '../utils/app-error';
import { generateSecureToken, hashToken } from '../utils/crypto';

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organization_id,
  };
}

export class TokenService {
  async issueTokenPair(userId: string): Promise<AuthTokensResponse> {
    const accessToken = generateSecureToken(32);
    const refreshToken = generateSecureToken(48);
    const now = new Date();

    await tokenRepository.create({
      userId,
      tokenHash: hashToken(accessToken),
      tokenType: 'access',
      expiresAt: addSeconds(now, env.accessTokenTtl),
    });

    await tokenRepository.create({
      userId,
      tokenHash: hashToken(refreshToken),
      tokenType: 'refresh',
      expiresAt: addSeconds(now, env.refreshTokenTtl),
    });

    return { accessToken, refreshToken };
  }

  async validateAccessToken(accessToken: string): Promise<string> {
    return this.validateToken(accessToken, 'access');
  }

  async validateRefreshToken(refreshToken: string): Promise<string> {
    return this.validateToken(refreshToken, 'refresh');
  }

  private async validateToken(token: string, tokenType: TokenType): Promise<string> {
    const record = await tokenRepository.findValidByHash(hashToken(token), tokenType);
    if (!record) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    return record.user_id;
  }

  async revokeToken(token: string, tokenType: TokenType): Promise<void> {
    await tokenRepository.revokeByHash(hashToken(token));
  }

  async rotateRefreshToken(
    refreshToken: string,
  ): Promise<AuthTokensResponse & { userId: string }> {
    const userId = await this.validateRefreshToken(refreshToken);
    await tokenRepository.revokeByHash(hashToken(refreshToken));
    const tokens = await this.issueTokenPair(userId);
    return { ...tokens, userId };
  }
}

export const tokenService = new TokenService();
