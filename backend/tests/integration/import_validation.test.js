import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { ImportValidator } from '../../src/validators/importValidator.js';
import { Customer } from '../../src/models/Customer.js';
import { Product } from '../../src/models/Product.js';
import { Receivable } from '../../src/models/Receivable.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';

test('Import Validator - Full validation and edge case rejection per Section 2.6', async (t) => {
  // Use test DB connection
  try {
    await connectDB();
  } catch {
    // If not running DB, skip or mock
  }

  if (mongoose.connection.readyState !== 1) {
    console.log('Skipping DB-dependent import test (No live MongoDB connection)');
    return;
  }

  try {
    // Setup sample test customer and product
    await Customer.deleteMany({ customerCode: { $in: ['TEST-CUST-1'] } });
    await Product.deleteMany({ productCode: { $in: ['TEST-PRD-1'] } });

    const testCustomer = await Customer.create({
      customerCode: 'TEST-CUST-1',
      name: 'Test Customer A',
      email: 'testA@example.com',
      region: 'Punjab'
    });

    const testProduct = await Product.create({
      productCode: 'TEST-PRD-1',
      name: 'Test Product A',
      category: 'Electronics',
      unitCost: 1000,
      unitPrice: 2000,
      reorderThreshold: 5
    });

    const batch = [
      // 1. Valid sale row
      {
        invoiceNumber: 'INV-TEST-001',
        customerCode: 'TEST-CUST-1',
        productCode: 'TEST-PRD-1',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: 5,
        unitPrice: 2000,
        isReturn: false
      },
      // 2. Invalid: Non-existent customer (referential error)
      {
        invoiceNumber: 'INV-TEST-002',
        customerCode: 'NON-EXISTENT-CUST',
        productCode: 'TEST-PRD-1',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: 2,
        unitPrice: 2000,
        isReturn: false
      },
      // 3. Invalid: Non-existent product (referential error)
      {
        invoiceNumber: 'INV-TEST-003',
        customerCode: 'TEST-CUST-1',
        productCode: 'NON-EXISTENT-PRD',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: 2,
        unitPrice: 2000,
        isReturn: false
      },
      // 4. Invalid: Negative quantity without return flag
      {
        invoiceNumber: 'INV-TEST-004',
        customerCode: 'TEST-CUST-1',
        productCode: 'TEST-PRD-1',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: -3,
        unitPrice: 2000,
        isReturn: false
      },
      // 5. Valid return row (negative quantity with return flag)
      {
        invoiceNumber: 'INV-TEST-005',
        customerCode: 'TEST-CUST-1',
        productCode: 'TEST-PRD-1',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: -1,
        unitPrice: 2000,
        isReturn: true
      },
      // 6. Invalid: Future date
      {
        invoiceNumber: 'INV-TEST-006',
        customerCode: 'TEST-CUST-1',
        productCode: 'TEST-PRD-1',
        orderDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 1,
        unitPrice: 2000,
        isReturn: false
      },
      // 7. Duplicate invoice in same batch (duplicate of INV-TEST-001)
      {
        invoiceNumber: 'INV-TEST-001',
        customerCode: 'TEST-CUST-1',
        productCode: 'TEST-PRD-1',
        orderDate: new Date('2026-01-15').toISOString(),
        quantity: 1,
        unitPrice: 2000,
        isReturn: false
      }
    ];

    const report = await ImportValidator.validateOrderBatch(batch);

    assert.equal(report.totalProcessed, 7);
    assert.equal(report.acceptedCount, 2); // Rows 1 and 5
    assert.equal(report.rejectedCount, 5); // Rows 2, 3, 4, 6, 7

    // Check specific rejection reasons
    const rejectedErrors = report.rejectedRecords.flatMap((r) => r.errors);
    assert.ok(rejectedErrors.some((e) => e.field === 'customerCode' && e.message.includes('does not exist')));
    assert.ok(rejectedErrors.some((e) => e.field === 'productCode' && e.message.includes('does not exist')));
    assert.ok(rejectedErrors.some((e) => e.field === 'quantity' && e.message.includes('strictly positive')));
    assert.ok(rejectedErrors.some((e) => e.field === 'orderDate' && e.message.includes('Future invoice dates')));
    assert.ok(rejectedErrors.some((e) => e.field === 'invoiceNumber' && e.message.includes('Duplicate invoice number')));

    // Cleanup
    await Customer.deleteMany({ customerCode: 'TEST-CUST-1' });
    await Product.deleteMany({ productCode: 'TEST-PRD-1' });
  } finally {
    await disconnectDB();
  }
});
