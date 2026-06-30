import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createCorsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogMiddleware } from './middleware/request-log.middleware';
import {
  authRateLimiter,
  globalRateLimiter,
  signingRateLimiter,
  uploadRateLimiter,
} from './middleware/security.middleware';
import routes from './routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors(createCorsOptions()));
  app.use(cookieParser());
  app.use(express.json());
  app.use(globalRateLimiter);
  app.use(requestLogMiddleware);
  app.use('/api/v1', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { authRateLimiter, signingRateLimiter, uploadRateLimiter };
