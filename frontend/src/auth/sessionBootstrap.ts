import { API_BASE_URL } from '../config/env'
import { useAuthStore } from '../stores/authStore'
import { getMachineIpHeaders } from '../utils/machineIp'
import type { User } from '../types'

async function fetchCurrentUser(): Promise<User | null> {
  const machineIpHeaders = await getMachineIpHeaders()
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
    headers: {
      ...machineIpHeaders,
    },
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to validate session')
  }

  const body = (await response.json()) as { user: User }
  return body.user
}

async function refreshSession(): Promise<User | null> {
  const machineIpHeaders = await getMachineIpHeaders()
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...machineIpHeaders },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    return null
  }

  const result = (await response.json()) as { user: User }
  return result.user
}

export async function bootstrapAuthSession(): Promise<void> {
  const { login, logout, setSessionValidated } = useAuthStore.getState()

  try {
    const user = await fetchCurrentUser()
    if (user) {
      login(user)
      return
    }

    const refreshedUser = await refreshSession()
    if (refreshedUser) {
      login(refreshedUser)
      return
    }

    logout()
  } catch {
    logout()
  } finally {
    setSessionValidated(true)
  }
}
