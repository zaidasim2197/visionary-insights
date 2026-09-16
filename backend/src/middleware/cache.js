import { redactViewerData } from './roleGuard.js';
import { env } from '../config/env.js';

// In-memory cache store
const cacheMap = new Map();

/**
 * In-memory response caching middleware with TTL
 */
export const cacheMiddleware = (ttlSeconds = env.KPI_CACHE_TTL_SECONDS) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userRole = req.user?.role || 'Public';
    const cacheKey = `${req.method}:${req.baseUrl}${req.path}:${JSON.stringify(req.query)}:${userRole}`;
    const cachedEntry = cacheMap.get(cacheKey);

    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedEntry.payload);
    }

    // Override res.json to capture and cache the payload
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Apply Viewer redaction if applicable
      const sanitizedBody = req.user?.role === 'Viewer' ? redactViewerData(body, 'Viewer') : body;

      // Add generatedAt and recordCount if not present
      if (sanitizedBody && typeof sanitizedBody === 'object' && !sanitizedBody.error) {
        if (!sanitizedBody.generatedAt) {
          sanitizedBody.generatedAt = new Date().toISOString();
        }
        if (sanitizedBody.recordCount === undefined) {
          if (Array.isArray(sanitizedBody.data)) {
            sanitizedBody.recordCount = sanitizedBody.data.length;
          } else if (sanitizedBody.data && typeof sanitizedBody.data === 'object') {
            sanitizedBody.recordCount = 1;
          }
        }
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheMap.set(cacheKey, {
          payload: sanitizedBody,
          expiresAt: Date.now() + ttlSeconds * 1000
        });
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson(sanitizedBody);
    };

    next();
  };
};

/**
 * Clears the cache completely (used after import or seed)
 */
export const invalidateCache = () => {
  cacheMap.clear();
  console.log('[Cache] In-memory KPI cache invalidated.');
};
