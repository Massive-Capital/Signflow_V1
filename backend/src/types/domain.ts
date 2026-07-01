export type DocumentStatus = 'draft' | 'sent' | 'pending' | 'completed' | 'declined';
export type FieldType =
  | 'signature'
  | 'initial'
  | 'date'
  | 'text'
  | 'number'
  | 'checkbox'
  | 'radio'
  | 'address'
  | 'phone'
  | 'email';
export type RecipientRole = 'buyer' | 'seller' | 'recipient_a' | 'recipient_b' | 'recipient_c';

export type ProfileType =
  | 'individual'
  | 'custodian_ira_401k'
  | 'joint_tenancy'
  | 'llc_corp_partnership_trust_solo_checkbook_ira';
export type WorkflowType = 'parallel' | 'sequential';

export interface Organization {
  id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  logoUrl?: string;
  primaryColor?: string;
  buttonColor?: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: RecipientRole;
  color: string;
  order?: number;
  signed?: boolean;
  signingStatus?: RecipientSigningStatus;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  profileType?: ProfileType;
}

export type RecipientSigningStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'awaiting_countersign';

export interface DocumentField {
  id: string;
  type: FieldType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  recipientId: string;
  required: boolean;
  value?: string;
  options?: string[];
  radioGroupId?: string;
  /** @deprecated Use profileTypes. Kept for backward compatibility. */
  profileType?: ProfileType;
  profileTypes?: ProfileType[];
  /** Content hash of the page where this field was placed (stable across profile preview). */
  pageHash?: string;
  /** Template page number (1-based) where the sponsor placed the field. */
  templatePage?: number;
}

export interface Document {
  id: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  organizationId: string;
  pages: number;
  fileName?: string;
  fileUrl?: string;
  fileHash?: string;
  signedFileHash?: string;
  workflowType?: WorkflowType;
  emailSubject?: string;
  emailMessage?: string;
  emailAttachments?: EmailAttachment[];
  recipients: Recipient[];
  fields: DocumentField[];
  hasUnsentChanges?: boolean;
}

export interface EmailAttachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DashboardStats {
  documentsSent: number;
  completed: number;
  pending: number;
  apiCalls: number;
  embeddedSessions: number;
  monthlyUsage: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited';
  lastActive?: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  environment: 'production' | 'sandbox';
  createdAt: string;
  lastUsedAt?: string;
  permissions: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  retries: number;
  active: boolean;
}

export interface UsageSummary {
  apiCalls: number;
  embeddedSessions: number;
  documentsSigned: number;
  limit: number;
}

export interface SdkConfig {
  allowedDomains: string[];
  callbackUrls: {
    onComplete?: string;
    onDecline?: string;
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    buttonColor?: string;
  };
}

export interface AuthContext {
  authType: 'user' | 'api_key';
  organizationId: string;
  permissions: string[];
  userId?: string;
  apiKeyId?: string;
  role?: 'owner' | 'admin' | 'member';
}
