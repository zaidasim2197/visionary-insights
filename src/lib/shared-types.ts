/** Types shared by the API layer and the UI. No business logic lives here. */

export type Role = "ADMIN" | "MANAGER" | "VIEWER";

export interface ApiMeta {
  recordCount: number;
  generatedAt: string;
  from: string;
  to: string;
  role: Role;
}

export interface ApiEnvelope<T> extends ApiMeta {
  data: T;
}

export interface SalesKpis {
  totalSales: number | null;
  totalOrders: number;
  averageOrderValue: number | null;
  salesGrowthPct: number | null;
  previousPeriodSales: number | null;
  previousFrom: string;
  previousTo: string;
  hasData: boolean;
}

export interface Point {
  label: string;
  value: number;
}

export interface SalesTrends {
  monthly: { month: string; sales: number; orders: number }[];
  byCategory: Point[];
  growth: { period: string; sales: number }[];
  orderValueDistribution: { bucket: string; count: number }[];
}

export interface OrderKpis {
  ordersPending: number;
  ordersDelivered: number;
  ordersCancelled: number;
  totalOrders: number;
  fulfillmentRatePct: number | null;
  hasData: boolean;
}

export interface OrderTrends {
  statusBreakdown: Point[];
  overTime: { period: string; placed: number; delivered: number }[];
  fulfillmentTrend: { period: string; ratePct: number | null }[];
  pipeline: { stage: string; count: number }[];
}

export interface InventoryKpis {
  totalStockValue: number | null;
  itemsLowOnStock: number;
  itemsOutOfStock: number;
  activeProducts: number;
  inStock: number;
  hasData: boolean;
}

export interface InventoryTrends {
  lowStock: {
    productId: string;
    name: string;
    sku: string;
    category: string;
    onHand: number;
    available: number;
    reorderLevel: number;
  }[];
  valueByCategory: Point[];
  stockHealth: Point[];
  fastestMoving: { productId: string; name: string; units: number }[];
}

export interface ReceivableKpis {
  totalOutstanding: number | null;
  overdueAmount: number | null;
  overdueInvoices: number;
  averageDaysToPay: number | null;
  hasData: boolean;
}

export interface ReceivableTrends {
  aging: Point[];
  outstandingOverTime: { period: string; invoiced: number; outstanding: number }[];
  topOverdueCustomers: { customerId: string; name: string; amount: number }[];
  paymentSplit: Point[];
}

export interface Rankings {
  products: { id: string; name: string; category: string; sales: number; units: number }[];
  customers: { id: string; name: string; segment: string; sales: number; orders: number }[];
  byCategory: Point[];
  bySegment: Point[];
}

export interface OperationalKpis {
  avgFulfillmentDays: number | null;
  returnRatePct: number | null;
  repeatCustomerRatePct: number | null;
  inventoryTurnover: number | null;
  hasData: boolean;
}

export interface OperationalTrends {
  fulfillmentTrend: { period: string; days: number | null }[];
  returnTrend: { period: string; ratePct: number | null }[];
  repeatVsNew: Point[];
  turnoverTrend: { period: string; turnover: number | null }[];
}

export interface OrderRecord {
  id: string;
  orderDate: string;
  customerName: string | null;
  status: string;
  channel: string;
  lines: number;
  amount: number;
}

export interface Paged<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
  action: string;
}

export interface SearchHit {
  type: "Customer" | "Product" | "Order" | "Invoice";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
