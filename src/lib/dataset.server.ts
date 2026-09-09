/**
 * Server-only dataset access layer.
 *
 * This is the ONLY place raw records are read. Everything above it consumes
 * typed entities. Replacing this module with real database/API calls does not
 * require any change to the metric layer or the UI.
 */
import customersCsv from "@/data/customers.csv?raw";
import productsCsv from "@/data/products.csv?raw";
import ordersCsv from "@/data/orders.csv?raw";
import orderItemsCsv from "@/data/order_items.csv?raw";
import inventoryCsv from "@/data/inventory.csv?raw";
import receivablesCsv from "@/data/receivables.csv?raw";
import paymentsCsv from "@/data/payments.csv?raw";
import returnsCsv from "@/data/returns.csv?raw";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => (o[h] = r[i] ?? ""));
      return o;
    });
}

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const nullableDate = (v: string) => (v && v.trim() ? v.trim() : null);

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Confirmed"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Returned"
  | "Partially Returned";

export interface Customer {
  id: string;
  name: string;
  industry: string;
  city: string;
  segment: string;
  paymentTermsDays: number;
  status: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  unitCost: number;
  reorderLevel: number;
  active: boolean;
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  orderDate: string;
  requiredDate: string | null;
  deliveredDate: string | null;
  status: OrderStatus;
  channel: string;
  /** net of discounts, before tax — the sum of its order lines */
  subtotal: number;
  totalAmount: number;
  totalCost: number;
}

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
  lineCost: number;
}

export interface InventoryPosition {
  productId: string;
  warehouse: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
  valueAtCost: number;
}

export interface Receivable {
  id: string;
  orderId: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  amountPaid: number;
  outstanding: number;
  status: string;
  agingBucket: string;
  daysOverdue: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  paymentDate: string;
  method: string;
  amount: number;
}

export interface ProductReturn {
  id: string;
  orderId: string;
  productId: string;
  returnDate: string;
  quantity: number;
  reason: string;
  refundAmount: number;
}

export interface Dataset {
  customers: Customer[];
  products: Product[];
  orders: CustomerOrder[];
  orderLines: OrderLine[];
  inventory: InventoryPosition[];
  receivables: Receivable[];
  payments: Payment[];
  returns: ProductReturn[];
  customerById: Map<string, Customer>;
  productById: Map<string, Product>;
  orderById: Map<string, CustomerOrder>;
  linesByOrder: Map<string, OrderLine[]>;
  inventoryByProduct: Map<string, InventoryPosition>;
  /** Latest business date present in the dataset (dataset reference date). */
  referenceDate: string;
  loadedAt: string;
}

let cache: Dataset | null = null;

export function getDataset(): Dataset {
  if (cache) return cache;

  const customers: Customer[] = parseCsv(customersCsv).map((r) => ({
    id: r["customer_id"],
    name: r["customer_name"],
    industry: r["industry"],
    city: r["city"],
    segment: r["customer_segment"],
    paymentTermsDays: num(r["payment_terms_days"]),
    status: r["account_status"],
  }));

  const products: Product[] = parseCsv(productsCsv).map((r) => ({
    id: r["product_id"],
    sku: r["sku"],
    name: r["product_name"],
    category: r["category"],
    unitPrice: num(r["unit_price"]),
    unitCost: num(r["unit_cost"]),
    reorderLevel: num(r["reorder_level"]),
    active: r["product_status"] === "Active",
  }));

  const orders: CustomerOrder[] = parseCsv(ordersCsv).map((r) => ({
    id: r["order_id"],
    customerId: r["customer_id"],
    orderDate: r["order_date"],
    requiredDate: nullableDate(r["required_date"]),
    deliveredDate: nullableDate(r["delivered_date"]),
    status: r["order_status"] as OrderStatus,
    channel: r["sales_channel"],
    subtotal: num(r["subtotal"]),
    totalAmount: num(r["total_amount"]),
    totalCost: num(r["total_cost"]),
  }));

  const orderLines: OrderLine[] = parseCsv(orderItemsCsv).map((r) => ({
    id: r["order_item_id"],
    orderId: r["order_id"],
    productId: r["product_id"],
    quantity: num(r["quantity"]),
    unitPrice: num(r["unit_price"]),
    unitCost: num(r["unit_cost"]),
    lineTotal: num(r["line_total"]),
    lineCost: num(r["line_cost"]),
  }));

  const inventory: InventoryPosition[] = parseCsv(inventoryCsv).map((r) => ({
    productId: r["product_id"],
    warehouse: r["warehouse"],
    quantityOnHand: num(r["quantity_on_hand"]),
    quantityReserved: num(r["quantity_reserved"]),
    quantityAvailable: num(r["quantity_available"]),
    reorderLevel: num(r["reorder_level"]),
    valueAtCost: num(r["inventory_value_at_cost"]),
  }));

  const receivables: Receivable[] = parseCsv(receivablesCsv).map((r) => ({
    id: r["invoice_id"],
    orderId: r["order_id"],
    customerId: r["customer_id"],
    invoiceDate: r["invoice_date"],
    dueDate: r["due_date"],
    invoiceAmount: num(r["invoice_amount"]),
    amountPaid: num(r["amount_paid"]),
    outstanding: num(r["outstanding_amount"]),
    status: r["payment_status"],
    agingBucket: r["aging_bucket"],
    daysOverdue: num(r["days_overdue"]),
  }));

  const payments: Payment[] = parseCsv(paymentsCsv).map((r) => ({
    id: r["payment_id"],
    invoiceId: r["invoice_id"],
    customerId: r["customer_id"],
    paymentDate: r["payment_date"],
    method: r["payment_method"],
    amount: num(r["payment_amount"]),
  }));

  const returns: ProductReturn[] = parseCsv(returnsCsv).map((r) => ({
    id: r["return_id"],
    orderId: r["order_id"],
    productId: r["product_id"],
    returnDate: r["return_date"],
    quantity: num(r["quantity_returned"]),
    reason: r["return_reason"],
    refundAmount: num(r["refund_amount"]),
  }));

  const linesByOrder = new Map<string, OrderLine[]>();
  for (const l of orderLines) {
    const arr = linesByOrder.get(l.orderId);
    if (arr) arr.push(l);
    else linesByOrder.set(l.orderId, [l]);
  }

  const referenceDate = orders.reduce(
    (max, o) => (o.orderDate > max ? o.orderDate : max),
    orders[0]?.orderDate ?? "2026-08-31",
  );

  cache = {
    customers,
    products,
    orders,
    orderLines,
    inventory,
    receivables,
    payments,
    returns,
    customerById: new Map(customers.map((c) => [c.id, c])),
    productById: new Map(products.map((p) => [p.id, p])),
    orderById: new Map(orders.map((o) => [o.id, o])),
    linesByOrder,
    inventoryByProduct: new Map(inventory.map((i) => [i.productId, i])),
    referenceDate,
    loadedAt: new Date().toISOString(),
  };
  return cache;
}
