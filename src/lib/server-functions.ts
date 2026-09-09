import { createServerFn } from "@tanstack/react-start";
import {
  salesKpis,
  salesTrends,
  orderKpis,
  orderTrends,
  inventoryKpis,
  inventoryTrends,
  receivableKpis,
  receivableTrends,
  rankings,
  operationalKpis,
  operationalTrends,
  drillDown,
  alerts,
  search,
  today,
  type DrillType,
} from "./metrics.server";
import { sanitizeCustomerName, canAccessDrillDown } from "./security.server";
import { askAiAssistant } from "./aiEngine.server";
import type { ApiEnvelope, Role } from "./shared-types";

function buildMeta<T>(data: T, recordCount: number, from: string, to: string, role: Role): ApiEnvelope<T> {
  return {
    data,
    recordCount,
    generatedAt: new Date().toISOString(),
    from,
    to,
    role,
  };
}

export const getSalesKpisFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = salesKpis({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getSalesTrendsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = salesTrends({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getOrderKpisFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = orderKpis({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getOrderTrendsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = orderTrends({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getInventoryKpisFn = createServerFn({ method: "GET" })
  .validator((d: { role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const ref = today();
    const res = inventoryKpis();
    return buildMeta(res.data, res.recordCount, ref, ref, role);
  });

export const getInventoryTrendsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = inventoryTrends({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getReceivableKpisFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = receivableKpis({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getReceivableTrendsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = receivableTrends({ from: data.from, to: data.to });

    // Apply security masking on top overdue customers if role is VIEWER
    if (role === "VIEWER") {
      res.data.topOverdueCustomers = res.data.topOverdueCustomers.map((c) => ({
        ...c,
        name: sanitizeCustomerName(c.name, c.customerId, role) ?? "Restricted Customer",
      }));
    }

    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getRankingsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; limit?: number; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const limit = data.limit ?? 5;
    const res = rankings({ from: data.from, to: data.to }, limit);

    // Apply security masking on top customers if role is VIEWER
    if (role === "VIEWER") {
      res.data.customers = res.data.customers.map((c) => ({
        ...c,
        name: sanitizeCustomerName(c.name, c.id, role) ?? "Restricted Customer",
      }));
    }

    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getOperationalKpisFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = operationalKpis({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getOperationalTrendsFn = createServerFn({ method: "GET" })
  .validator((d: { from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const res = operationalTrends({ from: data.from, to: data.to });
    return buildMeta(res.data, res.recordCount, data.from, data.to, role);
  });

export const getDrillDownFn = createServerFn({ method: "GET" })
  .validator(
    (d: {
      type: DrillType;
      from: string;
      to: string;
      page?: number | undefined;
      pageSize?: number | undefined;
      entityId?: string | undefined;
      role?: Role | undefined;
    }) => d,
  )
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 25;

    if (!canAccessDrillDown(role, data.type)) {
      return buildMeta(
        {
          data: { rows: [], page, pageSize, total: 0 },
          columns: [{ key: "message", label: "Access Restricted" }],
          restricted: true,
        },
        0,
        data.from,
        data.to,
        role,
      ) as any;
    }

    const res = drillDown(data.type, { from: data.from, to: data.to }, page, pageSize, data.entityId);

    let rows = res.data.rows;

    // Mask customer names if Viewer
    if (role === "VIEWER") {
      rows = rows.map((r) => {
        const cName = r["customerName"];
        const rId = r["id"];
        if (typeof cName === "string") {
          return {
            ...r,
            customerName: sanitizeCustomerName(cName, typeof rId === "string" ? rId : "", role),
          };
        }
        return r;
      });
    }

    const payload = {
      data: { ...res.data, rows },
      columns: res.columns,
      restricted: false,
    };

    return buildMeta(payload, res.data.total, data.from, data.to, role) as any;
  });

export const getAlertsFn = createServerFn({ method: "GET" })
  .validator((d: { role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const ref = today();
    const res = alerts();
    return buildMeta(res, res.length, ref, ref, role);
  });

export const getSearchFn = createServerFn({ method: "GET" })
  .validator((d: { query: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const allowDetail = role !== "VIEWER";
    const hits = search(data.query, allowDetail);
    const ref = today();
    return buildMeta(hits, hits.length, ref, ref, role);
  });

export const queryAiFn = createServerFn({ method: "POST" })
  .validator((d: { question: string; from: string; to: string; role?: Role }) => d)
  .handler(async ({ data }) => {
    const role = data.role ?? "ADMIN";
    const answer = await askAiAssistant(data.question, { from: data.from, to: data.to }, role);
    return buildMeta(answer, 1, data.from, data.to, role);
  });
