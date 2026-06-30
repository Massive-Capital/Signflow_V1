import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/security.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validators';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', authRateLimiter, validateBody(refreshSchema), authController.refresh);
router.post('/logout', validateBody(logoutSchema), authController.logout);
router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', authRateLimiter, validateBody(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  authRateLimiter,
  validateBody(resendVerificationSchema),
  authController.resendVerification,
);
router.get('/me', authenticate, authController.me);

export default router;
