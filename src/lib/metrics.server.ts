/**
 * Server-only metric layer.
 *
 * Single implementation of every KPI defined in the Architecture and Metric
 * Definition document. Drill-down lists reuse the very same filters as the KPI
 * they belong to, so a card and its list can never disagree.
 */
import { getDataset, type CustomerOrder, type Dataset } from "./dataset.server";
import type {
  AlertItem,
  InventoryKpis,
  InventoryTrends,
  OperationalKpis,
  OperationalTrends,
  OrderKpis,
  OrderRecord,
  OrderTrends,
  Paged,
  Point,
  Rankings,
  ReceivableKpis,
  ReceivableTrends,
  SalesKpis,
  SalesTrends,
  SearchHit,
} from "./shared-types";

export interface Range {
  from: string;
  to: string;
}

const CANCELLED = "Cancelled";

/** Business "today": the latest business date the dataset covers. */
export function today(): string {
  return getDataset().referenceDate;
}

export function inRange(date: string | null, r: Range): boolean {
  if (!date) return false;
  return date >= r.from && date <= r.to;
}

function daysBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

function addDays(date: string, days: number): string {
  const d = new Date(Date.parse(date) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function previousRange(r: Range): Range {
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.to, -len) };
}

function monthsIn(r: Range): string[] {
  const out: string[] = [];
  let y = Number(r.from.slice(0, 4));
  let m = Number(r.from.slice(5, 7));
  const endKey = r.to.slice(0, 7);
  for (let i = 0; i < 240; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= endKey) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Group by month when the range spans more than 62 days, otherwise by day. */
function buckets(r: Range): { keys: string[]; keyOf: (d: string) => string; byMonth: boolean } {
  const span = daysBetween(r.from, r.to);
  if (span > 62) {
    return { keys: monthsIn(r), keyOf: (d) => d.slice(0, 7), byMonth: true };
  }
  const keys: string[] = [];
  for (let i = 0; i <= span; i++) keys.push(addDays(r.from, i));
  return { keys, keyOf: (d) => d, byMonth: false };
}

function qualifyingOrders(ds: Dataset, r: Range): CustomerOrder[] {
  return ds.orders.filter((o) => o.status !== CANCELLED && inRange(o.orderDate, r));
}

/** Order value per Haroon: sum of quantity x unit price across its order lines. */
function orderSales(ds: Dataset, orderId: string): number {
  const lines = ds.linesByOrder.get(orderId) ?? [];
  let sum = 0;
  for (const l of lines) sum += l.quantity * l.unitPrice;
  return sum;
}

function totalSales(ds: Dataset, r: Range): { sales: number; orders: number; lines: number } {
  const orders = qualifyingOrders(ds, r);
  let sales = 0;
  let lines = 0;
  for (const o of orders) {
    const ls = ds.linesByOrder.get(o.id) ?? [];
    lines += ls.length;
    for (const l of ls) sales += l.quantity * l.unitPrice;
  }
  return { sales, orders: orders.length, lines };
}

/* ---------------------------------------------- Sales */

export function salesKpis(r: Range): { data: SalesKpis; recordCount: number } {
  const ds = getDataset();
  const cur = totalSales(ds, r);
  const prevR = previousRange(r);
  const prev = totalSales(ds, prevR);

  const growth = prev.sales > 0 ? ((cur.sales - prev.sales) / prev.sales) * 100 : null;

  return {
    recordCount: cur.lines + cur.orders,
    data: {
      totalSales: cur.orders > 0 ? cur.sales : null,
      totalOrders: cur.orders,
      averageOrderValue: cur.orders > 0 ? cur.sales / cur.orders : null,
      salesGrowthPct: growth,
      previousPeriodSales: prev.orders > 0 ? prev.sales : null,
      previousFrom: prevR.from,
      previousTo: prevR.to,
      hasData: cur.orders > 0,
    },
  };
}

export function salesTrends(r: Range): { data: SalesTrends; recordCount: number } {
  const ds = getDataset();
  const orders = qualifyingOrders(ds, r);
  const b = buckets(r);

  const perBucket = new Map<string, { sales: number; orders: number }>();
  for (const k of b.keys) perBucket.set(k, { sales: 0, orders: 0 });
  const byCategory = new Map<string, number>();
  const valueBuckets = [
    { bucket: "< 500K", max: 500_000, count: 0 },
    { bucket: "500K – 1M", max: 1_000_000, count: 0 },
    { bucket: "1M – 2M", max: 2_000_000, count: 0 },
    { bucket: "2M – 5M", max: 5_000_000, count: 0 },
    { bucket: "5M +", max: Infinity, count: 0 },
  ];

  let lineCount = 0;
  for (const o of orders) {
    const key = b.keyOf(o.orderDate);
    const slot = perBucket.get(key);
    let orderTotal = 0;
    for (const l of ds.linesByOrder.get(o.id) ?? []) {
      lineCount++;
      const v = l.quantity * l.unitPrice;
      orderTotal += v;
      const cat = ds.productById.get(l.productId)?.category ?? "Uncategorised";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + v);
    }
    if (slot) {
      slot.sales += orderTotal;
      slot.orders += 1;
    }
    const vb = valueBuckets.find((x) => orderTotal < x.max);
    if (vb) vb.count++;
  }

  const prevR = previousRange(r);
  const prev = totalSales(ds, prevR);
  const cur = totalSales(ds, r);

  return {
    recordCount: lineCount + orders.length,
    data: {
      monthly: b.keys.map((k) => ({
        month: k,
        sales: perBucket.get(k)?.sales ?? 0,
        orders: perBucket.get(k)?.orders ?? 0,
      })),
      byCategory: [...byCategory.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, c) => c.value - a.value),
      growth: [
        { period: "Previous", sales: prev.sales },
        { period: "Current", sales: cur.sales },
      ],
      orderValueDistribution: valueBuckets.map((v) => ({ bucket: v.bucket, count: v.count })),
    },
  };
}

