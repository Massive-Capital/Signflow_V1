import { organizationRepository } from '../repositories/organization.repository';
import { sdkConfigRepository } from '../repositories/sdk-config.repository';
import type { AuthContext, Organization, SdkConfig } from '../types/domain';
import { AppError } from '../utils/app-error';
import { toOrganization } from '../utils/mappers';

export class OrganizationService {
  async listForUser(userId: string): Promise<Organization[]> {
    const rows = await organizationRepository.findByUserId(userId);
    return rows.map(toOrganization);
  }

  async get(auth: AuthContext, id: string): Promise<Organization> {
    const row = await organizationRepository.findById(id);
    if (!row || row.id !== auth.organizationId) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }
    return toOrganization(row);
  }

  async update(
    auth: AuthContext,
    id: string,
    input: Partial<Pick<Organization, 'name' | 'logoUrl' | 'primaryColor' | 'buttonColor'>>,
  ): Promise<Organization> {
    if (id !== auth.organizationId) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    await organizationRepository.update(id, {
      name: input.name,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      buttonColor: input.buttonColor,
    });

    const row = await organizationRepository.findById(id);
    return toOrganization(row!);
  }

  async getSdkConfig(auth: AuthContext): Promise<SdkConfig> {
    const org = await organizationRepository.findById(auth.organizationId);
    const config = await sdkConfigRepository.findByOrganization(auth.organizationId);

    return {
      allowedDomains: config?.allowed_domains ?? [],
      callbackUrls: {
        onComplete: config?.callback_on_complete ?? undefined,
        onDecline: config?.callback_on_decline ?? undefined,
      },
      branding: {
        logoUrl: org?.logo_url ?? undefined,
        primaryColor: org?.primary_color ?? undefined,
        buttonColor: org?.button_color ?? undefined,
      },
    };
  }

  async updateSdkConfig(
    auth: AuthContext,
    input: {
      allowedDomains?: string[];
      callbackUrls?: { onComplete?: string; onDecline?: string };
      branding?: { logoUrl?: string; primaryColor?: string; buttonColor?: string };
    },
  ): Promise<SdkConfig> {
    if (input.branding) {
      await organizationRepository.update(auth.organizationId, {
        logoUrl: input.branding.logoUrl,
        primaryColor: input.branding.primaryColor,
        buttonColor: input.branding.buttonColor,
      });
    }

    await sdkConfigRepository.upsert(auth.organizationId, {
      allowedDomains: input.allowedDomains,
      callbackOnComplete: input.callbackUrls?.onComplete,
      callbackOnDecline: input.callbackUrls?.onDecline,
    });

    return this.getSdkConfig(auth);
  }
}

export const organizationService = new OrganizationService();
