import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '../components/layouts/DashboardLayout'
import { ProtectedRoute, PublicRoute, RootRedirect } from '../components/ProtectedRoute'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { DocumentsPage } from '../pages/documents/DocumentsPage'
import { CreateDocumentPage } from '../pages/documents/CreateDocumentPage'
import { DocumentViewPage } from '../pages/documents/DocumentViewPage'
import { DocumentBuilderRoute } from './DocumentBuilderRoute'
import { SendWorkflowPage } from '../pages/documents/SendWorkflowPage'
import { TeamsPage } from '../pages/teams/TeamsPage'
import { BillingPage } from '../pages/billing/BillingPage'
import { ApiKeysPage } from '../pages/api/ApiKeysPage'
import { WebhooksPage } from '../pages/api/WebhooksPage'
import { SdkConfigPage } from '../pages/api/SdkConfigPage'
import { DeveloperPortalPage } from '../pages/developer/DeveloperPortalPage'
import { PlaygroundPage } from '../pages/developer/PlaygroundPage'
import { AccountPage } from '../pages/account/AccountPage'
import { CompletionPage } from '../pages/signing/CompletionPage'
import { SignDocumentPage } from '../pages/signing/SignDocumentPage'
import { EmbedBuilderPage } from '../pages/embed/EmbedBuilderPage'
import { EmbedSignPage } from '../pages/embed/EmbedSignPage'

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/new" element={<CreateDocumentPage />} />
        <Route path="/documents/:id" element={<DocumentViewPage />} />
        <Route path="/documents/:id/builder" element={<DocumentBuilderRoute />} />
        <Route path="/documents/:id/send" element={<SendWorkflowPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/sdk-config" element={<SdkConfigPage />} />
        <Route path="/developer" element={<DeveloperPortalPage />} />
        <Route path="/developer/playground" element={<PlaygroundPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/sign/:token" element={<SignDocumentPage />} />
        <Route path="/sign/:token/complete" element={<CompletionPage />} />
        <Route path="/embed/documents/:id/builder" element={<EmbedBuilderPage />} />
        <Route path="/embed/sign/:token" element={<EmbedSignPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<DashboardRoutes />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