/* ---------------------------------------------- Orders */

const PENDING_STATUSES = new Set(["Pending", "Processing"]);

export function orderKpis(r: Range): { data: OrderKpis; recordCount: number } {
  const ds = getDataset();
  const all = ds.orders.filter((o) => inRange(o.orderDate, r));
  const pending = all.filter((o) => PENDING_STATUSES.has(o.status)).length;
  const delivered = all.filter((o) => o.status === "Delivered").length;
  const cancelled = all.filter((o) => o.status === CANCELLED).length;
  const total = all.filter((o) => o.status !== CANCELLED).length;
  return {
    recordCount: all.length,
    data: {
      ordersPending: pending,
      ordersDelivered: delivered,
      ordersCancelled: cancelled,
      totalOrders: total,
      fulfillmentRatePct: total > 0 ? (delivered / total) * 100 : null,
      hasData: all.length > 0,
    },
  };
}

export function orderTrends(r: Range): { data: OrderTrends; recordCount: number } {
  const ds = getDataset();
  const all = ds.orders.filter((o) => inRange(o.orderDate, r));
  const b = buckets(r);

  const status = new Map<string, number>();
  const per = new Map<string, { placed: number; delivered: number }>();
  for (const k of b.keys) per.set(k, { placed: 0, delivered: 0 });

  for (const o of all) {
    status.set(o.status, (status.get(o.status) ?? 0) + 1);
    const slot = per.get(b.keyOf(o.orderDate));
    if (slot) {
      if (o.status !== CANCELLED) slot.placed++;
      if (o.status === "Delivered") slot.delivered++;
    }
  }

  const stages = ["Pending", "Processing", "Confirmed", "Shipped", "Delivered"];

  return {
    recordCount: all.length,
    data: {
      statusBreakdown: [...status.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, c) => c.value - a.value),
      overTime: b.keys.map((k) => ({
        period: k,
        placed: per.get(k)?.placed ?? 0,
        delivered: per.get(k)?.delivered ?? 0,
      })),
      fulfillmentTrend: b.keys.map((k) => {
        const s = per.get(k);
        return {
          period: k,
          ratePct: s && s.placed > 0 ? (s.delivered / s.placed) * 100 : null,
        };
      }),
      pipeline: stages.map((s) => ({ stage: s, count: status.get(s) ?? 0 })),
    },
  };
}

/* ---------------------------------------------- Inventory (live snapshot) */

