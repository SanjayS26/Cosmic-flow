import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { pathToFileURL } from 'node:url';
import { checkDatabaseHealth } from './config/database.js';
import { createCorsOptions, parseAllowedOrigins } from './middleware/cors.js';
import {
  createErrorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';
import { createApiRouter } from './routes/api.js';

dotenv.config({ quiet: true });

export function createApp({
  allowedOrigins = parseAllowedOrigins(),
  bodyLimit = process.env.JSON_BODY_LIMIT || '20kb',
  environment = process.env.NODE_ENV,
  databaseHealthCheck = checkDatabaseHealth,
  apiDependencies = {},
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors(createCorsOptions(allowedOrigins)));
  app.use(cookieParser());
  app.use(express.json({ limit: bodyLimit }));

  app.get('/health', async (req, res) => {
    try {
      await databaseHealthCheck();
      return res.json({
        success: true,
        services: { api: 'healthy', database: 'healthy' },
      });
    } catch {
      return res.status(503).json({
        success: false,
        services: { api: 'healthy', database: 'unhealthy' },
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'The database is unavailable.',
        },
      });
    }
  });

  app.use('/api', createApiRouter(apiDependencies));
  app.use(notFoundHandler);
  app.use(createErrorHandler(environment));

  return app;
}

export function startServer(port = process.env.PORT || 3000) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer();
}
