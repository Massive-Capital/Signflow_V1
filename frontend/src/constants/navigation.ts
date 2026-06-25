import {
  BarChart3,
  Code2,
  CreditCard,
  FilePlus2,
  FileText,
  Hammer,
  KeyRound,
  Send,
  Settings,
  UserRound,
  Users,
  Webhook,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/api-keys', label: 'API Keys', icon: KeyRound },
  { path: '/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/developer', label: 'Developer Portal', icon: Code2 },
]

export interface PageContext {
  section: string
  sectionPath: string
  title: string
  icon: LucideIcon
}

export function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/'
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

export function getPageContext(pathname: string): PageContext {
  const documents: PageContext = {
    section: 'Documents',
    sectionPath: '/documents',
    title: 'Documents',
    icon: FileText,
  }

  if (pathname.startsWith('/documents/new')) {
    return { ...documents, title: 'Create Document', icon: FilePlus2 }
  }

  if (/^\/documents\/[^/]+\/builder$/.test(pathname)) {
    return { ...documents, title: 'Document Builder', icon: Hammer }
  }

  if (/^\/documents\/[^/]+\/send$/.test(pathname)) {
    return { ...documents, title: 'Send Document', icon: Send }
  }

  if (/^\/documents\/[^/]+$/.test(pathname)) {
    return { ...documents, title: 'Document Details' }
  }

  if (pathname.startsWith('/documents')) {
    return documents
  }

  if (pathname.startsWith('/developer/playground')) {
    return {
      section: 'Developer Portal',
      sectionPath: '/developer',
      title: 'Interactive Playground',
      icon: Code2,
    }
  }

  if (pathname.startsWith('/developer')) {
    return {
      section: 'Developer Portal',
      sectionPath: '/developer',
      title: 'Developer Portal',
      icon: Code2,
    }
  }

  if (pathname.startsWith('/teams')) {
    return { section: 'Teams', sectionPath: '/teams', title: 'Teams', icon: Users }
  }

  if (pathname.startsWith('/billing')) {
    return { section: 'Billing', sectionPath: '/billing', title: 'Billing', icon: CreditCard }
  }

  if (pathname.startsWith('/api-keys')) {
    return { section: 'API Keys', sectionPath: '/api-keys', title: 'API Keys', icon: KeyRound }
  }

  if (pathname.startsWith('/webhooks')) {
    return { section: 'Webhooks', sectionPath: '/webhooks', title: 'Webhooks', icon: Webhook }
  }

  if (pathname.startsWith('/sdk-config')) {
    return {
      section: 'Developer Portal',
      sectionPath: '/developer',
      title: 'SDK Configuration',
      icon: Settings,
    }
  }

  if (pathname.startsWith('/account')) {
    return {
      section: 'Account',
      sectionPath: '/account',
      title: 'My Account',
      icon: UserRound,
    }
  }

  return {
    section: 'Dashboard',
    sectionPath: '/dashboard',
    title: 'Dashboard',
    icon: BarChart3,
  }
}
