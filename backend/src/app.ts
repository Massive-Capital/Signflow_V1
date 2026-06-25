import cors from 'cors';
import express from 'express';
import { createCorsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogMiddleware } from './middleware/request-log.middleware';
import { DOCUMENT_UPLOAD_DIR } from './middleware/upload.middleware';
import routes from './routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.use(cors(createCorsOptions()));
  app.use(express.json());
  app.use(requestLogMiddleware);
  app.use('/api/v1/files/documents', express.static(DOCUMENT_UPLOAD_DIR));
  app.use('/api/v1', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
