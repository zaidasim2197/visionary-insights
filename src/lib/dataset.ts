// Data access layer: loads the Vision71 Sales & Operations dataset (columnar JSON
// generated from the supplied CSV source files) and materialises typed records once.

export const REFERENCE_DATE = "2026-09-01";
export const DATA_START_DATE = "2025-03-01";
export const DATA_END_DATE = "2026-08-31";

/** Order statuses that qualify as realised sales (cancelled + not-yet-shipped excluded). */
export const QUALIFYING_STATUSES = [
  "Shipped",
  "Delivered",
  "Returned",
  "Partially Returned",
] as const;

export interface Order {
  order_id: string;
  customer_id: string;
  order_date: string;
  required_date: string | null;
  shipped_date: string | null;
  delivered_date: string | null;
  order_status: string;
  sales_channel: string;
  total_amount: number;
  total_cost: number;
  gross_profit: number;
  delivery_status: string;
  delivery_delay_days: number | null;
  delivery_lead_time_days: number | null;
}

export interface OrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  line_total: number;
  line_cost: number;
}

export interface Product {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  unit_price: number;
  unit_cost: number;
  reorder_level: number;
  preferred_stock_level: number;
  product_status: string;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  industry: string;
  city: string;
  customer_segment: string;
  credit_limit: number;
  payment_terms_days: number;
  account_status: string;
}

export interface InventoryRow {
  product_id: string;
  warehouse: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  preferred_stock_level: number;
}

export interface Receivable {
  invoice_id: string;
  order_id: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  invoice_amount: number;
  amount_paid: number;
}

export interface Payment {
  payment_id: string;
  invoice_id: string;
  order_id: string;
  customer_id: string;
  payment_date: string;
  payment_method: string;
  payment_amount: number;
}

export interface ReturnRow {
  return_id: string;
  order_id: string;
  product_id: string;
  return_date: string;
  quantity_returned: number;
  return_reason: string;
  refund_amount: number;
  return_status: string;
}

export interface Dataset {
  orders: Order[];
  orderItems: OrderItem[];
  products: Product[];
  customers: Customer[];
  inventory: InventoryRow[];
  receivables: Receivable[];
  payments: Payment[];
  returns: ReturnRow[];
  productById: Map<string, Product>;
  customerById: Map<string, Customer>;
  orderById: Map<string, Order>;
  itemsByOrder: Map<string, OrderItem[]>;
  validation: ValidationIssue[];
}

export interface ValidationIssue {
  check: string;
  status: "PASS" | "FAIL";
  details: string;
}

type Columnar = { columns: string[]; rows: unknown[][] };

function materialise<T>(raw: Columnar): T[] {
  const { columns, rows } = raw;
  const out = new Array<T>(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < columns.length; c++) obj[columns[c]!] = row[c];
    out[i] = obj as T;
  }
  return out;
}

function validate(d: Omit<Dataset, "validation">): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (check: string, ok: boolean, details: string) =>
    issues.push({ check, status: ok ? "PASS" : "FAIL", details });

  add("Core files loaded", d.orders.length > 0 && d.orderItems.length > 0, `${d.orders.length} orders, ${d.orderItems.length} order items`);

  const orphanItems = d.orderItems.filter((i) => !d.orderById.has(i.order_id)).length;
  add("Order items link to orders", orphanItems === 0, `${orphanItems} orphan items`);

  const orphanOrders = d.orders.filter((o) => !d.customerById.has(o.customer_id)).length;
  add("Orders link to customers", orphanOrders === 0, `${orphanOrders} orphan orders`);

  const badDates = d.orders.filter((o) => Number.isNaN(Date.parse(o.order_date))).length;
  add("Order dates parse", badDates === 0, `${badDates} unparseable dates`);

  const future = d.orders.filter((o) => (o.delivered_date ?? "") > REFERENCE_DATE).length;
  add("No future deliveries", future === 0, `${future} records after ${REFERENCE_DATE}`);

  const paidByInvoice = new Map<string, number>();
  for (const p of d.payments)
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.payment_amount);
  let maxDiff = 0;
  for (const r of d.receivables) {
    const diff = Math.abs((paidByInvoice.get(r.invoice_id) ?? 0) - r.amount_paid);
    if (diff > maxDiff) maxDiff = diff;
  }
  add("Payments reconcile to receivables", maxDiff < 0.05, `max difference ${maxDiff.toFixed(2)}`);

  const invMissing = d.inventory.filter((i) => !d.productById.has(i.product_id)).length;
  add("Inventory links to products", invMissing === 0, `${invMissing} unmatched inventory rows`);

  return issues;
}

let cached: Promise<Dataset> | null = null;

export function loadDataset(): Promise<Dataset> {
  if (cached) return cached;
  cached = (async () => {
    const [orders, orderItems, products, customers, inventory, receivables, payments, returns] =
      await Promise.all([
        import("../data/orders.json"),
        import("../data/order_items.json"),
        import("../data/products.json"),
        import("../data/customers.json"),
        import("../data/inventory.json"),
        import("../data/receivables.json"),
        import("../data/payments.json"),
        import("../data/returns.json"),
      ]);

    const o = materialise<Order>(orders.default as unknown as Columnar);
    const oi = materialise<OrderItem>(orderItems.default as unknown as Columnar);
    const p = materialise<Product>(products.default as unknown as Columnar);
    const c = materialise<Customer>(customers.default as unknown as Columnar);
    const inv = materialise<InventoryRow>(inventory.default as unknown as Columnar);
    const rec = materialise<Receivable>(receivables.default as unknown as Columnar);
    const pay = materialise<Payment>(payments.default as unknown as Columnar);
    const ret = materialise<ReturnRow>(returns.default as unknown as Columnar);

    const productById = new Map(p.map((x) => [x.product_id, x]));
    const customerById = new Map(c.map((x) => [x.customer_id, x]));
    const orderById = new Map(o.map((x) => [x.order_id, x]));
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of oi) {
      const list = itemsByOrder.get(item.order_id);
      if (list) list.push(item);
      else itemsByOrder.set(item.order_id, [item]);
    }

    const base = {
      orders: o,
      orderItems: oi,
      products: p,
      customers: c,
      inventory: inv,
      receivables: rec,
      payments: pay,
      returns: ret,
      productById,
      customerById,
      orderById,
      itemsByOrder,
    };
    const validation = validate(base);
    if (typeof console !== "undefined") {
      const failed = validation.filter((v) => v.status === "FAIL");
      if (failed.length) console.error("[dataset validation] failures", failed);
    }
    return { ...base, validation };
  })();
  return cached;
}