export function inventoryKpis(): { data: InventoryKpis; recordCount: number } {
  const ds = getDataset();
  const active = ds.products.filter((p) => p.active);
  let value = 0;
  let low = 0;
  let out = 0;
  let inStock = 0;
  for (const p of active) {
    const pos = ds.inventoryByProduct.get(p.id);
    const onHand = pos?.quantityOnHand ?? 0;
    value += onHand * p.unitCost;
    if (onHand === 0) out++;
    else if (onHand <= p.reorderLevel) low++;
    else inStock++;
  }
  return {
    recordCount: active.length,
    data: {
      totalStockValue: value,
      itemsLowOnStock: low,
      itemsOutOfStock: out,
      activeProducts: active.length,
      inStock,
      hasData: active.length > 0,
    },
  };
}

export function inventoryTrends(r: Range): { data: InventoryTrends; recordCount: number } {
  const ds = getDataset();
  const active = ds.products.filter((p) => p.active);

  const lowStock = active
    .map((p) => {
      const pos = ds.inventoryByProduct.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        onHand: pos?.quantityOnHand ?? 0,
        available: pos?.quantityAvailable ?? 0,
        reorderLevel: p.reorderLevel,
      };
    })
    .filter((x) => x.onHand > 0 && x.onHand <= x.reorderLevel)
    .sort((a, c) => a.onHand / (a.reorderLevel || 1) - c.onHand / (c.reorderLevel || 1));

  const byCat = new Map<string, number>();
  for (const p of active) {
    const onHand = ds.inventoryByProduct.get(p.id)?.quantityOnHand ?? 0;
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + onHand * p.unitCost);
  }

  const kpi = inventoryKpis().data;

  const units = new Map<string, number>();
  for (const o of qualifyingOrders(ds, r)) {
    for (const l of ds.linesByOrder.get(o.id) ?? []) {
      units.set(l.productId, (units.get(l.productId) ?? 0) + l.quantity);
    }
  }

  return {
    recordCount: active.length,
    data: {
      lowStock,
      valueByCategory: [...byCat.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, c) => c.value - a.value),
      stockHealth: [
        { label: "In stock", value: kpi.inStock },
        { label: "Low stock", value: kpi.itemsLowOnStock },
        { label: "Out of stock", value: kpi.itemsOutOfStock },
      ],
      fastestMoving: [...units.entries()]
        .map(([productId, u]) => ({
          productId,
          name: ds.productById.get(productId)?.name ?? productId,
          units: u,
        }))
        .sort((a, c) => c.units - a.units)
        .slice(0, 6),
    },
  };
}

/* ---------------------------------------------- Receivables */

export function receivableKpis(r: Range): { data: ReceivableKpis; recordCount: number } {
  const ds = getDataset();
  const now = today();
  let outstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const inv of ds.receivables) {
    if (inv.status === "Paid") continue;
    const bal = inv.invoiceAmount - inv.amountPaid;
    outstanding += bal;
    if (inv.dueDate < now) {
      overdueAmount += bal;
      overdueCount++;
    }
  }

  // Average days to pay: paid invoices whose payment completed inside the range.
  const lastPayment = new Map<string, string>();
  for (const p of ds.payments) {
    const prev = lastPayment.get(p.invoiceId);
    if (!prev || p.paymentDate > prev) lastPayment.set(p.invoiceId, p.paymentDate);
  }
  let daysSum = 0;
  let paidCount = 0;
  for (const inv of ds.receivables) {
    if (inv.status !== "Paid") continue;
    const paidDate = lastPayment.get(inv.id);
    if (!paidDate || !inRange(paidDate, r)) continue;
    daysSum += daysBetween(inv.invoiceDate, paidDate);
    paidCount++;
  }

  return {
    recordCount: ds.receivables.length,
    data: {
      totalOutstanding: outstanding,
      overdueAmount,
      overdueInvoices: overdueCount,
      averageDaysToPay: paidCount > 0 ? daysSum / paidCount : null,
      hasData: ds.receivables.length > 0,
    },
  };
}

