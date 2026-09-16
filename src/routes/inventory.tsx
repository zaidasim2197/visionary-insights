import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/ui/KpiCard";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CustomChartTooltip } from "@/components/ui/ChartTooltip";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { InventoryKpis, InventoryTrends } from "@/lib/shared-types";
import { formatCurrency, formatNumber, formatKpiCurrency, formatKpiNumber } from "@/lib/utils";
import { Package, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { dateRange, role, theme, openDrillDown } = useDashboard();
  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [trends, setTrends] = useState<InventoryTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const axisColor = isDark ? "#F8FAFC" : "#0F172A";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getInventoryKpis(role),
      dashboardService.getInventoryTrends(dateRange, role),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      })
      .finally(() => setLoading(false));
  }, [dateRange, role]);

  return (
    <DashboardLayout
      title="Inventory & Stock Position"
    >
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <KpiCard
          title="Stock Value"
          value={loading || !kpis ? "—" : kpis.totalStockValue !== null ? formatKpiCurrency(kpis.totalStockValue) : "PKR 0"}
          comparison="At unit cost"
          infoExplanation="Total valuation of active product inventory currently on hand, computed at unit cost."
          infoFormula="Sum(Quantity On Hand × Unit Cost)"
          infoSource="Product + InventoryPosition"
          icon={<Package className="w-4 h-4 text-blue-500" />}
        />
        <KpiCard
          title="Low on Stock"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.itemsLowOnStock)}
          comparison="≤ reorder level"
          infoExplanation="Count of active products whose stock on hand is above 0 but less than or equal to their defined reorder threshold."
          infoFormula="Count(Products) where 0 < OnHand <= ReorderLevel"
          infoSource="InventoryPosition"
          onClick={() => openDrillDown("lowstock", "Low Stock Products List")}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />
        <KpiCard
          title="Out of Stock"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.itemsOutOfStock)}
          comparison="Zero stock on hand"
          infoExplanation="Count of active products that currently have zero inventory available on hand."
          infoFormula="Count(Products) where QuantityOnHand == 0"
          infoSource="InventoryPosition"
          onClick={() => openDrillDown("outofstock", "Out of Stock Products List")}
          icon={<XCircle className="w-4 h-4 text-rose-500" />}
        />
        <KpiCard
          title="Active Products"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.activeProducts)}
          comparison={`In stock: ${kpis?.inStock ?? 0}`}
          infoExplanation="Total count of active catalog products tracked in the inventory management system."
          infoFormula="Count(Products) where product_status == 'Active'"
          infoSource="Product"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
      </div>

      {/* 2 Primary Charts — fixed height on mobile, fill remaining on desktop */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* KEPT: Low Stock Threshold Warning — most urgent/actionable alert for operations */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-80 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Low Stock Threshold Warning</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Products requiring inventory replenishment</p>
            </div>
            <InfoPopover
              title="Low Stock Threshold Warning"
              explanation="Catalog products whose current stock on hand has dropped below or equal to their safety reorder threshold."
              formula="OnHand <= ReorderLevel and OnHand > 0"
              source="InventoryPosition"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {loading || !trends ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : trends.lowStock.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                All inventory levels are healthy above reorder thresholds.
              </div>
            ) : (
              trends.lowStock.map((item) => {
                const pct = Math.min((item.onHand / (item.reorderLevel || 1)) * 100, 100);
                return (
                  <div
                    key={item.productId}
                    onClick={() => openDrillDown("lowstock", `Product Detail: ${item.name}`, item.productId)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-semibold shrink-0 ml-2">
                        {item.onHand} / {item.reorderLevel} units
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct <= 25 ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* KEPT: Stock Valuation by Category — key financial view of inventory capital allocation */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Stock Valuation by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Inventory valuation split across categories</p>
            </div>
            <InfoPopover
              title="Stock Valuation by Category"
              explanation="Total financial capital invested in active inventory items grouped by product category."
              formula="Sum(Quantity On Hand × Unit Cost) grouped by Category"
              source="Product + InventoryPosition"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={trends.valueByCategory} margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    tickCount={5}
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                  <Bar dataKey="value" name="Stock Value" fill={isDark ? "#38BDF8" : "#0F172A"} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/*
          COMMENTED OUT (less important — available on drill-down or secondary views):

          Stock Health Composition — donut (Healthy / Low / Out-of-stock counts); the KPI cards
          already surface the exact counts for low and out-of-stock items directly.
          <div className="lg:col-span-5 bento-card p-5">
            <h3>Stock Health Composition</h3>
            <PieChart data={trends.stockHealth} ... />
          </div>

          Fastest Moving Products — ranked list by units sold; useful but secondary to the
          stock-level warning list which drives immediate operational action.
          <div className="lg:col-span-7 bento-card p-5">
            <h3>Fastest Moving Products</h3>
            ranked list ...
          </div>
        */}
      </div>
    </DashboardLayout>
  );
}
