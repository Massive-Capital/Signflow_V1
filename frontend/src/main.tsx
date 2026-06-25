import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { applyTheme, useThemeStore } from './stores/themeStore'
import './api/embedAuth'
import './App.css'
import './index.css'
import './components/ui/components.css'
import './components/layouts/layouts.css'
import './pages/documents/builder.css'
import './signing-engine/signing.css'
import './pages/pages.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

applyTheme(useThemeStore.getState().mode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
