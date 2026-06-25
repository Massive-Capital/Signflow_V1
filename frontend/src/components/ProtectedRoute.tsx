import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from './common/LoadingState'
import { useAuthStore } from '../stores/authStore'

export function ProtectedRoute() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!hasHydrated) {
    return <LoadingState message="Loading session..." />
  }

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicRoute() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!hasHydrated) {
    return <LoadingState message="Loading session..." />
  }

  if (isAuthenticated && accessToken) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
