import mongoose from 'mongoose';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { dateRangeFilter } from '../utils/dateUtils.js';

export class OrdersRepository {
  static buildOrdersMatch(fromDate, toDate, extraFilters = {}) {
    return {
      ...dateRangeFilter('orderDate', fromDate, toDate),
      ...extraFilters
    };
  }

  static async getOrdersMetrics(fromDate, toDate) {
    const match = this.buildOrdersMatch(fromDate, toDate);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgFulfillmentMs: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Delivered'] },
                    { $ne: ['$fulfillmentDate', null] }
                  ]
                },
                { $subtract: ['$fulfillmentDate', '$orderDate'] },
                null
              ]
            }
          }
        }
      }
    ];

    const results = await CustomerOrder.aggregate(pipeline);
    const counts = {
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0
    };

    let totalDeliveredMs = 0;
    let deliveredWithTimeCount = 0;

    results.forEach((r) => {
      if (counts[r._id] !== undefined) {
        counts[r._id] = r.count;
      }
      if (r._id === 'Delivered' && r.avgFulfillmentMs !== null) {
        totalDeliveredMs = r.avgFulfillmentMs;
        deliveredWithTimeCount = r.count;
      }
    });

    const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);
    const netOrders = totalOrders - counts.Cancelled;
    const fulfillmentRate = netOrders > 0
      ? Number(((counts.Delivered / netOrders) * 100).toFixed(2))
      : 0;

    const avgFulfillmentHours = deliveredWithTimeCount > 0
      ? Number((totalDeliveredMs / (1000 * 60 * 60)).toFixed(1))
      : 0;

    return {
      totalOrders,
      statusCounts: counts,
      fulfillmentRate,
      avgFulfillmentHours
    };
  }

  static async getOrdersDrilldown(fromDate, toDate, { status = null, page = 1, limit = 25, sort = { orderDate: -1 }, search = '' } = {}) {
    const match = this.buildOrdersMatch(fromDate, toDate);
    if (status && status !== 'ALL') {
      match.status = status;
    }

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
          fulfillmentDate: 1,
          status: 1,
          customerId: 1,
          customerName: '$customer.name',
          customerEmail: '$customer.email',
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
