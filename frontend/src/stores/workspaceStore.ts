import { create } from 'zustand'
import { organizations } from '../api/mockData'
import type { Organization, TenantContext } from '../types'

interface WorkspaceState {
  organizations: Organization[]
  currentOrganization: Organization
  tenantContext: TenantContext
  setOrganization: (orgId: string) => void
}

const defaultOrg = organizations[0]

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  organizations,
  currentOrganization: defaultOrg,
  tenantContext: {
    organizationId: defaultOrg.id,
    plan: defaultOrg.plan,
    permissions: ['documents:read', 'documents:write', 'teams:manage', 'billing:view', 'api:manage'],
  },
  setOrganization: (orgId) => {
    const org = get().organizations.find((o) => o.id === orgId)
    if (!org) return
    set({
      currentOrganization: org,
      tenantContext: {
        organizationId: org.id,
        plan: org.plan,
        permissions: get().tenantContext.permissions,
      },
    })
  },
}))
