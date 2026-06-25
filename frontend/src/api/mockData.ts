import type {
  ApiKey,
  DashboardStats,
  Document,
  Invoice,
  Organization,
  TeamMember,
  Webhook,
} from '../types'

export const organizations: Organization[] = [
  { id: 'org_acme', name: 'Acme Corp', plan: 'professional', primaryColor: '#2563eb' },
  { id: 'org_technova', name: 'TechNova', plan: 'enterprise', primaryColor: '#7c3aed' },
  { id: 'org_global', name: 'Global Corp', plan: 'starter', primaryColor: '#0891b2' },
]

export const dashboardStats: DashboardStats = {
  documentsSent: 248,
  completed: 186,
  pending: 42,
  apiCalls: 12450,
  embeddedSessions: 892,
  monthlyUsage: 78,
}

export const documents: Document[] = [
  {
    id: 'doc_001',
    title: 'NDA - TechNova Partnership',
    status: 'pending',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-10T14:30:00Z',
    organizationId: 'org_acme',
    pages: 3,
    recipients: [
      { id: 'rec_1', name: 'Jane Investor', email: 'jane@investor.com', role: 'buyer', color: '#dc2626', order: 1 },
      { id: 'rec_2', name: 'John Sponsor', email: 'john@sponsor.com', role: 'seller', color: '#2563eb', order: 2 },
    ],
    fields: [
      { id: 'f1', type: 'signature', label: 'Buyer Signature', x: 10, y: 70, width: 30, height: 8, page: 1, recipientId: 'rec_1', required: true },
      { id: 'f2', type: 'signature', label: 'Seller Signature', x: 55, y: 70, width: 30, height: 8, page: 1, recipientId: 'rec_2', required: true },
      { id: 'f3', type: 'date', label: 'Date Signed', x: 10, y: 82, width: 20, height: 5, page: 1, recipientId: 'rec_1', required: true },
      { id: 'f4', type: 'text', label: 'Company Name', x: 10, y: 30, width: 40, height: 5, page: 1, recipientId: 'rec_1', required: true },
    ],
  },
  {
    id: 'doc_002',
    title: 'Employment Agreement - Q2 Hire',
    status: 'completed',
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-05-20T16:00:00Z',
    organizationId: 'org_acme',
    pages: 5,
    recipients: [
      { id: 'rec_3', name: 'Alex Chen', email: 'alex@example.com', role: 'recipient_a', color: '#db2777' },
    ],
    fields: [
      { id: 'f5', type: 'signature', label: 'Employee Signature', x: 10, y: 85, width: 35, height: 8, page: 5, recipientId: 'rec_3', required: true },
      { id: 'f6', type: 'initial', label: 'Initial Page 1', x: 80, y: 90, width: 10, height: 5, page: 1, recipientId: 'rec_3', required: true },
    ],
  },
  {
    id: 'doc_003',
    title: 'Vendor Service Agreement',
    status: 'draft',
    createdAt: '2026-06-11T11:00:00Z',
    updatedAt: '2026-06-11T11:00:00Z',
    organizationId: 'org_acme',
    pages: 2,
    recipients: [],
    fields: [],
  },
  {
    id: 'doc_004',
    title: 'Sales Contract - Global Corp',
    status: 'sent',
    createdAt: '2026-06-08T08:00:00Z',
    updatedAt: '2026-06-09T12:00:00Z',
    organizationId: 'org_acme',
    pages: 4,
    recipients: [
      { id: 'rec_4', name: 'Maria Garcia', email: 'maria@globalcorp.com', role: 'buyer', color: '#dc2626' },
      { id: 'rec_5', name: 'Tom Wilson', email: 'tom@acme.com', role: 'seller', color: '#2563eb' },
    ],
    fields: [
      { id: 'f7', type: 'signature', label: 'Buyer Signature', x: 10, y: 75, width: 30, height: 8, page: 4, recipientId: 'rec_4', required: true },
      { id: 'f8', type: 'email', label: 'Contact Email', x: 10, y: 40, width: 35, height: 5, page: 1, recipientId: 'rec_4', required: true },
    ],
  },
]

export const teamMembers: TeamMember[] = [
  { id: 'tm_1', name: 'Sarah Admin', email: 'sarah@acme.com', role: 'Owner', status: 'active', lastActive: '2026-06-12T06:00:00Z' },
  { id: 'tm_2', name: 'Mike Developer', email: 'mike@acme.com', role: 'Admin', status: 'active', lastActive: '2026-06-11T18:00:00Z' },
  { id: 'tm_3', name: 'Lisa Member', email: 'lisa@acme.com', role: 'Member', status: 'active', lastActive: '2026-06-10T09:00:00Z' },
  { id: 'tm_4', name: 'Pending User', email: 'new@acme.com', role: 'Member', status: 'invited' },
]

export const apiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production API',
    key: 'pk_live_xxxxxxxxxxxx',
    environment: 'production',
    createdAt: '2026-01-15T00:00:00Z',
    lastUsedAt: '2026-06-12T05:30:00Z',
    permissions: ['documents:read', 'documents:write', 'signing:create'],
  },
  {
    id: 'key_2',
    name: 'Sandbox Testing',
    key: 'pk_test_yyyyyyyyyyyy',
    environment: 'sandbox',
    createdAt: '2026-03-01T00:00:00Z',
    lastUsedAt: '2026-06-11T22:00:00Z',
    permissions: ['documents:read', 'signing:create'],
  },
]

export const webhooks: Webhook[] = [
  {
    id: 'wh_1',
    url: 'https://api.acme.com/webhooks/signflow',
    events: ['document.completed', 'document.declined'],
    secret: 'whsec_xxxxxxxx',
    retries: 3,
    active: true,
  },
  {
    id: 'wh_2',
    url: 'https://staging.acme.com/hooks/signing',
    events: ['document.sent', 'document.viewed'],
    secret: 'whsec_yyyyyyyy',
    retries: 5,
    active: false,
  },
]

export const invoices: Invoice[] = [
  { id: 'inv_001', date: '2026-06-01', amount: 299, status: 'paid' },
  { id: 'inv_002', date: '2026-05-01', amount: 299, status: 'paid' },
  { id: 'inv_003', date: '2026-04-01', amount: 299, status: 'paid' },
]

export const signingTokens: Record<string, { documentId: string; recipientId: string }> = {
  abcdef123: { documentId: 'doc_001', recipientId: 'rec_1' },
}
