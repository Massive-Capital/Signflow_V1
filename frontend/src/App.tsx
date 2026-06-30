import { AppRoutes } from './routes/AppRoutes'
import { Toaster } from './components/ui/Toaster'
import { AuthProvider } from './components/auth/AuthProvider'

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  )
}
