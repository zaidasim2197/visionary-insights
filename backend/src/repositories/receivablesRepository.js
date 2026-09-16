import mongoose from 'mongoose';
import { Receivable } from '../models/Receivable.js';
import { dateRangeFilter } from '../utils/dateUtils.js';

export class ReceivablesRepository {
  /**
   * Aggregates live outstanding and overdue receivables snapshot, plus period average days to pay
   */
  static async getReceivablesMetrics(fromDate, toDate) {
    const now = new Date();

    // 1. Live snapshot pipeline for outstanding and overdue
    const liveSnapshotPipeline = [
      {
        $match: {
          status: { $in: ['Unpaid', 'Partially Paid'] }
        }
      },
      {
        $project: {
          amountOutstanding: 1,
          isOverdue: { $lt: ['$dueDate', now] }
        }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$amountOutstanding' },
          overdueAmount: {
            $sum: { $cond: ['$isOverdue', '$amountOutstanding', 0] }
          },
          overdueInvoicesCount: {
            $sum: { $cond: ['$isOverdue', 1, 0] }
          }
        }
      }
    ];

    // 2. Average days to pay for Paid invoices within date range
    const paidMatch = {
      status: 'Paid',
      paidDate: { $ne: null },
      ...dateRangeFilter('paidDate', fromDate, toDate)
    };

    const avgDaysPipeline = [
      { $match: paidMatch },
      {
        $project: {
          daysToPay: {
            $divide: [
              { $subtract: ['$paidDate', '$invoiceDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDaysToPay: { $avg: '$daysToPay' },
          paidInvoicesCount: { $sum: 1 }
        }
      }
    ];

    const [liveResult, avgDaysResult] = await Promise.all([
      Receivable.aggregate(liveSnapshotPipeline),
      Receivable.aggregate(avgDaysPipeline)
    ]);

    const totalOutstanding = liveResult[0]?.totalOutstanding || 0;
    const overdueAmount = liveResult[0]?.overdueAmount || 0;
    const overdueInvoicesCount = liveResult[0]?.overdueInvoicesCount || 0;

    const avgDaysToPay = avgDaysResult[0]?.avgDaysToPay !== undefined
      ? Number(avgDaysResult[0].avgDaysToPay.toFixed(1))
      : 0;

    const paidInvoicesCount = avgDaysResult[0]?.paidInvoicesCount || 0;

    return {
      totalOutstanding,
      overdueAmount,
      overdueInvoicesCount,
      avgDaysToPay,
      paidInvoicesCount
    };
  }

  /**
   * Receivables drilldown with status & overdue filtering and customer details
   */
  static async getReceivablesDrilldown({ status = 'ALL', isOverdue = null, page = 1, limit = 25, sort = { dueDate: 1 }, search = '' } = {}) {
    const now = new Date();
    const match = {};

    if (status === 'OVERDUE') {
      match.status = { $in: ['Unpaid', 'Partially Paid'] };
      match.dueDate = { $lt: now };
    } else if (status && status !== 'ALL') {
      match.status = status;
    }

    if (isOverdue === true) {
      match.status = { $in: ['Unpaid', 'Partially Paid'] };
      match.dueDate = { $lt: now };
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
          from: 'customerorders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          isOverdueCalc: {
            $and: [
              { $in: ['$status', ['Unpaid', 'Partially Paid']] },
              { $lt: ['$dueDate', now] }
            ]
          },
          daysPastDue: {
            $cond: [
              { $lt: ['$dueDate', now] },
              {
                $floor: {
                  $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24]
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          id: '$_id',
          invoiceNumber: 1,
          invoiceDate: 1,
          dueDate: 1,
          paidDate: 1,
          amountTotal: 1,
          amountPaid: 1,
          amountOutstanding: 1,
          status: 1,
          isOverdue: '$isOverdueCalc',
          daysPastDue: 1,
          customerId: 1,
          customerName: '$customer.name',
          customerEmail: '$customer.email',
          orderNumber: '$order.orderNumber'
        }
      }
    ];

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      basePipeline.push({
        $match: {
          $or: [
            { invoiceNumber: regex },
            { customerName: regex },
            { orderNumber: regex }
          ]
        }
      });
    }

    const countPipeline = [...basePipeline, { $count: 'total' }];
    const countResult = await Receivable.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 0;
    const skip = (page - 1) * limit;

    const dataPipeline = [
      ...basePipeline,
      { $sort: sort },
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await Receivable.aggregate(dataPipeline);

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
