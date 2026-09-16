import mongoose from 'mongoose';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { dateRangeFilter, excludeCancelled } from '../utils/dateUtils.js';

export class SalesRepository {
  /**
   * Builds the base $match stage for sales orders
   */
  static buildSalesMatch(fromDate, toDate, extraFilters = {}) {
    const match = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate),
      ...extraFilters
    };
    return match;
  }

  /**
   * Aggregates sales KPIs for a given period
   */
  static async getSalesMetrics(fromDate, toDate) {
    const match = this.buildSalesMatch(fromDate, toDate);

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
        $project: {
          _id: 1,
          orderNumber: 1,
          orderDate: 1,
          orderTotal: { $sum: '$lines.lineTotal' }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$orderTotal' },
          totalOrders: { $sum: 1 }
        }
      }
    ];

    const result = await CustomerOrder.aggregate(pipeline);
    const totalSales = result[0]?.totalSales || 0;
    const totalOrders = result[0]?.totalOrders || 0;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    return { totalSales, totalOrders, averageOrderValue };
  }

  /**
   * Drilldown query reusing the exact same sales matching criteria
   */
  static async getSalesDrilldown(fromDate, toDate, { page = 1, limit = 25, sort = { orderDate: -1 }, search = '' } = {}) {
    const match = this.buildSalesMatch(fromDate, toDate);

    const basePipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
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
          id: '$_id',
          orderNumber: 1,
          orderDate: 1,
          status: 1,
          customerId: 1,
          customerName: '$customer.name',
          customerRegion: '$customer.region',
          itemCount: { $size: '$lines' },
          orderTotal: { $sum: '$lines.lineTotal' }
        }
      }
    ];

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      basePipeline.push({
        $match: {
          $or: [
            { orderNumber: regex },
            { customerName: regex }
          ]
        }
      });
    }

    const countPipeline = [...basePipeline, { $count: 'total' }];
    const countResult = await CustomerOrder.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 0;
    const skip = (page - 1) * limit;

    const dataPipeline = [
      ...basePipeline,
      { $sort: sort },
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await CustomerOrder.aggregate(dataPipeline);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
}
