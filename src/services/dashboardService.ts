import {
  getSalesKpisFn,
  getSalesTrendsFn,
  getOrderKpisFn,
  getOrderTrendsFn,
  getInventoryKpisFn,
  getInventoryTrendsFn,
  getReceivableKpisFn,
  getReceivableTrendsFn,
  getRankingsFn,
  getOperationalKpisFn,
  getOperationalTrendsFn,
  getDrillDownFn,
  getAlertsFn,
  getSearchFn,
  queryAiFn,
} from "@/lib/server-functions";
import type {
  ApiEnvelope,
  AlertItem,
  InventoryKpis,
  InventoryTrends,
  OperationalKpis,
  OperationalTrends,
  OrderKpis,
  OrderTrends,
  Paged,
  Rankings,
  ReceivableKpis,
  ReceivableTrends,
  SalesKpis,
  SalesTrends,
  SearchHit,
  Role,
} from "@/lib/shared-types";
import type { DrillType } from "@/lib/metrics.server";

export interface DateRangeParam {
  from: string;
  to: string;
}

/**
 * Client Data Service Abstraction.
 *
 * All UI components fetch data exclusively through this service.
 * When backend REST APIs are fully deployed, this layer can be switched
 * to raw `fetch('/api/dashboard/...')` without modifying a single line of UI code.
 */
export const dashboardService = {
  async getSalesKpis(range: DateRangeParam, role: Role): Promise<ApiEnvelope<SalesKpis>> {
    return getSalesKpisFn({ data: { from: range.from, to: range.to, role } });
  },

  async getSalesTrends(range: DateRangeParam, role: Role): Promise<ApiEnvelope<SalesTrends>> {
    return getSalesTrendsFn({ data: { from: range.from, to: range.to, role } });
  },

  async getOrderKpis(range: DateRangeParam, role: Role): Promise<ApiEnvelope<OrderKpis>> {
    return getOrderKpisFn({ data: { from: range.from, to: range.to, role } });
  },

  async getOrderTrends(range: DateRangeParam, role: Role): Promise<ApiEnvelope<OrderTrends>> {
    return getOrderTrendsFn({ data: { from: range.from, to: range.to, role } });
  },

  async getInventoryKpis(role: Role): Promise<ApiEnvelope<InventoryKpis>> {
    return getInventoryKpisFn({ data: { role } });
  },

  async getInventoryTrends(range: DateRangeParam, role: Role): Promise<ApiEnvelope<InventoryTrends>> {
    return getInventoryTrendsFn({ data: { from: range.from, to: range.to, role } });
  },

  async getReceivableKpis(range: DateRangeParam, role: Role): Promise<ApiEnvelope<ReceivableKpis>> {
    return getReceivableKpisFn({ data: { from: range.from, to: range.to, role } });
  },

  async getReceivableTrends(range: DateRangeParam, role: Role): Promise<ApiEnvelope<ReceivableTrends>> {
    return getReceivableTrendsFn({ data: { from: range.from, to: range.to, role } });
  },

  async getRankings(range: DateRangeParam, role: Role, limit = 5): Promise<ApiEnvelope<Rankings>> {
    return getRankingsFn({ data: { from: range.from, to: range.to, limit, role } });
  },

  async getOperationalKpis(range: DateRangeParam, role: Role): Promise<ApiEnvelope<OperationalKpis>> {
    return getOperationalKpisFn({ data: { from: range.from, to: range.to, role } });
  },

  async getOperationalTrends(range: DateRangeParam, role: Role): Promise<ApiEnvelope<OperationalTrends>> {
    return getOperationalTrendsFn({ data: { from: range.from, to: range.to, role } });
  },

  async getDrillDown(
    type: DrillType,
    range: DateRangeParam,
    role: Role,
    page = 1,
    pageSize = 25,
    entityId?: string,
  ): Promise<
    ApiEnvelope<{
      data: Paged<Record<string, unknown>>;
      columns: { key: string; label: string; align?: "right" }[];
      restricted?: boolean;
    }>
  > {
    const res = await getDrillDownFn({
      data: { type, from: range.from, to: range.to, page, pageSize, entityId, role },
    });
    return res as unknown as ApiEnvelope<{
      data: Paged<Record<string, unknown>>;
      columns: { key: string; label: string; align?: "right" }[];
      restricted?: boolean;
    }>;
  },

  async getAlerts(role: Role): Promise<ApiEnvelope<AlertItem[]>> {
    return getAlertsFn({ data: { role } });
  },

  async search(query: string, role: Role): Promise<ApiEnvelope<SearchHit[]>> {
    return getSearchFn({ data: { query, role } });
  },

  async queryAi(
    question: string,
    range: DateRangeParam,
    role: Role,
  ): Promise<
    ApiEnvelope<{
      answer: string;
      source: "deterministic_gemini" | "deterministic_fallback";
      question: string;
      keyMetrics?: { label: string; value: string }[];
    }>
  > {
    return queryAiFn({ data: { question, from: range.from, to: range.to, role } });
  },
};
