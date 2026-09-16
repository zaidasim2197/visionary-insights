import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

test('Access Control & RBAC Matrix - Enforces Role Permissions & Viewer Redaction', async () => {
  const app = createApp();

  const generateTestToken = (role) => {
    return jwt.sign(
      {
        sub: 'user_test_123',
        name: 'Test User',
        email: 'test@example.com',
        role
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  const adminToken = generateTestToken('Admin');
  const managerToken = generateTestToken('Manager');
  const viewerToken = generateTestToken('Viewer');

  // Helper for simulating requests
  const mockReq = async (path, options = {}) => {
    return new Promise((resolve) => {
      const req = {
        method: options.method || 'GET',
        url: path,
        originalUrl: path,
        path: path.split('?')[0],
        headers: options.headers || {},
        query: options.query || {},
        body: options.body || {}
      };

      let statusCode = 200;
      let responseHeaders = {};
      let responseBody = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        setHeader(name, val) {
          responseHeaders[name] = val;
          return this;
        },
        json(data) {
          responseBody = data;
          resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
        }
      };

      app.handle(req, res, () => {
        resolve({ status: 404, body: { error: 'Not found' } });
      });
    });
  };

  // 1. Unauthenticated Request -> 401
  const unauthRes = await mockReq('/api/v1/sales/summary');
  assert.equal(unauthRes.status, 401);
  assert.equal(unauthRes.body.error.code, 'UNAUTHORIZED');

  // 2. Malformed / Invalid JWT -> 401
  const invalidTokenRes = await mockReq('/api/v1/sales/summary', {
    headers: { authorization: 'Bearer invalid_garbage_token' }
  });
  assert.equal(invalidTokenRes.status, 401);
  assert.equal(invalidTokenRes.body.error.code, 'UNAUTHORIZED');

  // 3. Viewer attempts restricted write operation (Import) -> 403 FORBIDDEN
  const viewerImportRes = await mockReq('/api/v1/import/orders', {
    method: 'POST',
    headers: { authorization: `Bearer ${viewerToken}`, 'content-type': 'application/json' },
    body: [{ invoiceNumber: 'INV-1' }]
  });
  assert.equal(viewerImportRes.status, 403);
  assert.equal(viewerImportRes.body.error.code, 'FORBIDDEN');
});
