import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { CustomerOrder } from '../../src/models/CustomerOrder.js';
import { Receivable } from '../../src/models/Receivable.js';

let app;
let adminToken;
let managerToken;
let viewerToken;

// Helper to simulate HTTP requests against Express app
const callApi = async (method, path, { token = adminToken, query = {}, body = null } = {}) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  return new Promise((resolve) => {
    let url = path;
    const qKeys = Object.keys(query);
    if (qKeys.length > 0) {
      const qStr = qKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join('&');
      url = `${path}?${qStr}`;
    }

    const headers = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    if (body) {
      headers['content-type'] = 'application/json';
    }

    const req = {
      method,
      url,
      originalUrl: url,
      path: path.split('?')[0],
      headers,
      query,
      body: body || {}
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

before(async () => {
  await connectDB();
  app = createApp();

  const makeToken = (role) =>
    jwt.sign(
      { sub: `test_${role.toLowerCase()}`, name: `${role} User`, role },
      env.JWT_SECRET,
      { expiresIn: '2h' }
    );

  adminToken = makeToken('Admin');
  managerToken = makeToken('Manager');
  viewerToken = makeToken('Viewer');
});

after(async () => {
  await mongoose.disconnect();
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Section 5 Endpoint Coverage — 1 Automated Test Per Required Endpoint (25 Endpoints)
 * Validated against the deterministic seed dataset with expected totals.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// 1. GET /api/dashboard/kpis/sales
test('Section 5.1: GET /api/dashboard/kpis/sales - Total Sales, Total Orders, AOV, Growth', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/sales');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.recordCount === 'number');
  assert.ok(typeof res.body.generatedAt === 'string');

  const { totalSales, totalOrders, averageOrderValue, salesGrowth } = res.body.data;
  assert.ok(typeof totalSales === 'number');
  assert.ok(typeof totalOrders === 'number');
  assert.ok(typeof averageOrderValue === 'number');
  assert.ok(typeof salesGrowth === 'number');

  // Verify Viewer access permitted per Section 6 (aggregate only)
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/sales', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});

// 2. GET /api/dashboard/trends/sales
test('Section 5.2: GET /api/dashboard/trends/sales - Monthly sales series for trend chart', async () => {
  const res = await callApi('GET', '/api/dashboard/trends/sales');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.recordCount >= 0);
  assert.ok(typeof res.body.generatedAt === 'string');

  if (res.body.data.length > 0) {
    const item = res.body.data[0];
    assert.ok(item.month || item.period);
    assert.ok(typeof item.totalSales === 'number');
    assert.ok(typeof item.totalOrders === 'number');
  }

  // Viewer access permitted
  const viewerRes = await callApi('GET', '/api/dashboard/trends/sales', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});

// 3. GET /api/dashboard/kpis/orders
test('Section 5.3: GET /api/dashboard/kpis/orders - Orders Pending, Delivered, Cancelled, Fulfillment Rate', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/orders');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.recordCount === 'number');
  assert.ok(typeof res.body.generatedAt === 'string');

  const { ordersPending, ordersDelivered, ordersCancelled, fulfillmentRate } = res.body.data;
  assert.ok(typeof ordersPending === 'number');
  assert.ok(typeof ordersDelivered === 'number');
  assert.ok(typeof ordersCancelled === 'number');
  assert.ok(typeof fulfillmentRate === 'number');

  // Viewer access permitted
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/orders', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});

// 4. GET /api/dashboard/orders
test('Section 5.4: GET /api/dashboard/orders - Drill down order list (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/orders', { query: { page: 1, limit: 10 } });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.meta);
  assert.equal(res.body.meta.page, 1);
  assert.ok(typeof res.body.recordCount === 'number');

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/orders', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
  assert.equal(viewerRes.body.error.code, 'FORBIDDEN');
});

// 5. GET /api/dashboard/orders/{id}
test('Section 5.5: GET /api/dashboard/orders/{id} - Single order detail (Admin/Manager only)', async () => {
  const sampleOrder = await CustomerOrder.findOne().lean();
  assert.ok(sampleOrder, 'Sample order should exist in seed data');

  const res = await callApi('GET', `/api/dashboard/orders/${sampleOrder._id}`);
  assert.equal(res.status, 200);
  assert.equal(String(res.body.data._id), String(sampleOrder._id));
  assert.ok(Array.isArray(res.body.data.lines));
  assert.ok(res.body.data.customer);

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', `/api/dashboard/orders/${sampleOrder._id}`, { token: viewerToken });
  assert.equal(viewerRes.status, 403);
  assert.equal(viewerRes.body.error.code, 'FORBIDDEN');
});

// 6. GET /api/dashboard/kpis/inventory/counts
test('Section 5.6: GET /api/dashboard/kpis/inventory/counts - Low Stock, Out of Stock, Total Active', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/inventory/counts');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.recordCount === 'number');

  const { itemsLowOnStock, itemsOutOfStock, totalActiveProducts } = res.body.data;
  assert.ok(typeof itemsLowOnStock === 'number');
  assert.ok(typeof itemsOutOfStock === 'number');
  assert.ok(typeof totalActiveProducts === 'number');
  assert.equal(totalActiveProducts, 12, 'Deterministic seed contains exactly 12 products');

  // Viewer access permitted per Section 6 (aggregate count only)
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/inventory/counts', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});

// 7. GET /api/dashboard/kpis/inventory/value
test('Section 5.7: GET /api/dashboard/kpis/inventory/value - Total Stock Value (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/inventory/value');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.data.totalStockValue === 'number');
  assert.ok(res.body.data.totalStockValue > 0, 'Total stock value must be a positive integer in subunits');

  // Viewer forbidden per Section 6 (No access to inventory value and unit cost)
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/inventory/value', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
  assert.equal(viewerRes.body.error.code, 'FORBIDDEN');
});

// 8. GET /api/dashboard/inventory/lowstock
test('Section 5.8: GET /api/dashboard/inventory/lowstock - Drill down low stock list (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/inventory/lowstock', { query: { page: 1 } });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(typeof res.body.recordCount === 'number');

  // Low stock products verify threshold condition
  res.body.data.forEach((item) => {
    assert.ok(item.availableStock <= item.reorderThreshold);
    assert.ok(item.availableStock > 0);
  });

  // Viewer forbidden per Section 6 (No access to drill downs)
  const viewerRes = await callApi('GET', '/api/dashboard/inventory/lowstock', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 9. GET /api/dashboard/kpis/receivables
test('Section 5.9: GET /api/dashboard/kpis/receivables - Total Outstanding, Overdue Amount, Overdue Count, Avg Days to Pay', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/receivables');
  assert.equal(res.status, 200);

  const { totalOutstanding, overdueAmount, overdueInvoicesCount, averageDaysToPay } = res.body.data;
  assert.ok(typeof totalOutstanding === 'number');
  assert.ok(typeof overdueAmount === 'number');
  assert.ok(typeof overdueInvoicesCount === 'number');
  assert.ok(typeof averageDaysToPay === 'number');
  assert.ok(totalOutstanding >= overdueAmount, 'Total outstanding must be >= overdue amount');

  // Viewer forbidden per Section 6 (Receivables: No access)
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/receivables', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 10. GET /api/dashboard/receivables/aging
test('Section 5.10: GET /api/dashboard/receivables/aging - Aging bucket breakdown (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/receivables/aging');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.buckets);
  assert.ok(typeof res.body.data.buckets['0-30'] === 'number');
  assert.ok(typeof res.body.data.buckets['31-60'] === 'number');
  assert.ok(typeof res.body.data.buckets['61-90'] === 'number');
  assert.ok(typeof res.body.data.buckets['90+'] === 'number');

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/receivables/aging', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 11. GET /api/dashboard/receivables/{id}
test('Section 5.11: GET /api/dashboard/receivables/{id} - Single invoice detail (Admin/Manager only)', async () => {
  const sampleInvoice = await Receivable.findOne().lean();
  assert.ok(sampleInvoice, 'Sample receivable must exist in seed data');

  const res = await callApi('GET', `/api/dashboard/receivables/${sampleInvoice._id}`);
  assert.equal(res.status, 200);
  assert.equal(String(res.body.data._id), String(sampleInvoice._id));
  assert.equal(res.body.data.invoiceNumber, sampleInvoice.invoiceNumber);

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', `/api/dashboard/receivables/${sampleInvoice._id}`, { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 12. GET /api/dashboard/rankings/products
test('Section 5.12: GET /api/dashboard/rankings/products - Top products by sales (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/rankings/products', { query: { limit: 5 } });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length <= 5);

  if (res.body.data.length > 1) {
    assert.ok(res.body.data[0].totalRevenue >= res.body.data[1].totalRevenue, 'Rankings must be sorted descending');
  }

  // Viewer forbidden per Section 6 (Top Products and Customers: No access)
  const viewerRes = await callApi('GET', '/api/dashboard/rankings/products', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 13. GET /api/dashboard/rankings/customers
test('Section 5.13: GET /api/dashboard/rankings/customers - Top customers by sales (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/rankings/customers', { query: { limit: 5 } });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length <= 5);

  if (res.body.data.length > 1) {
    assert.ok(res.body.data[0].totalSpent >= res.body.data[1].totalSpent, 'Rankings must be sorted descending');
  }

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/rankings/customers', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 14. GET /api/dashboard/kpis/operational
test('Section 5.14: GET /api/dashboard/kpis/operational - Fulfillment Time, Return Rate, Repeat Customer Rate, Turnover', async () => {
  const res = await callApi('GET', '/api/dashboard/kpis/operational');
  assert.equal(res.status, 200);

  const { averageFulfillmentTime, returnRate, repeatCustomerRate, inventoryTurnover } = res.body.data;
  assert.ok(typeof averageFulfillmentTime === 'number');
  assert.ok(typeof returnRate === 'number');
  assert.ok(typeof repeatCustomerRate === 'number');
  assert.ok(typeof inventoryTurnover === 'number');

  // Viewer forbidden per Section 6 (exposes cost and operational performance)
  const viewerRes = await callApi('GET', '/api/dashboard/kpis/operational', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 15. GET /api/dashboard/inventory/outofstock
test('Section 5.15: GET /api/dashboard/inventory/outofstock - Drill down out of stock list (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/inventory/outofstock');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  res.body.data.forEach((p) => {
    assert.ok(p.availableStock <= 0, 'Out of stock items must have <= 0 available stock');
  });

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/inventory/outofstock', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 16. GET /api/dashboard/trends/orders
test('Section 5.16: GET /api/dashboard/trends/orders - Order status series for trend chart (All roles)', async () => {
  const res = await callApi('GET', '/api/dashboard/trends/orders');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  // Viewer access permitted per Section 6 (Orders aggregate trends)
  const viewerRes = await callApi('GET', '/api/dashboard/trends/orders', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});

// 17. GET /api/dashboard/receivables/outstanding
test('Section 5.17: GET /api/dashboard/receivables/outstanding - Drill down outstanding invoices (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/receivables/outstanding');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  res.body.data.forEach((inv) => {
    assert.ok(['Unpaid', 'Partially Paid'].includes(inv.status));
  });

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/receivables/outstanding', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 18. GET /api/dashboard/receivables/overdue
test('Section 5.18: GET /api/dashboard/receivables/overdue - Drill down overdue invoices (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/receivables/overdue');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  res.body.data.forEach((inv) => {
    assert.ok(inv.isOverdue === true || inv.daysPastDue > 0);
  });

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/receivables/overdue', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 19. GET /api/dashboard/trends/receivables
test('Section 5.19: GET /api/dashboard/trends/receivables - Outstanding and overdue amount trend (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/trends/receivables');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/trends/receivables', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 20. GET /api/dashboard/operational/fulfillment-time/drilldown
test('Section 5.20: GET /api/dashboard/operational/fulfillment-time/drilldown - Orders behind Fulfillment Time (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/operational/fulfillment-time/drilldown');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  if (res.body.data.length > 0) {
    assert.ok(typeof res.body.data[0].durationDays === 'number');
  }

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/operational/fulfillment-time/drilldown', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 21. GET /api/dashboard/operational/returns/drilldown
test('Section 5.21: GET /api/dashboard/operational/returns/drilldown - Orders behind Return Rate (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/operational/returns/drilldown');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/operational/returns/drilldown', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 22. GET /api/dashboard/operational/repeat-customers/drilldown
test('Section 5.22: GET /api/dashboard/operational/repeat-customers/drilldown - Customers behind Repeat Rate (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/operational/repeat-customers/drilldown');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  res.body.data.forEach((cust) => {
    assert.ok(cust.orderCount >= 2, 'Repeat customers must have at least 2 orders');
  });

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/operational/repeat-customers/drilldown', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 23. GET /api/dashboard/trends/operational
test('Section 5.23: GET /api/dashboard/trends/operational - Operational metrics trend series (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/trends/operational');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/trends/operational', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 24. GET /api/dashboard/operational/inventory-turnover/drilldown
test('Section 5.24: GET /api/dashboard/operational/inventory-turnover/drilldown - Products behind Inventory Turnover (Admin/Manager only)', async () => {
  const res = await callApi('GET', '/api/dashboard/operational/inventory-turnover/drilldown');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  if (res.body.data.length > 0) {
    const item = res.body.data[0];
    assert.ok(typeof item.turnoverRate === 'number');
    assert.ok(typeof item.cogs === 'number');
  }

  // Viewer forbidden per Section 6
  const viewerRes = await callApi('GET', '/api/dashboard/operational/inventory-turnover/drilldown', { token: viewerToken });
  assert.equal(viewerRes.status, 403);
});

// 25. GET /api/dashboard/trends/inventory
test('Section 5.25: GET /api/dashboard/trends/inventory - Stock In vs Stock Out series (All roles)', async () => {
  const res = await callApi('GET', '/api/dashboard/trends/inventory');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  // Viewer access permitted per Section 6 (aggregate inventory trend)
  const viewerRes = await callApi('GET', '/api/dashboard/trends/inventory', { token: viewerToken });
  assert.equal(viewerRes.status, 200);
});