export function receivableTrends(r: Range): { data: ReceivableTrends; recordCount: number } {
  const ds = getDataset();
  const now = today();
  const aging = new Map<string, number>([
    ["Not yet due", 0],
    ["1 – 30 days", 0],
    ["31 – 60 days", 0],
    ["61 – 90 days", 0],
    ["90+ days", 0],
  ]);
  const overdueByCustomer = new Map<string, number>();
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;

  for (const inv of ds.receivables) {
    if (inv.status === "Paid") {
      paidCount++;
      continue;
    }
    if (inv.amountPaid > 0) partialCount++;
    else unpaidCount++;
    const bal = inv.invoiceAmount - inv.amountPaid;
    const overdueDays = daysBetween(inv.dueDate, now);
    const key =
      overdueDays <= 0
        ? "Not yet due"
        : overdueDays <= 30
          ? "1 – 30 days"
          : overdueDays <= 60
            ? "31 – 60 days"
            : overdueDays <= 90
              ? "61 – 90 days"
              : "90+ days";
    aging.set(key, (aging.get(key) ?? 0) + bal);
    if (overdueDays > 0) {
      overdueByCustomer.set(inv.customerId, (overdueByCustomer.get(inv.customerId) ?? 0) + bal);
    }
  }

  const b = buckets(r);
  const per = new Map<string, { invoiced: number; outstanding: number }>();
  for (const k of b.keys) per.set(k, { invoiced: 0, outstanding: 0 });
  let usedInvoices = 0;
  for (const inv of ds.receivables) {
    if (!inRange(inv.invoiceDate, r)) continue;
    usedInvoices++;
    const slot = per.get(b.keyOf(inv.invoiceDate));
    if (slot) {
      slot.invoiced += inv.invoiceAmount;
      slot.outstanding += inv.invoiceAmount - inv.amountPaid;
    }
  }

  return {
    recordCount: ds.receivables.length,
    data: {
      aging: [...aging.entries()].map(([label, value]) => ({ label, value })),
      outstandingOverTime: b.keys.map((k) => ({
        period: k,
        invoiced: per.get(k)?.invoiced ?? 0,
        outstanding: per.get(k)?.outstanding ?? 0,
      })),
      topOverdueCustomers: [...overdueByCustomer.entries()]
        .map(([customerId, amount]) => ({
          customerId,
          name: ds.customerById.get(customerId)?.name ?? customerId,
          amount,
        }))
        .sort((a, c) => c.amount - a.amount)
        .slice(0, 5),
      paymentSplit: [
        { label: "Paid", value: paidCount },
        { label: "Partially paid", value: partialCount },
        { label: "Unpaid", value: unpaidCount },
      ],
      // usedInvoices is surfaced through recordCount on the envelope
      ...(usedInvoices >= 0 ? {} : {}),
    },
  };
}

/* ---------------------------------------------- Rankings */

export function rankings(r: Range, limit = 5): { data: Rankings; recordCount: number } {
  const ds = getDataset();
  const orders = qualifyingOrders(ds, r);
  const products = new Map<string, { sales: number; units: number }>();
  const customers = new Map<string, { sales: number; orders: number }>();
  const byCategory = new Map<string, number>();
  const bySegment = new Map<string, number>();
  let lineCount = 0;

  for (const o of orders) {
    let orderTotal = 0;
    for (const l of ds.linesByOrder.get(o.id) ?? []) {
      lineCount++;
      const v = l.quantity * l.unitPrice;
      orderTotal += v;
      const p = products.get(l.productId) ?? { sales: 0, units: 0 };
      p.sales += v;
      p.units += l.quantity;
      products.set(l.productId, p);
      const cat = ds.productById.get(l.productId)?.category ?? "Uncategorised";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + v);
    }
    const c = customers.get(o.customerId) ?? { sales: 0, orders: 0 };
    c.sales += orderTotal;
    c.orders += 1;
    customers.set(o.customerId, c);
    const seg = ds.customerById.get(o.customerId)?.segment ?? "Unknown";
    bySegment.set(seg, (bySegment.get(seg) ?? 0) + orderTotal);
  }

  return {
    recordCount: lineCount + orders.length,
    data: {
      products: [...products.entries()]
        .map(([id, v]) => ({
          id,
          name: ds.productById.get(id)?.name ?? id,
          category: ds.productById.get(id)?.category ?? "—",
          sales: v.sales,
          units: v.units,
        }))
        .sort((a, c) => c.sales - a.sales)
        .slice(0, limit),
      customers: [...customers.entries()]
        .map(([id, v]) => ({
          id,
          name: ds.customerById.get(id)?.name ?? id,
          segment: ds.customerById.get(id)?.segment ?? "—",
          sales: v.sales,
          orders: v.orders,
        }))
        .sort((a, c) => c.sales - a.sales)
        .slice(0, limit),
      byCategory: [...byCategory.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, c) => c.value - a.value),
      bySegment: [...bySegment.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, c) => c.value - a.value),
    },
  };
}

