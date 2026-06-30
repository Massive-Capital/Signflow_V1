import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  hasHydrated: boolean
  sessionValidated: boolean
  login: (user: User) => void
  logout: () => void
  setHasHydrated: (value: boolean) => void
  setSessionValidated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      sessionValidated: false,
      login: (user) => set({ user, isAuthenticated: true, sessionValidated: true }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionValidated: true,
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSessionValidated: (value) => set({ sessionValidated: value }),
    }),
    {
      name: 'signflow-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

export function useAuthReady(): boolean {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const sessionValidated = useAuthStore((s) => s.sessionValidated)
  return hasHydrated && sessionValidated
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated)
}
