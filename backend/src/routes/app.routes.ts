import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { loadAuthContext, requirePermission, requireUserAuth } from '../middleware/user-context.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { validateCreateDocument } from '../middleware/document-create.middleware';
import { dashboardController } from '../controllers/dashboard.controller';
import { documentController } from '../controllers/document.controller';
import { teamController } from '../controllers/team.controller';
import { billingController } from '../controllers/billing.controller';
import { apiKeyController } from '../controllers/api-key.controller';
import { webhookController } from '../controllers/webhook.controller';
import { signingController } from '../controllers/signing.controller';
import { embedController } from '../controllers/embed.controller';
import { organizationController } from '../controllers/organization.controller';
import {
  completeSigningSchema,
  createApiKeySchema,
  createWebhookSchema,
  setSigningProfileSchema,
  updateDocumentSchema,
  updateOrganizationSchema,
  updateSdkConfigSchema,
} from '../validators/app.validators';
import {
  documentUpload,
  emailAttachmentUpload,
  handleUploadError,
  optionalCreateDocumentUpload,
} from '../middleware/upload.middleware';

const router = Router();
const auth = [authenticate, loadAuthContext];
const userAuth = [...auth, requireUserAuth];

router.get('/dashboard/stats', ...userAuth, dashboardController.getStats);

router.get('/documents', ...auth, requirePermission('documents:read'), documentController.list);
router.get(
  '/documents/:id/preview',
  ...auth,
  requirePermission('documents:read'),
  documentController.previewSigned,
);
router.get(
  '/documents/:id/download',
  ...auth,
  requirePermission('documents:read'),
  documentController.downloadSigned,
);
router.get(
  '/documents/:id/recipients/:recipientId/preview',
  ...auth,
  requirePermission('documents:read'),
  documentController.previewRecipient,
);
router.get(
  '/documents/:id/recipients/:recipientId/download',
  ...auth,
  requirePermission('documents:read'),
  documentController.downloadRecipient,
);
router.get(
  '/documents/:id/file',
  ...auth,
  requirePermission('documents:read'),
  documentController.serveOriginal,
);
router.get('/documents/:id', ...auth, requirePermission('documents:read'), documentController.get);
router.post(
  '/documents/:id/embed/signing-session',
  ...auth,
  requirePermission('documents:read'),
  embedController.createSigningSession,
);
router.post(
  '/documents',
  ...auth,
  requirePermission('documents:write'),
  optionalCreateDocumentUpload,
  handleUploadError,
  validateCreateDocument,
  documentController.create,
);
router.patch(
  '/documents/:id',
  ...auth,
  requirePermission('documents:write'),
  validateBody(updateDocumentSchema),
  documentController.update,
);
router.delete(
  '/documents/:id',
  ...auth,
  requirePermission('documents:write'),
  documentController.delete,
);
router.post(
  '/documents/:id/file',
  ...auth,
  requirePermission('documents:write'),
  documentUpload.single('file'),
  handleUploadError,
  documentController.uploadFile,
);
router.post(
  '/documents/:id/email-attachments',
  ...auth,
  requirePermission('documents:write'),
  emailAttachmentUpload.single('file'),
  handleUploadError,
  documentController.uploadEmailAttachment,
);
router.delete(
  '/documents/:id/email-attachments/:attachmentId',
  ...auth,
  requirePermission('documents:write'),
  documentController.deleteEmailAttachment,
);

router.get('/teams/members', ...userAuth, teamController.list);

router.get(
  '/billing/invoices',
  ...userAuth,
  requirePermission('billing:view'),
  billingController.getInvoices,
);
router.get(
  '/billing/usage',
  ...userAuth,
  requirePermission('billing:view'),
  billingController.getUsage,
);

router.get('/api-keys', ...userAuth, requirePermission('api:manage'), apiKeyController.list);
router.post(
  '/api-keys',
  ...userAuth,
  requirePermission('api:manage'),
  validateBody(createApiKeySchema),
  apiKeyController.create,
);

router.get('/webhooks', ...userAuth, requirePermission('api:manage'), webhookController.list);
router.post(
  '/webhooks',
  ...userAuth,
  requirePermission('api:manage'),
  validateBody(createWebhookSchema),
  webhookController.create,
);

router.get('/signing/sessions/:token/file', signingController.serveDocument);
router.get('/signing/sessions/:token', signingController.getSession);
router.post(
  '/signing/sessions/:token/complete',
  validateBody(completeSigningSchema),
  signingController.complete,
);
router.post('/signing/sessions/:token/decline', signingController.decline);
router.get('/signing/sessions/:token/download', signingController.download);
router.get('/signing/sessions/:token/preview', signingController.preview);
router.post(
  '/signing/sessions/:token/profile',
  validateBody(setSigningProfileSchema),
  signingController.setProfile,
);

router.get('/organizations', ...userAuth, organizationController.list);
router.get('/organizations/:id', ...userAuth, organizationController.get);
router.patch(
  '/organizations/:id',
  ...userAuth,
  validateBody(updateOrganizationSchema),
  organizationController.update,
);

router.get('/sdk-config', ...userAuth, requirePermission('api:manage'), organizationController.getSdkConfig);
router.patch(
  '/sdk-config',
  ...userAuth,
  requirePermission('api:manage'),
  validateBody(updateSdkConfigSchema),
  organizationController.updateSdkConfig,
);

export default router;