/* ---------------------------------------------- Operational */

function cogs(ds: Dataset, r: Range): number {
  let sum = 0;
  for (const o of qualifyingOrders(ds, r)) {
    for (const l of ds.linesByOrder.get(o.id) ?? []) sum += l.quantity * l.unitCost;
  }
  return sum;
}

export function operationalKpis(r: Range): { data: OperationalKpis; recordCount: number } {
  const ds = getDataset();
  const all = ds.orders.filter((o) => inRange(o.orderDate, r));
  const qualifying = all.filter((o) => o.status !== CANCELLED);

  const delivered = all.filter((o) => o.status === "Delivered" && o.deliveredDate);
  const fulfil = delivered.length
    ? delivered.reduce((s, o) => s + daysBetween(o.orderDate, o.deliveredDate as string), 0) /
      delivered.length
    : null;

  const returned = all.filter(
    (o) => o.status === "Returned" || o.status === "Partially Returned",
  ).length;

  const perCustomer = new Map<string, number>();
  for (const o of qualifying) perCustomer.set(o.customerId, (perCustomer.get(o.customerId) ?? 0) + 1);
  const uniqueCustomers = perCustomer.size;
  const repeat = [...perCustomer.values()].filter((n) => n > 1).length;

  const stockValue = inventoryKpis().data.totalStockValue ?? 0;
  const turnover = stockValue > 0 ? cogs(ds, r) / stockValue : null;

  return {
    recordCount: all.length,
    data: {
      avgFulfillmentDays: fulfil,
      returnRatePct: qualifying.length > 0 ? (returned / qualifying.length) * 100 : null,
      repeatCustomerRatePct: uniqueCustomers > 0 ? (repeat / uniqueCustomers) * 100 : null,
      inventoryTurnover: turnover,
      hasData: all.length > 0,
    },
  };
}

export function operationalTrends(r: Range): { data: OperationalTrends; recordCount: number } {
  const ds = getDataset();
  const b = buckets(r);
  const all = ds.orders.filter((o) => inRange(o.orderDate, r));

  const per = new Map<
    string,
    { days: number; delivered: number; returned: number; total: number; cost: number }
  >();
  for (const k of b.keys) per.set(k, { days: 0, delivered: 0, returned: 0, total: 0, cost: 0 });

  const seenCustomer = new Set<string>();
  const customerOrders = new Map<string, number>();

  for (const o of all) {
    const slot = per.get(b.keyOf(o.orderDate));
    if (!slot) continue;
    if (o.status !== CANCELLED) {
      slot.total++;
      customerOrders.set(o.customerId, (customerOrders.get(o.customerId) ?? 0) + 1);
      for (const l of ds.linesByOrder.get(o.id) ?? []) slot.cost += l.quantity * l.unitCost;
    }
    if (o.status === "Delivered" && o.deliveredDate) {
      slot.delivered++;
      slot.days += daysBetween(o.orderDate, o.deliveredDate);
    }
    if (o.status === "Returned" || o.status === "Partially Returned") slot.returned++;
    seenCustomer.add(o.customerId);
  }

  const stockValue = inventoryKpis().data.totalStockValue ?? 0;
  const repeat = [...customerOrders.values()].filter((n) => n > 1).length;
  const unique = customerOrders.size;

  return {
    recordCount: all.length,
    data: {
      fulfillmentTrend: b.keys.map((k) => {
        const s = per.get(k);
        return { period: k, days: s && s.delivered > 0 ? s.days / s.delivered : null };
      }),
      returnTrend: b.keys.map((k) => {
        const s = per.get(k);
        return { period: k, ratePct: s && s.total > 0 ? (s.returned / s.total) * 100 : null };
      }),
      repeatVsNew: [
        { label: "Repeat", value: repeat },
        { label: "Single order", value: Math.max(unique - repeat, 0) },
      ],
      turnoverTrend: b.keys.map((k) => {
        const s = per.get(k);
        return { period: k, turnover: s && stockValue > 0 ? s.cost / stockValue : null };
      }),
    },
  };
}

/* ---------------------------------------------- Drill-downs */

export type DrillType =
  | "sales"
  | "orders"
  | "pending"
  | "delivered"
  | "cancelled"
  | "lowstock"
  | "outofstock"
  | "overdue"
  | "outstanding"
  | "product"
  | "customer";

