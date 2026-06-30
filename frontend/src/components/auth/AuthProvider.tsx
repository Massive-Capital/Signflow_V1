import { useEffect } from 'react'
import { bootstrapAuthSession } from '../../auth/sessionBootstrap'
import { useAuthStore } from '../../stores/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const sessionValidated = useAuthStore((s) => s.sessionValidated)

  useEffect(() => {
    if (!hasHydrated || sessionValidated) return
    void bootstrapAuthSession()
  }, [hasHydrated, sessionValidated])

  return children
}
