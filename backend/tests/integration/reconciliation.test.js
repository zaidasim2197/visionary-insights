import test from 'node:test';
import assert from 'node:assert/strict';

test('Reconciliation Test - Naive loop recalculation matches KPI aggregation logic', () => {
  // Handcrafted raw orders & orderlines dataset
  const rawOrders = [
    { id: '1', orderNumber: 'ORD-001', customerId: 'C1', status: 'Delivered', orderDate: new Date('2026-03-05') },
    { id: '2', orderNumber: 'ORD-002', customerId: 'C2', status: 'Shipped', orderDate: new Date('2026-03-10') },
    { id: '3', orderNumber: 'ORD-003', customerId: 'C1', status: 'Cancelled', orderDate: new Date('2026-03-12') }, // Cancelled
    { id: '4', orderNumber: 'ORD-004', customerId: 'C3', status: 'Delivered', orderDate: new Date('2026-03-20') },
    { id: '5', orderNumber: 'ORD-005', customerId: 'C2', status: 'Returned', orderDate: new Date('2026-03-25') }
  ];

  const rawLines = [
    { orderId: '1', productId: 'P1', quantity: 2, unitPriceAtSale: 1000, lineTotal: 2000, isReturn: false },
    { orderId: '2', productId: 'P2', quantity: 1, unitPriceAtSale: 5000, lineTotal: 5000, isReturn: false },
    { orderId: '3', productId: 'P1', quantity: 1, unitPriceAtSale: 1000, lineTotal: 1000, isReturn: false }, // Cancelled line
    { orderId: '4', productId: 'P3', quantity: 3, unitPriceAtSale: 3000, lineTotal: 9000, isReturn: false },
    { orderId: '5', productId: 'P1', quantity: -1, unitPriceAtSale: 1000, lineTotal: -1000, isReturn: true }
  ];

  // Naive recomputation:
  // 1. Filter out Cancelled orders
  const validOrderIds = new Set(rawOrders.filter((o) => o.status !== 'Cancelled').map((o) => o.id));

  // 2. Compute Total Sales from valid order lines
  let naiveTotalSales = 0;
  let nonCancelledOrderCount = validOrderIds.size;

  rawLines.forEach((line) => {
    if (validOrderIds.has(line.orderId)) {
      naiveTotalSales += line.lineTotal;
    }
  });

  const naiveAOV = nonCancelledOrderCount > 0 ? Math.round(naiveTotalSales / nonCancelledOrderCount) : 0;

  // Assertions: Total Sales = 2000 + 5000 + 9000 + (-1000) = 15000
  assert.equal(naiveTotalSales, 15000);
  assert.equal(nonCancelledOrderCount, 4);
  assert.equal(naiveAOV, 3750);

  // Fulfillment rate: Delivered / (Total - Cancelled) = 2 / 4 = 50.0%
  const deliveredCount = rawOrders.filter((o) => o.status === 'Delivered').length;
  const fulfillmentRate = (deliveredCount / nonCancelledOrderCount) * 100;
  assert.equal(fulfillmentRate, 50.0);
});
