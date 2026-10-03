import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';

test('Access Control & RBAC Matrix - Enforces Role Permissions & Viewer Redaction', async () => {
  await connectDB();
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

  // 4. Section 6 Security Matrix: Viewer Forbidden on all drilldowns
  const viewerSalesDrill = await mockReq('/api/v1/sales/drilldown', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerSalesDrill.status, 403);
  assert.equal(viewerSalesDrill.body.error.code, 'FORBIDDEN');

  const viewerOrdersDrill = await mockReq('/api/v1/orders/drilldown', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerOrdersDrill.status, 403);
  assert.equal(viewerOrdersDrill.body.error.code, 'FORBIDDEN');

  const viewerInvDrill = await mockReq('/api/v1/inventory/drilldown', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerInvDrill.status, 403);
  assert.equal(viewerInvDrill.body.error.code, 'FORBIDDEN');

  // 5. Section 6 Security Matrix: Viewer Forbidden on Receivables (Summary & Detail)
  const viewerRecSummary = await mockReq('/api/v1/receivables/summary', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerRecSummary.status, 403);
  assert.equal(viewerRecSummary.body.error.code, 'FORBIDDEN');

  const viewerRecDrill = await mockReq('/api/v1/receivables/drilldown', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerRecDrill.status, 403);
  assert.equal(viewerRecDrill.body.error.code, 'FORBIDDEN');

  // 6. Section 6 Security Matrix: Viewer Forbidden on Top Products & Customers (Analytics)
  const viewerAnalytics = await mockReq('/api/v1/analytics/summary', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerAnalytics.status, 403);
  assert.equal(viewerAnalytics.body.error.code, 'FORBIDDEN');

  // 7. Section 6 Security Matrix: Viewer allowed on Sales & Orders Aggregates
  const viewerSalesSum = await mockReq('/api/v1/sales/summary', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerSalesSum.status, 200);

  const viewerOrdersSum = await mockReq('/api/v1/orders/summary', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerOrdersSum.status, 200);

  // 8. Section 6: Inventory Counts allowed for Viewer, but Inventory Value redacted
  const viewerInvSum = await mockReq('/api/v1/inventory/summary', {
    headers: { authorization: `Bearer ${viewerToken}` }
  });
  assert.equal(viewerInvSum.status, 200);
  assert.equal(viewerInvSum.body.data.liveSnapshot.totalStockValue, undefined);
  assert.equal(typeof viewerInvSum.body.data.liveSnapshot.totalActiveProducts, 'number');

  // 9. Admin & Manager have full access to drilldowns, receivables, analytics
  for (const token of [adminToken, managerToken]) {
    const adminRec = await mockReq('/api/v1/receivables/summary', {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(adminRec.status, 200);

    const adminAnalytics = await mockReq('/api/v1/analytics/summary', {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(adminAnalytics.status, 200);

    const adminInv = await mockReq('/api/v1/inventory/summary', {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(adminInv.status, 200);
    assert.equal(typeof adminInv.body.data.liveSnapshot.totalStockValue, 'number');
  }

  await disconnectDB();
});
