import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDateRange, getPreviousPeriod, pktStartOfDayToUtc, pktEndOfDayToUtc } from '../../src/utils/dateUtils.js';
import { formatMoney, toSubunits } from '../../src/utils/moneyUtils.js';
import { redactViewerData } from '../../src/middleware/roleGuard.js';

test('Date Utils - Resolves date range presets correctly with PKT (UTC+5) offset', () => {
  const monthRange = resolveDateRange({ preset: 'month' });
  assert.ok(monthRange.fromDate instanceof Date);
  assert.ok(monthRange.toDate instanceof Date);
  assert.ok(monthRange.fromDate < monthRange.toDate);

  // Custom date string
  const custom = resolveDateRange({ from: '2026-01-01', to: '2026-01-31' });
  assert.equal(custom.preset, 'custom');
  assert.ok(custom.fromDate.toISOString().includes('2025-12-31T19:00:00.000Z')); // 2026-01-01 00:00 PKT is 19:00 UTC prev day
});

test('Date Utils - Calculates previous period of exact equal length', () => {
  const fromDate = new Date('2026-03-01T00:00:00.000Z');
  const toDate = new Date('2026-03-31T23:59:59.999Z');
  const duration = toDate.getTime() - fromDate.getTime();

  const { prevFromDate, prevToDate } = getPreviousPeriod(fromDate, toDate);
  const prevDuration = prevToDate.getTime() - prevFromDate.getTime();

  assert.equal(duration, prevDuration);
  assert.equal(prevToDate.getTime(), fromDate.getTime() - 1);
});

test('Money Utils - Integer Subunits conversion and formatting', () => {
  assert.equal(toSubunits(150.50), 15050);
  assert.equal(toSubunits(0), 0);
  assert.equal(formatMoney(15050, 'PKR'), 'PKR 150.50');
  assert.equal(formatMoney(0, 'PKR'), 'PKR 0.00');
  assert.equal(formatMoney(null, 'PKR'), 'PKR 0.00');
});

test('KPI Formula Guards - Division by Zero Protections', () => {
  // AOV with 0 orders
  const calcAov = (sales, orders) => (orders > 0 ? Math.round(sales / orders) : 0);
  assert.equal(calcAov(10000, 0), 0);
  assert.equal(calcAov(10000, 2), 5000);

  // Sales Growth with 0 previous sales
  const calcGrowth = (current, previous) => {
    if (previous > 0) return Number((((current - previous) / previous) * 100).toFixed(2));
    if (current > 0) return 100.0;
    return 0;
  };
  assert.equal(calcGrowth(5000, 0), 100.0);
  assert.equal(calcGrowth(0, 0), 0);
  assert.equal(calcGrowth(200, 100), 100.0);
  assert.equal(calcGrowth(50, 100), -50.0);

  // Fulfillment Rate with 0 net orders
  const calcFulfillment = (delivered, total, cancelled) => {
    const net = total - cancelled;
    return net > 0 ? Number(((delivered / net) * 100).toFixed(2)) : 0;
  };
  assert.equal(calcFulfillment(0, 5, 5), 0);
  assert.equal(calcFulfillment(4, 5, 1), 100.0);
  assert.equal(calcFulfillment(2, 5, 1), 50.0);

  // Inventory Turnover with 0 stock value
  const calcTurnover = (cogs, stockValue) => (stockValue > 0 ? Number((cogs / stockValue).toFixed(2)) : 0);
  assert.equal(calcTurnover(50000, 0), 0);
  assert.equal(calcTurnover(50000, 25000), 2.0);

  // Repeat Customer Rate with 0 customers
  const calcRepeatRate = (repeatCount, totalCount) =>
    totalCount > 0 ? Number(((repeatCount / totalCount) * 100).toFixed(2)) : 0;
  assert.equal(calcRepeatRate(0, 0), 0);
  assert.equal(calcRepeatRate(2, 10), 20.0);
});

test('Viewer Redaction - Strips customer name/email and unit cost server-side', () => {
  const sensitiveOrder = {
    id: 'ord_123',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    unitCost: 5000,
    unitPrice: 8000,
    lineTotal: 8000
  };

  const redacted = redactViewerData(sensitiveOrder, 'Viewer');
  assert.equal(redacted.customerName, '[REDACTED]');
  assert.equal(redacted.customerEmail, '[REDACTED]');
  assert.equal(redacted.unitCost, undefined);
  assert.equal(redacted.unitPrice, 8000);

  // Admin remains unredacted
  const unredacted = redactViewerData(sensitiveOrder, 'Admin');
  assert.equal(unredacted.customerName, 'John Doe');
  assert.equal(unredacted.unitCost, 5000);
});
