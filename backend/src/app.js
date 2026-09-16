import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, ApiError } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  // Enable CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parser
  app.use(express.json({ limit: '10mb' }));

  // Register all routes
  app.use(routes);

  // Catch-all 404 Route Handler
  app.use('*', (req, res, next) => {
    next(new ApiError(404, 'NOT_FOUND', `Endpoint '${req.originalUrl}' does not exist.`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
