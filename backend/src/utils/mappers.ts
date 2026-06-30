import type {
  ApiKey,
  Document,
  DocumentField,
  EmailAttachment,
  Invoice,
  Organization,
  ProfileType,
  Recipient,
  TeamMember,
  Webhook,
} from '../types/domain';
import type { OrganizationRow, UserRow } from '../types';
import { formatDisplayRole } from './permissions';

export interface DocumentRow {
  id: string;
  organization_id: string;
  title: string;
  status: string;
  pages: number;
  file_name: string | null;
  file_hash: string | null;
  signed_file_hash: string | null;
  sent_content_hash: string | null;
  workflow_type: string | null;
  email_subject: string | null;
  email_message: string | null;
  email_attachments: EmailAttachmentMeta[] | null;
  sent_at: Date | null;
  sent_ip: string | null;
  sent_by_name: string | null;
  sent_by_email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EmailAttachmentMeta {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface RecipientRow {
  id: string;
  document_id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  order_index: number | null;
  profile_type: string | null;
  status: string;
  last_active: Date | null;
}

export interface FieldRow {
  id: string;
  document_id: string;
  recipient_id: string;
  type: string;
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
  page: number;
  required: boolean;
  value: string | null;
  options: string[] | null;
  radio_group_id: string | null;
  profile_type: string | null;
  profile_types: ProfileType[] | null;
  page_hash: string | null;
  template_page: number | null;
}

export interface ApiKeyRow {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  environment: 'production' | 'sandbox';
  permissions: string[];
  last_used_at: Date | null;
  created_at: Date;
}

export interface WebhookRow {
  id: string;
  organization_id: string;
  url: string;
  events: string[];
  secret_hash: string;
  secret_ciphertext: string | null;
  retries: number;
  active: boolean;
  created_at: Date;
}

export interface InvoiceRow {
  id: string;
  organization_id: string;
  invoice_date: Date;
  amount: string;
  status: 'paid' | 'pending';
}

export function toOrganization(row: OrganizationRow & {
  logo_url?: string | null;
  primary_color?: string | null;
  button_color?: string | null;
}): Organization {
  return {
    id: row.id,
    name: row.name,
    plan: row.plan as Organization['plan'],
    logoUrl: row.logo_url ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    buttonColor: row.button_color ?? undefined,
  };
}

export function toRecipient(row: RecipientRow): Recipient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Recipient['role'],
    color: row.color,
    order: row.order_index ?? undefined,
    profileType: (row.profile_type as Recipient['profileType']) ?? undefined,
  };
}

function parseFieldProfileTypes(row: FieldRow): DocumentField['profileTypes'] {
  let raw: unknown = row.profile_types;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as ProfileType[];
  }
  if (row.profile_type) {
    return [row.profile_type as ProfileType];
  }
  return undefined;
}

export function toDocumentField(row: FieldRow): DocumentField {
  const profileTypes = parseFieldProfileTypes(row);

  return {
    id: row.id,
    type: row.type as DocumentField['type'],
    label: row.label,
    x: Number(row.x),
    y: Number(row.y),
    width: Number(row.width),
    height: Number(row.height),
    page: row.page,
    recipientId: row.recipient_id,
    required: row.required,
    value: row.value ?? undefined,
    options: row.options ?? undefined,
    radioGroupId: row.radio_group_id ?? undefined,
    profileTypes,
    profileType: profileTypes?.length === 1 ? profileTypes[0] : undefined,
    pageHash: row.page_hash ?? undefined,
    templatePage: row.template_page ?? row.page,
  };
}

export function toEmailAttachment(meta: EmailAttachmentMeta): EmailAttachment {
  return {
    id: meta.id,
    fileName: meta.fileName,
    originalName: meta.originalName,
    mimeType: meta.mimeType,
    size: meta.size,
  };
}

export function toDocument(
  row: DocumentRow,
  recipients: RecipientRow[],
  fields: FieldRow[],
  options?: { hasUnsentChanges?: boolean },
): Document {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Document['status'],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    organizationId: row.organization_id,
    pages: row.pages,
    fileName: row.file_name ?? undefined,
    fileUrl: row.file_name ? `/api/v1/documents/${row.id}/file` : undefined,
    fileHash: row.file_hash ?? undefined,
    signedFileHash: row.signed_file_hash ?? undefined,
    workflowType: (row.workflow_type as Document['workflowType']) ?? undefined,
    emailSubject: row.email_subject ?? undefined,
    emailMessage: row.email_message ?? undefined,
    emailAttachments: (row.email_attachments ?? []).map(toEmailAttachment),
    recipients: recipients.map(toRecipient),
    fields: fields.map(toDocumentField),
    hasUnsentChanges: options?.hasUnsentChanges,
  };
}

export function toTeamMember(user: UserRow): TeamMember {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: formatDisplayRole(user.role),
    status: 'active',
    lastActive: user.updated_at.toISOString(),
  };
}

export function toApiKey(row: ApiKeyRow, plainKey?: string): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key: plainKey ?? `${row.key_prefix}_xxxxxxxxxxxx`,
    environment: row.environment,
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString(),
    permissions: row.permissions,
  };
}

export function toWebhook(row: WebhookRow, plainSecret?: string): Webhook {
  return {
    id: row.id,
    url: row.url,
    events: row.events,
    secret: plainSecret ?? 'whsec_xxxxxxxx',
    retries: row.retries,
    active: row.active,
  };
}

export function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    date: row.invoice_date.toISOString().slice(0, 10),
    amount: Number(row.amount),
    status: row.status,
  };
}