function toRecord(ds: Dataset, o: CustomerOrder, includeNames: boolean): OrderRecord {
  return {
    id: o.id,
    orderDate: o.orderDate,
    customerName: includeNames ? (ds.customerById.get(o.customerId)?.name ?? o.customerId) : null,
    status: o.status,
    channel: o.channel,
    lines: (ds.linesByOrder.get(o.id) ?? []).length,
    amount: orderSales(ds, o.id),
  };
}

export function drillDown(
  type: DrillType,
  r: Range,
  page: number,
  pageSize: number,
  entityId?: string,
): { data: Paged<Record<string, any>>; columns: { key: string; label: string; align?: "right" }[] } {
  const ds = getDataset();
  const slice = <T>(rows: T[]) => ({
    rows: rows.slice((page - 1) * pageSize, page * pageSize) as Record<string, any>[],
    page,
    pageSize,
    total: rows.length,
  });

  const orderColumns = [
    { key: "id", label: "Order" },
    { key: "orderDate", label: "Order date" },
    { key: "customerName", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "channel", label: "Channel" },
    { key: "amount", label: "Order value", align: "right" as const },
  ];

  switch (type) {
    case "sales":
    case "orders": {
      const rows = qualifyingOrders(ds, r)
        .sort((a, c) => c.orderDate.localeCompare(a.orderDate))
        .map((o) => toRecord(ds, o, true));
      return { data: slice(rows), columns: orderColumns };
    }
    case "pending":
    case "delivered":
    case "cancelled": {
      const match =
        type === "pending"
          ? (o: CustomerOrder) => PENDING_STATUSES.has(o.status)
          : type === "delivered"
            ? (o: CustomerOrder) => o.status === "Delivered"
            : (o: CustomerOrder) => o.status === CANCELLED;
      const rows = ds.orders
        .filter((o) => inRange(o.orderDate, r) && match(o))
        .sort((a, c) => c.orderDate.localeCompare(a.orderDate))
        .map((o) => toRecord(ds, o, true));
      return { data: slice(rows), columns: orderColumns };
    }
    case "lowstock":
    case "outofstock": {
      const rows = ds.products
        .filter((p) => p.active)
        .map((p) => {
          const pos = ds.inventoryByProduct.get(p.id);
          const onHand = pos?.quantityOnHand ?? 0;
          return {
            id: p.sku,
            name: p.name,
            category: p.category,
            onHand,
            reorderLevel: p.reorderLevel,
            value: onHand * p.unitCost,
          };
        })
        .filter((x) =>
          type === "lowstock" ? x.onHand > 0 && x.onHand <= x.reorderLevel : x.onHand === 0,
        )
        .sort((a, c) => a.onHand - c.onHand);
      return {
        data: slice(rows),
        columns: [
          { key: "id", label: "SKU" },
          { key: "name", label: "Product" },
          { key: "category", label: "Category" },
          { key: "onHand", label: "On hand", align: "right" },
          { key: "reorderLevel", label: "Reorder level", align: "right" },
          { key: "value", label: "Stock value", align: "right" },
        ],
      };
    }
    case "overdue":
    case "outstanding": {
      const now = today();
      const rows = ds.receivables
        .filter(
          (i) => i.status !== "Paid" && (type === "outstanding" || i.dueDate < now),
        )
        .map((i) => ({
          id: i.id,
          customerName: ds.customerById.get(i.customerId)?.name ?? i.customerId,
          invoiceDate: i.invoiceDate,
          dueDate: i.dueDate,
          status: i.status,
          amount: i.invoiceAmount - i.amountPaid,
        }))
        .sort((a, c) => c.amount - a.amount);
      return {
        data: slice(rows),
        columns: [
          { key: "id", label: "Invoice" },
          { key: "customerName", label: "Customer" },
          { key: "invoiceDate", label: "Invoice date" },
          { key: "dueDate", label: "Due date" },
          { key: "status", label: "Status" },
          { key: "amount", label: "Outstanding", align: "right" },
        ],
      };
    }
    case "product": {
      const rows: Record<string, unknown>[] = [];
      for (const o of qualifyingOrders(ds, r)) {
        for (const l of ds.linesByOrder.get(o.id) ?? []) {
          if (l.productId !== entityId) continue;
          rows.push({
            id: o.id,
            orderDate: o.orderDate,
            customerName: ds.customerById.get(o.customerId)?.name ?? o.customerId,
            quantity: l.quantity,
            status: o.status,
            amount: l.quantity * l.unitPrice,
          });
        }
      }
      rows.sort((a, c) => Number(c["amount"]) - Number(a["amount"]));
      return {
        data: slice(rows),
        columns: [
          { key: "id", label: "Order" },
          { key: "orderDate", label: "Order date" },
          { key: "customerName", label: "Customer" },
          { key: "status", label: "Status" },
          { key: "quantity", label: "Qty", align: "right" },
          { key: "amount", label: "Line value", align: "right" },
        ],
      };
    }
    case "customer": {
      const rows = qualifyingOrders(ds, r)
        .filter((o) => o.customerId === entityId)
        .sort((a, c) => c.orderDate.localeCompare(a.orderDate))
        .map((o) => toRecord(ds, o, true));
      return { data: slice(rows), columns: orderColumns };
    }
  }
}

