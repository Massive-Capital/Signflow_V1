import { apiKeyRepository } from '../repositories/api-key.repository';
import type { ApiKey, AuthContext } from '../types/domain';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { toApiKey } from '../utils/mappers';

export class ApiKeyService {
  async list(auth: AuthContext): Promise<ApiKey[]> {
    const rows = await apiKeyRepository.listByOrganization(auth.organizationId);
    return rows.map((row) => toApiKey(row));
  }

  async create(
    auth: AuthContext,
    name: string,
    environment: ApiKey['environment'],
  ): Promise<ApiKey> {
    const prefix = environment === 'production' ? 'pk_live' : 'pk_test';
    const secret = generateSecureToken(16);
    const plainKey = `${prefix}_${secret}`;

    const row = await apiKeyRepository.create({
      organizationId: auth.organizationId,
      name,
      keyHash: hashToken(plainKey),
      keyPrefix: prefix,
      environment,
      permissions: ['documents:read', 'documents:write', 'signing:create'],
    });

    return toApiKey(row, plainKey);
  }
}

export const apiKeyService = new ApiKeyService();
