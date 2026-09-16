import { Router } from 'express';
import authRoutes from './auth.routes.js';
import salesRoutes from './sales.routes.js';
import ordersRoutes from './orders.routes.js';
import inventoryRoutes from './inventory.routes.js';
import receivablesRoutes from './receivables.routes.js';
import analyticsRoutes from './analytics.routes.js';
import importRoutes from './import.routes.js';

const router = Router();

// Root API status endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'VisionPulse — Sales & Operations Dashboard API',
    version: '1.0.0',
    documentation: '/api/v1',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      sales: '/api/v1/sales',
      orders: '/api/v1/orders',
      inventory: '/api/v1/inventory',
      receivables: '/api/v1/receivables',
      analytics: '/api/v1/analytics',
      import: '/api/v1/import'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sales-operations-dashboard-backend',
    timestamp: new Date().toISOString()
  });
});

// API v1 routers
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/sales', salesRoutes);
router.use('/api/v1/orders', ordersRoutes);
router.use('/api/v1/inventory', inventoryRoutes);
router.use('/api/v1/receivables', receivablesRoutes);
router.use('/api/v1/analytics', analyticsRoutes);
router.use('/api/v1/import', importRoutes);

export default router;