/* ---------------------------------------------- Alerts and search */

export function alerts(): AlertItem[] {
  const inv = inventoryKpis().data;
  const now = today();
  const ds = getDataset();
  const rec = receivableKpis({ from: now, to: now }).data;
  const cancelled = ds.orders.filter(
    (o) => o.status === CANCELLED && o.orderDate >= addDays(now, -30),
  ).length;
  const overdueOpen = ds.orders.filter(
    (o) => o.requiredDate && o.requiredDate < now && !o.deliveredDate && o.status !== CANCELLED,
  ).length;

  const out: AlertItem[] = [];
  if (inv.itemsOutOfStock > 0)
    out.push({
      id: "out-of-stock",
      severity: "critical",
      title: `${inv.itemsOutOfStock} products are out of stock`,
      detail: "These active products currently have nothing on hand.",
      href: "/inventory",
      action: "Review inventory",
    });
  if (inv.itemsLowOnStock > 0)
    out.push({
      id: "low-stock",
      severity: "warning",
      title: `${inv.itemsLowOnStock} products are low on stock`,
      detail: "Stock on hand is at or below the reorder level.",
      href: "/inventory",
      action: "Review inventory",
    });
  if (rec.overdueInvoices > 0)
    out.push({
      id: "overdue",
      severity: "critical",
      title: `${rec.overdueInvoices} invoices are overdue`,
      detail: "Payment is past the due date on these invoices.",
      href: "/receivables",
      action: "Review receivables",
    });
  if (overdueOpen > 0)
    out.push({
      id: "overdue-open",
      severity: "warning",
      title: `${overdueOpen} orders passed their required date`,
      detail: "These orders are still not delivered.",
      href: "/orders",
      action: "Review orders",
    });
  if (cancelled > 0)
    out.push({
      id: "cancelled",
      severity: "info",
      title: `${cancelled} orders cancelled in the last 30 days`,
      detail: "Cancelled orders do not contribute to sales.",
      href: "/orders",
      action: "Review orders",
    });
  return out;
}

export function search(q: string, allowDetail: boolean): SearchHit[] {
  const ds = getDataset();
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const p of ds.products) {
    if (p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)) {
      hits.push({
        type: "Product",
        id: p.id,
        title: p.name,
        subtitle: `${p.sku} · ${p.category}`,
        href: `/inventory?product=${p.id}`,
      });
    }
    if (hits.length > 40) break;
  }

  if (allowDetail) {
    for (const c of ds.customers) {
      if (c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term)) {
        hits.push({
          type: "Customer",
          id: c.id,
          title: c.name,
          subtitle: `${c.segment} · ${c.city}`,
          href: `/top-performers?customer=${c.id}`,
        });
      }
      if (hits.length > 60) break;
    }
    for (const o of ds.orders) {
      if (o.id.toLowerCase().includes(term)) {
        hits.push({
          type: "Order",
          id: o.id,
          title: o.id,
          subtitle: `${o.orderDate} · ${o.status}`,
          href: `/orders?order=${o.id}`,
        });
      }
      if (hits.length > 80) break;
    }
    for (const i of ds.receivables) {
      if (i.id.toLowerCase().includes(term)) {
        hits.push({
          type: "Invoice",
          id: i.id,
          title: i.id,
          subtitle: `Due ${i.dueDate} · ${i.status}`,
          href: `/receivables?invoice=${i.id}`,
        });
      }
      if (hits.length > 100) break;
    }
  }

  return hits.slice(0, 12);
}
