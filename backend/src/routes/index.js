import { Router } from 'express';
import authRoutes from './auth.routes.js';
import salesRoutes from './sales.routes.js';
import ordersRoutes from './orders.routes.js';
import inventoryRoutes from './inventory.routes.js';
import receivablesRoutes from './receivables.routes.js';
import analyticsRoutes from './analytics.routes.js';
import importRoutes from './import.routes.js';

const router = Router();

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
