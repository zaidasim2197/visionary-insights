import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Product } from '../src/models/Product.js';
import { CustomerOrder } from '../src/models/CustomerOrder.js';
import { OrderLine } from '../src/models/OrderLine.js';
import { InventoryMovement } from '../src/models/InventoryMovement.js';
import { InventoryPosition } from '../src/models/InventoryPosition.js';
import { Receivable } from '../src/models/Receivable.js';
import { createDataGenerator } from './generators/dataGenerator.js';
import { SalesRepository } from '../src/repositories/salesRepository.js';
import { OrdersRepository } from '../src/repositories/ordersRepository.js';
import { InventoryRepository } from '../src/repositories/inventoryRepository.js';
import { ReceivablesRepository } from '../src/repositories/receivablesRepository.js';
import { resolveDateRange } from '../src/utils/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runSeed = async ({ isTest = false, customUri = null } = {}) => {
  console.log('\n🌱 [Seed Runner] Starting Database Seed...');
  await connectDB(customUri);

  const gen = createDataGenerator('visionpulse-fixed-seed-2026');

  // 1. Reset collections if requested
  if (env.SEED_RESET) {
    console.log('[Seed] Dropping existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      CustomerOrder.deleteMany({}),
      OrderLine.deleteMany({}),
      InventoryMovement.deleteMany({}),
      InventoryPosition.deleteMany({}),
      Receivable.deleteMany({})
    ]);
  }

  // 2. Seed Users
  console.log('[Seed] Seeding Staff Accounts...');
  const salt = await bcrypt.genSalt(10);
  const adminPassHash = await bcrypt.hash('AdminPass123!', salt);
  const managerPassHash = await bcrypt.hash('ManagerPass123!', salt);
  const viewerPassHash = await bcrypt.hash('ViewerPass123!', salt);

  await User.create([
    { name: 'Sarah Connor (Admin)', email: 'admin@visionpulse.pk', passwordHash: adminPassHash, role: 'Admin' },
    { name: 'Tariq Mehmood (Manager)', email: 'manager@visionpulse.pk', passwordHash: managerPassHash, role: 'Manager' },
    { name: 'Ayesha Khan (Viewer)', email: 'viewer@visionpulse.pk', passwordHash: viewerPassHash, role: 'Viewer' }
  ]);

  // 3. Seed Customers & Products
  console.log('[Seed] Seeding Customers & Products...');
  const customerDocs = await Customer.create(gen.getCustomers());
  const productDefs = gen.getProducts();
  const productDocs = await Product.create(productDefs);

  const productMap = new Map(productDocs.map((p) => [p.productCode, p]));
  const customerMap = new Map(customerDocs.map((c) => [c.customerCode, c]));

  // 4. Seed Initial Stock Movements and Positions
  console.log('[Seed] Initializing Inventory Positions & Stock In Movements...');
  for (const pDef of productDefs) {
    const product = productMap.get(pDef.productCode);
    if (pDef.initialStock > 0) {
      await InventoryMovement.create({
        productId: product._id,
        movementType: 'Stock In',
        quantityChange: pDef.initialStock,
        movementDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        notes: 'Initial warehouse balance initialization',
        performedBy: 'System'
      });
    }

    await InventoryPosition.create({
      productId: product._id,
      currentStock: pDef.initialStock,
      reservedStock: 0,
      availableStock: pDef.initialStock,
      stockValue: pDef.initialStock * product.unitCost,
      lastUpdated: new Date()
    });
  }

  // 5. Seed Orders, OrderLines, Inventory Movements, Receivables
  console.log('[Seed] Generating Realistic Transaction History across multiple months...');
  const isLarge = env.SEED_MODE === 'large' && !isTest;
  const orderCount = isLarge ? 5000 : 45;

  const orderStatuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled', 'Returned'];

  // Seeded specific dates over the last 90 days to populate current month and previous month
  const now = new Date();
  const nowMs = now.getTime();

  for (let i = 1; i <= orderCount; i++) {
    const invoiceNum = `INV-2026-${String(i).padStart(4, '0')}`;
    const orderNum = `ORD-2026-${String(i).padStart(4, '0')}`;
    
    // Spread dates over past 90 days
    const daysAgo = (i % 80);
    const orderDate = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);

    // Ensure edge cases:
    // Order 1: Cancelled
    // Order 2: Returned
    // Order 3: Overdue invoice
    // Order 4: Repeat customer (CUST-001)
    let status = gen.randomItem(orderStatuses);
    if (i === 1) status = 'Cancelled';
    if (i === 2) status = 'Returned';
    if (i === 3) status = 'Delivered';

    let customer = gen.randomItem(customerDocs);
    // Guarantee repeat customer on CUST-001
    if (i === 4 || i === 5 || i === 6) {
      customer = customerMap.get('CUST-001');
    }

    const fulfillmentDate = status === 'Delivered'
      ? new Date(orderDate.getTime() + gen.randomInt(12, 72) * 60 * 60 * 1000)
      : (status === 'Shipped' ? new Date(orderDate.getTime() + 24 * 3600 * 1000) : null);

    const order = await CustomerOrder.create({
      orderNumber: orderNum,
      customerId: customer._id,
      orderDate,
      status,
      fulfillmentDate,
      paymentTerms: 'Net 30',
      currency: 'PKR'
    });

    // Select 1 to 3 items per order (excluding zero-sales product PRD-112)
    const activeProducts = productDocs.filter((p) => p.productCode !== 'PRD-112' && p.productCode !== 'PRD-109');
    const selectedProd = gen.randomItem(activeProducts);
    const isReturn = status === 'Returned';
    const quantity = isReturn ? -1 : gen.randomInt(1, 4);
    const unitPriceAtSale = selectedProd.unitPrice;
    const unitCostAtSale = selectedProd.unitCost;
    const lineTotal = quantity * unitPriceAtSale;

    const line = await OrderLine.create({
      orderId: order._id,
      productId: selectedProd._id,
      quantity,
      unitPriceAtSale,
      unitCostAtSale,
      lineTotal,
      isReturn
    });

    // Inventory movement for non-cancelled orders
    if (status !== 'Cancelled') {
      await InventoryMovement.create({
        productId: selectedProd._id,
        movementType: isReturn ? 'Return' : 'Stock Out',
        quantityChange: isReturn ? 1 : -Math.abs(quantity),
        movementDate: orderDate,
        referenceOrderLineId: line._id,
        notes: `Order ${orderNum}`
      });
    }

    // Receivables
    let recStatus = 'Paid';
    let paidDate = new Date(orderDate.getTime() + gen.randomInt(5, 25) * 24 * 60 * 60 * 1000);
    const dueDate = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Guaranteed overdue invoice:
    if (i === 3 || (daysAgo > 35 && i % 3 === 0)) {
      recStatus = 'Unpaid';
      paidDate = null;
    } else if (status === 'Pending' || status === 'Processing') {
      recStatus = 'Unpaid';
      paidDate = null;
    } else if (i % 7 === 0) {
      recStatus = 'Partially Paid';
      paidDate = null;
    }

    const amountTotal = Math.abs(lineTotal);
    const amountPaid = recStatus === 'Paid' ? amountTotal : (recStatus === 'Partially Paid' ? Math.round(amountTotal * 0.4) : 0);
    const amountOutstanding = amountTotal - amountPaid;

    await Receivable.create({
      orderId: order._id,
      customerId: customer._id,
      invoiceNumber: invoiceNum,
      invoiceDate: orderDate,
      dueDate,
      amountTotal,
      amountPaid,
      amountOutstanding,
      status: recStatus,
      paidDate
    });
  }

  // 6. Recalculate Inventory Positions based on all movements to ensure exact sync
  console.log('[Seed] Recalculating all Inventory Positions to guarantee zero drift...');
  for (const product of productDocs) {
    const moves = await InventoryMovement.aggregate([
      { $match: { productId: product._id } },
      { $group: { _id: null, totalQty: { $sum: '$quantityChange' } } }
    ]);
    const finalStock = moves[0]?.totalQty || 0;
    await InventoryPosition.findOneAndUpdate(
      { productId: product._id },
      {
        $set: {
          currentStock: finalStock,
          availableStock: finalStock,
          stockValue: finalStock * product.unitCost,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
  }

  // 7. Calculate and save expected totals snapshot for integration tests
  console.log('[Seed] Calculating baseline expected totals for test suite...');
  const { fromDate, toDate } = resolveDateRange({ preset: 'month' });
  const [salesMetrics, ordersMetrics, invMetrics, recMetrics] = await Promise.all([
    SalesRepository.getSalesMetrics(fromDate, toDate),
    OrdersRepository.getOrdersMetrics(fromDate, toDate),
    InventoryRepository.getLiveInventoryMetrics(),
    ReceivablesRepository.getReceivablesMetrics(fromDate, toDate)
  ]);

  const expectedTotals = {
    generatedAt: new Date().toISOString(),
    currentMonth: {
      sales: salesMetrics,
      orders: ordersMetrics,
      inventory: invMetrics,
      receivables: recMetrics
    }
  };

  const fixturesDir = path.join(__dirname, '../tests/fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(fixturesDir, 'expected-totals.json'),
    JSON.stringify(expectedTotals, null, 2),
    'utf-8'
  );

  console.log('✅ [Seed Runner] Seed completed successfully. Baseline expected totals written to tests/fixtures/expected-totals.json\n');

  if (!isTest) {
    await disconnectDB();
  }

  return expectedTotals;
};

// If run directly via `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed().catch((err) => {
    console.error('Fatal seed error:', err);
    process.exit(1);
  });
}
