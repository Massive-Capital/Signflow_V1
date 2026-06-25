import { z } from 'zod';

const documentStatus = z.enum(['draft', 'sent', 'pending', 'completed', 'declined']);

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  pages: z.number().int().positive().optional(),
});

const profileType = z.enum([
  'individual',
  'custodian_ira_401k',
  'joint_tenancy',
  'llc_corp_partnership_trust_solo_checkbook_ira',
]);

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  status: documentStatus.optional(),
  pages: z.number().int().positive().optional(),
  workflowType: z.enum(['parallel', 'sequential']).optional(),
  emailSubject: z.string().max(500).optional(),
  emailMessage: z.string().max(50000).optional(),
  recipients: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        email: z.string().email(),
        role: z.string(),
        color: z.string(),
        order: z.number().int().optional(),
        profileType: profileType.optional(),
      }),
    )
    .optional(),
  fields: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        label: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        page: z.number().int(),
        recipientId: z.string(),
        required: z.boolean(),
        value: z.string().optional(),
        options: z.array(z.string().min(1)).optional(),
        radioGroupId: z.string().optional(),
        profileType: profileType.optional(),
        profileTypes: z.array(profileType).optional(),
      }),
    )
    .optional(),
});

export const listDocumentsSchema = z.object({
  status: documentStatus.optional(),
  search: z.string().optional(),
});

export const completeSigningSchema = z.object({
  fieldValues: z.record(z.string(), z.string()).optional(),
});

export const setSigningProfileSchema = z.object({
  profileType,
});

export const createApiKeySchema = z.object({
  name: z.string().min(1),
  environment: z.enum(['production', 'sandbox']),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  buttonColor: z.string().optional(),
});

export const updateSdkConfigSchema = z.object({
  allowedDomains: z.array(z.string()).optional(),
  callbackUrls: z
    .object({
      onComplete: z.string().url().optional(),
      onDecline: z.string().url().optional(),
    })
    .optional(),
  branding: z
    .object({
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional(),
      buttonColor: z.string().optional(),
    })
    .optional(),
});
