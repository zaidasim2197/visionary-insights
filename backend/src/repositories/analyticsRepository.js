import mongoose from 'mongoose';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { OrderLine } from '../models/OrderLine.js';
import { Customer } from '../models/Customer.js';
import { dateRangeFilter, excludeCancelled } from '../utils/dateUtils.js';

export class AnalyticsRepository {
  /**
   * Top 5 Products by sales revenue
   */
  static async getTopProducts(fromDate, toDate, limit = 5) {
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const pipeline = [
      { $match: ordersMatch },
      {
        $lookup: {
          from: 'orderlines',
          localField: '_id',
          foreignField: 'orderId',
          as: 'lines'
        }
      },
      { $unwind: '$lines' },
      { $match: { 'lines.isReturn': false } },
      {
        $group: {
          _id: '$lines.productId',
          totalRevenue: { $sum: '$lines.lineTotal' },
          totalQuantity: { $sum: '$lines.quantity' },
          orderCount: { $addToSet: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          productCode: '$product.productCode',
          productName: '$product.name',
          category: '$product.category',
          totalRevenue: 1,
          totalQuantity: 1,
          ordersCount: { $size: '$orderCount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    return await CustomerOrder.aggregate(pipeline);
  }

  /**
   * Top 5 Customers by total spending
   */
  static async getTopCustomers(fromDate, toDate, limit = 5) {
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const pipeline = [
      { $match: ordersMatch },
      {
        $lookup: {
          from: 'orderlines',
          localField: '_id',
          foreignField: 'orderId',
          as: 'lines'
        }
      },
      {
        $project: {
          customerId: 1,
          orderTotal: { $sum: '$lines.lineTotal' }
        }
      },
      {
        $group: {
          _id: '$customerId',
          totalSpent: { $sum: '$orderTotal' },
          totalOrders: { $sum: 1 }
        }
      },
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
          customerId: '$_id',
          customerCode: '$customer.customerCode',
          customerName: '$customer.name',
          customerEmail: '$customer.email',
          region: '$customer.region',
          customerType: '$customer.customerType',
          totalSpent: 1,
          totalOrders: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit }
    ];

    return await CustomerOrder.aggregate(pipeline);
  }

  /**
   * Regional Sales Distribution
   */
  static async getRegionalSales(fromDate, toDate) {
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const pipeline = [
      { $match: ordersMatch },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $lookup: {
          from: 'orderlines',
          localField: '_id',
          foreignField: 'orderId',
          as: 'lines'
        }
      },
      {
        $project: {
          region: '$customer.region',
          orderTotal: { $sum: '$lines.lineTotal' }
        }
      },
      {
        $group: {
          _id: '$region',
          revenue: { $sum: '$orderTotal' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          region: '$_id',
          revenue: 1,
          orderCount: 1,
          _id: 0
        }
      },
      { $sort: { revenue: -1 } }
    ];

    return await CustomerOrder.aggregate(pipeline);
  }

  /**
   * Return Rate & Repeat Customer Rate calculations
   */
  static async getOperationalMetrics(fromDate, toDate) {
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    // 1. Return Rate: Return revenue vs gross revenue
    const returnPipeline = [
      { $match: ordersMatch },
      {
        $lookup: {
          from: 'orderlines',
          localField: '_id',
          foreignField: 'orderId',
          as: 'lines'
        }
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: null,
          grossRevenue: {
            $sum: { $cond: [{ $eq: ['$lines.isReturn', false] }, '$lines.lineTotal', 0] }
          },
          returnedRevenue: {
            $sum: { $cond: [{ $eq: ['$lines.isReturn', true] }, { $abs: '$lines.lineTotal' }, 0] }
          },
          totalLines: { $sum: 1 },
          returnLinesCount: {
            $sum: { $cond: [{ $eq: ['$lines.isReturn', true] }, 1, 0] }
          }
        }
      }
    ];

    // 2. Repeat customer rate: Customers with >= 2 orders in period
    const repeatCustomerPipeline = [
      { $match: ordersMatch },
      {
        $group: {
          _id: '$customerId',
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalUniqueCustomers: { $sum: 1 },
          repeatCustomersCount: {
            $sum: { $cond: [{ $gte: ['$orderCount', 2] }, 1, 0] }
          }
        }
      }
    ];

    const [returnRes, repeatRes] = await Promise.all([
      CustomerOrder.aggregate(returnPipeline),
      CustomerOrder.aggregate(repeatCustomerPipeline)
    ]);

    const grossRevenue = returnRes[0]?.grossRevenue || 0;
    const returnedRevenue = returnRes[0]?.returnedRevenue || 0;
    const returnLinesCount = returnRes[0]?.returnLinesCount || 0;

    const returnRatePercent = grossRevenue > 0
      ? Number(((returnedRevenue / grossRevenue) * 100).toFixed(2))
      : 0;

    const totalUniqueCustomers = repeatRes[0]?.totalUniqueCustomers || 0;
    const repeatCustomersCount = repeatRes[0]?.repeatCustomersCount || 0;

    const repeatCustomerRatePercent = totalUniqueCustomers > 0
      ? Number(((repeatCustomersCount / totalUniqueCustomers) * 100).toFixed(2))
      : 0;

    return {
      returnRatePercent,
      returnedRevenue,
      returnLinesCount,
      repeatCustomerRatePercent,
      repeatCustomersCount,
      totalUniqueCustomers
    };
  }
}
