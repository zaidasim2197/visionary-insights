import { z } from 'zod';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Receivable } from '../models/Receivable.js';

const orderImportRowSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  customerCode: z.string().min(1, 'Customer code is required'),
  productCode: z.string().min(1, 'Product code is required'),
  orderDate: z.string().or(z.date()),
  quantity: z.number().int('Quantity must be an integer'),
  unitPrice: z.number().int('Unit price must be an integer subunit').min(0, 'Unit price cannot be negative'),
  isReturn: z.boolean().default(false)
});

/**
 * Section 2.6 Import Validator
 * Validates arbitrary CSV/JSON rows against data integrity constraints
 */
export class ImportValidator {
  static async validateOrderBatch(rows, { existingInvoiceNumbers = new Set() } = {}) {
    const accepted = [];
    const rejected = [];
    const seenBatchInvoices = new Set(existingInvoiceNumbers);

    // Fetch existing customer and product codes for referential integrity
    const [customers, products, existingReceivables] = await Promise.all([
      Customer.find({}, { customerCode: 1 }).lean(),
      Product.find({}, { productCode: 1, unitCost: 1, unitPrice: 1 }).lean(),
      Receivable.find({}, { invoiceNumber: 1 }).lean()
    ]);

    const validCustomerMap = new Map(customers.map((c) => [c.customerCode, c._id]));
    const validProductMap = new Map(products.map((p) => [p.productCode, p]));
    existingReceivables.forEach((r) => seenBatchInvoices.add(r.invoiceNumber));

    const now = new Date();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;
      const rowErrors = [];

      // 1. Zod structural validation
      const parseResult = orderImportRowSchema.safeParse(row);
      if (!parseResult.success) {
        parseResult.error.errors.forEach((err) => {
          rowErrors.push({
            row: rowNum,
            field: err.path.join('.'),
            message: err.message
          });
        });
        rejected.push({ row: rowNum, data: row, errors: rowErrors });
        continue;
      }

      const data = parseResult.data;

      // 2. Referential integrity: Customer
      const customerId = validCustomerMap.get(data.customerCode);
      if (!customerId) {
        rowErrors.push({
          row: rowNum,
          field: 'customerCode',
          message: `Customer '${data.customerCode}' does not exist (Referential integrity failure).`
        });
      }

      // 3. Referential integrity: Product
      const product = validProductMap.get(data.productCode);
      if (!product) {
        rowErrors.push({
          row: rowNum,
          field: 'productCode',
          message: `Product '${data.productCode}' does not exist (Referential integrity failure).`
        });
      }

      // 4. Quantity rules
      if (!data.isReturn && data.quantity <= 0) {
        rowErrors.push({
          row: rowNum,
          field: 'quantity',
          message: 'Quantity must be strictly positive (> 0) for non-return orders.'
        });
      }

      if (data.isReturn && data.quantity >= 0) {
        rowErrors.push({
          row: rowNum,
          field: 'quantity',
          message: 'Quantity must be negative (< 0) for return orders.'
        });
      }

      // 5. Date validation: No future dates allowed
      const orderDateObj = new Date(data.orderDate);
      if (isNaN(orderDateObj.getTime())) {
        rowErrors.push({
          row: rowNum,
          field: 'orderDate',
          message: 'Invalid date format.'
        });
      } else if (orderDateObj > now) {
        rowErrors.push({
          row: rowNum,
          field: 'orderDate',
          message: 'Future invoice dates are not permitted.'
        });
      }

      // 6. Duplicate invoice number
      if (seenBatchInvoices.has(data.invoiceNumber)) {
        rowErrors.push({
          row: rowNum,
          field: 'invoiceNumber',
          message: `Duplicate invoice number '${data.invoiceNumber}' already exists.`
        });
      }

      if (rowErrors.length > 0) {
        rejected.push({ row: rowNum, data: row, errors: rowErrors });
      } else {
        seenBatchInvoices.add(data.invoiceNumber);
        accepted.push({
          ...data,
          customerId,
          productId: product._id,
          unitCost: product.unitCost,
          orderDate: orderDateObj
        });
      }
    }

    return {
      totalProcessed: rows.length,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      acceptedRecords: accepted,
      rejectedRecords: rejected
    };
  }
}
