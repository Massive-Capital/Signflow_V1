import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from './common/LoadingState'
import { useAuthReady, useIsAuthenticated } from '../stores/authStore'

export function ProtectedRoute() {
  const authReady = useAuthReady()
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  if (!authReady) {
    return <LoadingState fullPage />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function PublicRoute() {
  const authReady = useAuthReady()
  const isAuthenticated = useIsAuthenticated()

  if (!authReady) {
    return <LoadingState fullPage />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function RootRedirect() {
  const authReady = useAuthReady()
  const isAuthenticated = useIsAuthenticated()

  if (!authReady) {
    return <LoadingState fullPage />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}
