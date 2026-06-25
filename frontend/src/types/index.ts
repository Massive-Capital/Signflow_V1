export type FieldType =
  | 'signature'
  | 'initial'
  | 'date'
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'address'
  | 'phone'
  | 'email'

export type RecipientRole = 'buyer' | 'seller' | 'recipient_a' | 'recipient_b' | 'recipient_c'

export type ProfileType =
  | 'individual'
  | 'custodian_ira_401k'
  | 'joint_tenancy'
  | 'llc_corp_partnership_trust_solo_checkbook_ira'

export type DocumentStatus = 'draft' | 'sent' | 'pending' | 'completed' | 'declined'

export type WorkflowType = 'parallel' | 'sequential'

export interface EmailAttachment {
  id: string
  originalName: string
  fileName: string
  mimeType: string
  size: number
}

export interface Organization {
  id: string
  name: string
  plan: 'starter' | 'professional' | 'enterprise'
  logoUrl?: string
  primaryColor?: string
  buttonColor?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'member'
  organizationId: string
}

export interface DocumentField {
  id: string
  type: FieldType
  label: string
  x: number
  y: number
  width: number
  height: number
  page: number
  recipientId: string
  required: boolean
  value?: string
  options?: string[]
  radioGroupId?: string
  /** @deprecated Use profileTypes */
  profileType?: ProfileType
  profileTypes?: ProfileType[]
  pageHash?: string
  templatePage?: number
}

export type RecipientSigningStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'awaiting_countersign'

export interface Recipient {
  id: string
  name: string
  email: string
  role: RecipientRole
  color: string
  order?: number
  signed?: boolean
  signingStatus?: RecipientSigningStatus
  sentAt?: string
  viewedAt?: string
  signedAt?: string
  profileType?: ProfileType
}

export interface Document {
  id: string
  title: string
  status: DocumentStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
  recipients: Recipient[]
  fields: DocumentField[]
  organizationId: string
  pages: number
  fileName?: string
  fileUrl?: string
  fileHash?: string
  signedFileHash?: string
  workflowType?: WorkflowType
  emailSubject?: string
  emailMessage?: string
  emailAttachments?: EmailAttachment[]
  hasUnsentChanges?: boolean
}

export interface ApiKey {
  id: string
  name: string
  key: string
  environment: 'production' | 'sandbox'
  createdAt: string
  lastUsedAt?: string
  permissions: string[]
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  retries: number
  active: boolean
}

export interface DashboardStats {
  documentsSent: number
  completed: number
  pending: number
  apiCalls: number
  embeddedSessions: number
  monthlyUsage: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'invited'
  lastActive?: string
}

export interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending'
}

export interface TenantContext {
  organizationId: string
  plan: Organization['plan']
  permissions: string[]
}

export type SigningMode = 'public' | 'embedded' | 'iframe'

export interface SigningSession {
  documentId: string
  token: string
  recipientId: string
  mode: SigningMode
  branding?: {
    logoUrl?: string
    primaryColor?: string
    buttonColor?: string
  }
}

export interface SigningEvent {
  event: 'loaded' | 'signed' | 'completed' | 'declined' | 'closed' | 'error'
  documentId: string
  data?: Record<string, unknown>
}
