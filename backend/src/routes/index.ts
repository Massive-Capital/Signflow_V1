import { Router } from 'express';
import authRoutes from './auth.routes';
import appRoutes from './app.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use(appRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
