import mongoose from 'mongoose';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { OrderLine } from '../models/OrderLine.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { InventoryPosition } from '../models/InventoryPosition.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Receivable } from '../models/Receivable.js';
import { SalesRepository } from '../repositories/salesRepository.js';
import { OrdersRepository } from '../repositories/ordersRepository.js';
import { InventoryRepository } from '../repositories/inventoryRepository.js';
import { ReceivablesRepository } from '../repositories/receivablesRepository.js';
import { AnalyticsRepository } from '../repositories/analyticsRepository.js';
import { resolveDateRange, getPreviousPeriod, dateRangeFilter, excludeCancelled } from '../utils/dateUtils.js';

export class DashboardApiService {
  /**
   * 1. GET /api/dashboard/kpis/sales
   * Total Sales, Total Orders, Average Order Value, Sales Growth
   */
  static async getSalesKpis({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const { prevFromDate, prevToDate } = getPreviousPeriod(fromDate, toDate);

    const [current, previous] = await Promise.all([
      SalesRepository.getSalesMetrics(fromDate, toDate),
      SalesRepository.getSalesMetrics(prevFromDate, prevToDate)
    ]);

    let salesGrowth = 0;
    if (previous.totalSales > 0) {
      salesGrowth = Number((((current.totalSales - previous.totalSales) / previous.totalSales) * 100).toFixed(2));
    } else if (current.totalSales > 0) {
      salesGrowth = 100.0;
    }

    return {
      data: {
        totalSales: current.totalSales,
        totalOrders: current.totalOrders,
        averageOrderValue: current.averageOrderValue,
        salesGrowth
      },
      recordCount: current.totalOrders
    };
  }

  /**
   * 2. GET /api/dashboard/trends/sales
   * Monthly sales series for the trend chart
   */
  static async getSalesTrends({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'year' });
    const match = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'orderlines',
          localField: '_id',
          foreignField: 'orderId',
          as: 'lines'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
          totalSales: { $sum: { $sum: '$lines.lineTotal' } },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          month: '$_id',
          totalSales: 1,
          totalOrders: 1
        }
      }
    ];

    const results = await CustomerOrder.aggregate(pipeline);
    return {
      data: results,
      recordCount: results.length
    };
  }

  /**
   * 3. GET /api/dashboard/kpis/orders
   * Orders Pending, Delivered, Cancelled, Fulfillment Rate
   */
  static async getOrdersKpis({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const metrics = await OrdersRepository.getOrdersMetrics(fromDate, toDate);

    const ordersPending = (metrics.statusCounts.Pending || 0) + (metrics.statusCounts.Processing || 0);
    const ordersDelivered = metrics.statusCounts.Delivered || 0;
    const ordersCancelled = metrics.statusCounts.Cancelled || 0;
    const totalPlaced = metrics.totalOrders;

    // Formula per Section 3.2: Orders Delivered / Total Orders placed in same range * 100
    const fulfillmentRate = totalPlaced > 0
      ? Number(((ordersDelivered / totalPlaced) * 100).toFixed(2))
      : 0;

    return {
      data: {
        ordersPending,
        ordersDelivered,
        ordersCancelled,
        fulfillmentRate
      },
      recordCount: totalPlaced
    };
  }

  /**
   * 4. GET /api/dashboard/orders
   * Drill down order list
   */
  static async getOrdersDrilldown({ status = null, customer = null, from = null, to = null, page = 1, limit = 25 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const result = await OrdersRepository.getOrdersDrilldown(fromDate, toDate, {
      status,
      page: Number(page),
      limit: Number(limit),
      search: customer || ''
    });

    return {
      data: result.data,
      meta: result.meta,
      recordCount: result.data.length
    };
  }

  /**
   * 5. GET /api/dashboard/orders/{id}
   * Single order detail
   */
  static async getOrderById(id) {
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await CustomerOrder.findById(id).lean();
    }
    if (!order) {
      order = await CustomerOrder.findOne({ orderNumber: id }).lean();
    }
    if (!order) return null;

    const [customer, lines] = await Promise.all([
      Customer.findById(order.customerId).lean(),
      OrderLine.find({ orderId: order._id }).lean()
    ]);

    const productIds = lines.map((l) => l.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const populatedLines = lines.map((line) => ({
      ...line,
      product: productMap.get(String(line.productId)) || null
    }));

    return {
      data: {
        ...order,
        customer,
        lines: populatedLines,
        itemCount: lines.length,
        orderTotal: lines.reduce((acc, l) => acc + (l.lineTotal || 0), 0)
      },
      recordCount: 1
    };
  }

  /**
   * 6. GET /api/dashboard/kpis/inventory/counts
   * Items Low on Stock, Out of Stock, Total Active Products
   */
  static async getInventoryCounts() {
    const live = await InventoryRepository.getLiveInventoryMetrics();
    return {
      data: {
        itemsLowOnStock: live.lowStockCount,
        itemsOutOfStock: live.outOfStockCount,
        totalActiveProducts: live.totalActiveProducts
      },
      recordCount: live.totalActiveProducts
    };
  }

  /**
   * 7. GET /api/dashboard/kpis/inventory/value
   * Total Stock Value
   */
  static async getInventoryValue() {
    const live = await InventoryRepository.getLiveInventoryMetrics();
    return {
      data: {
        totalStockValue: live.totalStockValue
      },
      recordCount: live.totalActiveProducts
    };
  }

  /**
   * 8. GET /api/dashboard/inventory/lowstock
   * Drill down low stock list
   */
  static async getInventoryLowStock({ page = 1, limit = 25 } = {}) {
    const result = await InventoryRepository.getInventoryDrilldown({
      status: 'Low Stock',
      page: Number(page),
      limit: Number(limit)
    });
    return {
      data: result.data,
      meta: result.meta,
      recordCount: result.data.length
    };
  }

  /**
   * 9. GET /api/dashboard/kpis/receivables
   * Total Outstanding, Overdue Amount, Overdue Invoices, Average Days to Pay
   */
  static async getReceivablesKpis({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const metrics = await ReceivablesRepository.getReceivablesMetrics(fromDate, toDate);

    return {
      data: {
        totalOutstanding: metrics.totalOutstanding,
        overdueAmount: metrics.overdueAmount,
        overdueInvoicesCount: metrics.overdueInvoicesCount,
        averageDaysToPay: metrics.avgDaysToPay
      },
      recordCount: metrics.overdueInvoicesCount + metrics.paidInvoicesCount
    };
  }

  /**
   * 10. GET /api/dashboard/receivables/aging
   * Aging bucket breakdown
   */
  static async getReceivablesAging() {
    const now = new Date();
    const invoices = await Receivable.find({ status: { $in: ['Unpaid', 'Partially Paid'] } }).lean();

    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    invoices.forEach((inv) => {
      const diffMs = now.getTime() - new Date(inv.dueDate).getTime();
      const daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const amount = inv.amountOutstanding || 0;

      if (daysPastDue <= 30) {
        buckets['0-30'] += amount;
      } else if (daysPastDue <= 60) {
        buckets['31-60'] += amount;
      } else if (daysPastDue <= 90) {
        buckets['61-90'] += amount;
      } else {
        buckets['90+'] += amount;
      }
    });

    const series = [
      { bucket: '0-30 Days', amount: buckets['0-30'] },
      { bucket: '31-60 Days', amount: buckets['31-60'] },
      { bucket: '61-90 Days', amount: buckets['61-90'] },
      { bucket: '90+ Days', amount: buckets['90+'] }
    ];

    return {
      data: {
        buckets,
        series
      },
      recordCount: invoices.length
    };
  }

  /**
   * 11. GET /api/dashboard/receivables/{id}
   * Single invoice detail
   */
  static async getReceivableById(id) {
    let inv = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      inv = await Receivable.findById(id).lean();
    }
    if (!inv) {
      inv = await Receivable.findOne({ invoiceNumber: id }).lean();
    }
    if (!inv) return null;

    const [customer, order] = await Promise.all([
      Customer.findById(inv.customerId).lean(),
      CustomerOrder.findById(inv.orderId).lean()
    ]);

    return {
      data: {
        ...inv,
        customer,
        order
      },
      recordCount: 1
    };
  }

  /**
   * 12. GET /api/dashboard/rankings/products
   * Top products by sales
   */
  static async getRankingsProducts({ from = null, to = null, limit = 5 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const products = await AnalyticsRepository.getTopProducts(fromDate, toDate, Number(limit));

    return {
      data: products,
      recordCount: products.length
    };
  }

  /**
   * 13. GET /api/dashboard/rankings/customers
   * Top customers by sales
   */
  static async getRankingsCustomers({ from = null, to = null, limit = 5 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const customers = await AnalyticsRepository.getTopCustomers(fromDate, toDate, Number(limit));

    return {
      data: customers,
      recordCount: customers.length
    };
  }

  /**
   * 14. GET /api/dashboard/kpis/operational
   * Fulfillment Time, Return Rate, Repeat Customer Rate, Inventory Turnover
   */
  static async getOperationalKpis({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });

    const [ordersMetrics, opMetrics, liveInv, periodCOGS] = await Promise.all([
      OrdersRepository.getOrdersMetrics(fromDate, toDate),
      AnalyticsRepository.getOperationalMetrics(fromDate, toDate),
      InventoryRepository.getLiveInventoryMetrics(),
      InventoryRepository.getPeriodCOGS(fromDate, toDate)
    ]);

    // Average Fulfillment Time in days: deliveredDate - orderDate
    const averageFulfillmentTime = ordersMetrics.avgFulfillmentHours > 0
      ? Number((ordersMetrics.avgFulfillmentHours / 24).toFixed(1))
      : 0;

    // Return Rate: count of Returned orders / Total Orders * 100
    const returnedOrdersCount = ordersMetrics.statusCounts.Returned || 0;
    const totalOrders = ordersMetrics.totalOrders || 0;
    const returnRate = totalOrders > 0
      ? Number(((returnedOrdersCount / totalOrders) * 100).toFixed(2))
      : opMetrics.returnRatePercent;

    // Repeat Customer Rate: count of customers with >1 order in range / total unique customers * 100
    const repeatCustomerRate = opMetrics.repeatCustomerRatePercent;

    // Inventory Turnover: COGS in selected range / average inventory value (live stock value)
    let inventoryTurnover = 0;
    if (liveInv.totalStockValue > 0) {
      inventoryTurnover = Number((periodCOGS / liveInv.totalStockValue).toFixed(2));
    }

    return {
      data: {
        averageFulfillmentTime,
        returnRate,
        repeatCustomerRate,
        inventoryTurnover
      },
      recordCount: totalOrders
    };
  }

  /**
   * 15. GET /api/dashboard/inventory/outofstock
   * Drill down out of stock list
   */
  static async getInventoryOutOfStock({ page = 1, limit = 25 } = {}) {
    const result = await InventoryRepository.getInventoryDrilldown({
      status: 'Out of Stock',
      page: Number(page),
      limit: Number(limit)
    });
    return {
      data: result.data,
      meta: result.meta,
      recordCount: result.data.length
    };
  }

  /**
   * 16. GET /api/dashboard/trends/orders
   * Order status series for the trend chart
   */
  static async getOrdersTrends({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'year' });
    const match = dateRangeFilter('orderDate', fromDate, toDate);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          statusCounts: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalOrders: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          month: '$_id',
          totalOrders: 1,
          statusCounts: 1
        }
      }
    ];

    const results = await CustomerOrder.aggregate(pipeline);
    return {
      data: results,
      recordCount: results.length
    };
  }

  /**
   * 17. GET /api/dashboard/receivables/outstanding
   * Drill down outstanding invoices list
   */
  static async getReceivablesOutstanding({ page = 1, limit = 25 } = {}) {
    const result = await ReceivablesRepository.getReceivablesDrilldown({
      status: 'Unpaid',
      page: Number(page),
      limit: Number(limit)
    });
    return {
      data: result.data,
      meta: result.meta,
      recordCount: result.data.length
    };
  }

  /**
   * 18. GET /api/dashboard/receivables/overdue
   * Drill down overdue invoices list
   */
  static async getReceivablesOverdue({ page = 1, limit = 25 } = {}) {
    const result = await ReceivablesRepository.getReceivablesDrilldown({
      status: 'OVERDUE',
      page: Number(page),
      limit: Number(limit)
    });
    return {
      data: result.data,
      meta: result.meta,
      recordCount: result.data.length
    };
  }

  /**
   * 19. GET /api/dashboard/trends/receivables
   * Outstanding and overdue amount series for the trend chart
   */
  static async getReceivablesTrends({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'year' });
    const now = new Date();

    const pipeline = [
      { $match: dateRangeFilter('invoiceDate', fromDate, toDate) },
      {
        $project: {
          month: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          amountOutstanding: 1,
          isOverdue: {
            $and: [
              { $in: ['$status', ['Unpaid', 'Partially Paid']] },
              { $lt: ['$dueDate', now] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$month',
          outstandingAmount: { $sum: '$amountOutstanding' },
          overdueAmount: {
            $sum: { $cond: ['$isOverdue', '$amountOutstanding', 0] }
          },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          month: '$_id',
          outstandingAmount: 1,
          overdueAmount: 1,
          invoiceCount: 1
        }
      }
    ];

    const results = await Receivable.aggregate(pipeline);
    return {
      data: results,
      recordCount: results.length
    };
  }

  /**
   * 20. GET /api/dashboard/operational/fulfillment-time/drilldown
   * Drill down orders behind Average Fulfillment Time
   */
  static async getFulfillmentTimeDrilldown({ from = null, to = null, page = 1, limit = 25 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const match = {
      status: 'Delivered',
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [total, orders] = await Promise.all([
      CustomerOrder.countDocuments(match),
      CustomerOrder.find(match)
        .populate('customerId', 'name customerCode region')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);

    const formatted = orders.map((o) => {
      const orderMs = new Date(o.orderDate).getTime();
      const deliveredMs = o.fulfillmentDate ? new Date(o.fulfillmentDate).getTime() : orderMs;
      const durationHours = Number(((deliveredMs - orderMs) / (1000 * 60 * 60)).toFixed(1));
      const durationDays = Number((durationHours / 24).toFixed(1));

      return {
        id: o._id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        deliveredDate: o.fulfillmentDate,
        durationHours,
        durationDays,
        customerName: o.customerId?.name || 'Unknown',
        customerCode: o.customerId?.customerCode || ''
      };
    });

    return {
      data: formatted,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      recordCount: formatted.length
    };
  }

  /**
   * 21. GET /api/dashboard/operational/returns/drilldown
   * Drill down orders behind Return Rate
   */
  static async getReturnsDrilldown({ from = null, to = null, page = 1, limit = 25 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const match = {
      status: 'Returned',
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [total, orders] = await Promise.all([
      CustomerOrder.countDocuments(match),
      CustomerOrder.find(match)
        .populate('customerId', 'name customerCode region')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);

    const orderIds = orders.map((o) => o._id);
    const lines = await OrderLine.find({ orderId: { $in: orderIds } }).populate('productId', 'name productCode').lean();
    const linesByOrder = new Map();
    lines.forEach((l) => {
      const arr = linesByOrder.get(String(l.orderId)) || [];
      arr.push(l);
      linesByOrder.set(String(l.orderId), arr);
    });

    const formatted = orders.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      status: o.status,
      customerName: o.customerId?.name || 'Unknown',
      items: linesByOrder.get(String(o._id)) || []
    }));

    return {
      data: formatted,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      recordCount: formatted.length
    };
  }

  /**
   * 22. GET /api/dashboard/operational/repeat-customers/drilldown
   * Drill down customers behind Repeat Customer Rate
   */
  static async getRepeatCustomersDrilldown({ from = null, to = null, page = 1, limit = 25 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const match = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$customerId',
          orderCount: { $sum: 1 },
          orders: { $push: { id: '$_id', orderNumber: '$orderNumber', orderDate: '$orderDate' } }
        }
      },
      { $match: { orderCount: { $gte: 2 } } },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          id: '$_id',
          customerId: '$_id',
          customerName: '$customer.name',
          customerCode: '$customer.customerCode',
          region: '$customer.region',
          orderCount: 1,
          orders: 1
        }
      },
      { $sort: { orderCount: -1 } }
    ];

    const allRepeats = await CustomerOrder.aggregate(pipeline);
    const skip = (Number(page) - 1) * Number(limit);
    const paginated = allRepeats.slice(skip, skip + Number(limit));

    return {
      data: paginated,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: allRepeats.length,
        totalPages: Math.ceil(allRepeats.length / Number(limit))
      },
      recordCount: paginated.length
    };
  }

  /**
   * 23. GET /api/dashboard/trends/operational
   * Fulfillment time, return rate, repeat customer rate, and inventory turnover series for the trend charts
   */
  static async getOperationalTrends({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'year' });

    const pipeline = [
      { $match: dateRangeFilter('orderDate', fromDate, toDate) },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
          },
          returnedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] }
          },
          totalFulfillmentMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Delivered'] },
                    { $ne: ['$fulfillmentDate', null] }
                  ]
                },
                { $subtract: ['$fulfillmentDate', '$orderDate'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          month: '$_id',
          totalOrders: 1,
          deliveredOrders: 1,
          returnedOrders: 1,
          returnRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $round: [{ $multiply: [{ $divide: ['$returnedOrders', '$totalOrders'] }, 100] }, 2] },
              0
            ]
          },
          avgFulfillmentDays: {
            $cond: [
              { $gt: ['$deliveredOrders', 0] },
              {
                $round: [
                  {
                    $divide: [
                      '$totalFulfillmentMs',
                      { $multiply: ['$deliveredOrders', 1000 * 60 * 60 * 24] }
                    ]
                  },
                  1
                ]
              },
              0
            ]
          }
        }
      }
    ];

    const results = await CustomerOrder.aggregate(pipeline);
    return {
      data: results,
      recordCount: results.length
    };
  }

  /**
   * 24. GET /api/dashboard/operational/inventory-turnover/drilldown
   * Drill down products behind Inventory Turnover
   */
  static async getInventoryTurnoverDrilldown({ from = null, to = null, page = 1, limit = 25 } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'month' });
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const validOrders = await CustomerOrder.find(ordersMatch, { _id: 1 }).lean();
    const orderIds = validOrders.map((o) => o._id);

    const cogsByProduct = await OrderLine.aggregate([
      { $match: { orderId: { $in: orderIds }, isReturn: false } },
      {
        $group: {
          _id: '$productId',
          cogs: { $sum: { $multiply: ['$quantity', '$unitCostAtSale'] } },
          unitsSold: { $sum: '$quantity' }
        }
      }
    ]);
    const cogsMap = new Map(cogsByProduct.map((c) => [String(c._id), c]));

    const skip = (Number(page) - 1) * Number(limit);
    const [total, positions] = await Promise.all([
      InventoryPosition.countDocuments(),
      InventoryPosition.find()
        .populate('productId', 'name productCode category unitCost unitPrice reorderThreshold')
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);

    const formatted = positions.map((pos) => {
      const cogsInfo = cogsMap.get(String(pos.productId?._id || pos.productId)) || { cogs: 0, unitsSold: 0 };
      const stockVal = pos.stockValue || ((pos.currentStock || 0) * (pos.productId?.unitCost || 0));
      const turnoverRate = stockVal > 0 ? Number((cogsInfo.cogs / stockVal).toFixed(2)) : 0;

      return {
        id: pos._id,
        productId: pos.productId?._id,
        productName: pos.productId?.name,
        productCode: pos.productId?.productCode,
        category: pos.productId?.category,
        unitCost: pos.productId?.unitCost,
        currentStock: pos.currentStock,
        stockValue: stockVal,
        cogs: cogsInfo.cogs,
        unitsSold: cogsInfo.unitsSold,
        turnoverRate
      };
    });

    return {
      data: formatted,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      recordCount: formatted.length
    };
  }

  /**
   * 25. GET /api/dashboard/trends/inventory
   * Stock in vs stock out series for the trend chart
   */
  static async getInventoryTrends({ from = null, to = null } = {}) {
    const { fromDate, toDate } = resolveDateRange({ from, to, preset: from && to ? 'custom' : 'year' });
    const match = dateRangeFilter('movementDate', fromDate, toDate);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: '%Y-%m', date: '$movementDate' } },
            type: '$movementType'
          },
          totalQty: { $sum: { $abs: '$quantityChange' } }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          stockIn: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'Stock In'] }, '$totalQty', 0] }
          },
          stockOut: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'Stock Out'] }, '$totalQty', 0] }
          },
          returns: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'Return'] }, '$totalQty', 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          month: '$_id',
          stockIn: 1,
          stockOut: 1,
          returns: 1
        }
      }
    ];

    const results = await InventoryMovement.aggregate(pipeline);
    return {
      data: results,
      recordCount: results.length
    };
  }
}
