import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/ui/KpiCard";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CustomChartTooltip } from "@/components/ui/ChartTooltip";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { OperationalKpis, OperationalTrends } from "@/lib/shared-types";
import { formatNumber, formatPercent, formatKpiNumber } from "@/lib/utils";
import { Truck, RotateCcw, UserCheck, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/operations")({
  component: OperationsPage,
});

function OperationsPage() {
  const { dateRange, role, theme } = useDashboard();
  const [kpis, setKpis] = useState<OperationalKpis | null>(null);
  const [trends, setTrends] = useState<OperationalTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const axisColor = isDark ? "#F8FAFC" : "#0F172A";
  const gridColor = isDark ? "#334155" : "#E2E8F0";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getOperationalKpis(dateRange, role),
      dashboardService.getOperationalTrends(dateRange, role),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      })
      .finally(() => setLoading(false));
  }, [dateRange, role]);

  const CUST_COLORS = ["#3B82F6", "#94A3B8"];

  return (
    <DashboardLayout
      title="Operational Efficiency KPIs"
    >
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <KpiCard
          title="Fulfillment Time"
          value={loading || !kpis ? "—" : kpis.avgFulfillmentDays !== null ? `${formatNumber(kpis.avgFulfillmentDays, 1)}d` : "—"}
          comparison="Order to delivery"
          infoExplanation="Average number of days required to deliver an order from the date it was placed."
          infoFormula="Average(Delivered Date - Order Date) for Delivered orders in range"
          infoSource="CustomerOrder"
          icon={<Truck className="w-4 h-4 text-blue-500" />}
        />
        <KpiCard
          title="Return Rate"
          value={loading || !kpis ? "—" : kpis.returnRatePct !== null ? formatPercent(kpis.returnRatePct) : "0%"}
          comparison="Returned / total"
          infoExplanation="Percentage of orders returned or partially returned during the selected date range."
          infoFormula="(Returned Orders / Total Qualifying Orders) × 100"
          infoSource="CustomerOrder + ProductReturn"
          icon={<RotateCcw className="w-4 h-4 text-rose-500" />}
        />
        <KpiCard
          title="Repeat Customers"
          value={loading || !kpis ? "—" : kpis.repeatCustomerRatePct !== null ? formatPercent(kpis.repeatCustomerRatePct) : "0%"}
          comparison="Multiple orders"
          infoExplanation="Percentage of active customers who placed more than one order during the selected date range."
          infoFormula="(Customers with >1 order / Total Unique Customers) × 100"
          infoSource="CustomerOrder"
          icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
        />
        <KpiCard
          title="Inv. Turnover"
          value={loading || !kpis ? "—" : kpis.inventoryTurnover !== null ? `${formatNumber(kpis.inventoryTurnover, 2)}x` : "—"}
          comparison="COGS / Stock Value"
          infoExplanation="Ratio measuring how efficiently inventory is sold and replaced over the selected period."
          infoFormula="Cost of Goods Sold (COGS) in range / Total Stock Value"
          infoSource="OrderLine + InventoryPosition"
          icon={<RefreshCw className="w-4 h-4 text-purple-500" />}
        />
      </div>

      {/* 2 Primary Charts — fixed height on mobile, fill remaining on desktop */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* KEPT: Fulfillment Duration Trend — #1 operational metric, shows lead time over time */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Fulfillment Duration Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Average delivery lead time (days) over time</p>
            </div>
            <InfoPopover
              title="Fulfillment Duration Trend"
              explanation="Average calendar days elapsed between customer order placement and verified delivery recorded across periods."
              formula="Average(Delivered Date - Order Date) per period"
              source="CustomerOrder"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.fulfillmentTrend} margin={{ top: 10, right: 16, left: 10, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    interval="preserveStartEnd"
                    angle={-35}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    tickCount={5}
                    width={44}
                    tickFormatter={(v) => `${v}d`}
                  />
                  <Tooltip content={<CustomChartTooltip unit="days" />} />
                  <Line type="monotone" dataKey="days" name="Fulfillment Time" stroke={isDark ? "#38BDF8" : "#3B82F6"} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KEPT: Customer Retention Split — strategic metric showing repeat vs one-time buyers */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-80 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Customer Retention Split
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Repeat customers vs single-order accounts</p>
            </div>
            <InfoPopover
              title="Customer Retention Split"
              explanation="Breakdown of unique purchasing accounts into Repeat Customers (>1 order) and One-time Customers (1 order)."
              formula="Count(Customers with >1 order) vs Count(Customers with 1 order)"
              source="CustomerOrder"
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0">
              {loading || !trends ? (
                <div className="h-full w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trends.repeatVsNew}
                      cx="50%"
                      cy="50%"
                      innerRadius="28%"
                      outerRadius="52%"
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {trends.repeatVsNew.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CUST_COLORS[index % CUST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center space-x-6 pt-3 shrink-0">
              {trends?.repeatVsNew.map((item, i) => (
                <div key={item.label} className="flex items-center space-x-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CUST_COLORS[i] }} />
                  <span>{item.label}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*
          COMMENTED OUT (less important — secondary operational trends):

          Product Return Rate Trend — line chart of return % over time; the headline KPI card
          already shows the current return rate; the trend is secondary for most decisions.
          <div className="lg:col-span-6 bento-card p-5">
            <h3>Product Return Rate Trend</h3>
            <LineChart data={trends.returnTrend}>
              <Line dataKey="ratePct" stroke="#EF4444" ... />
            </LineChart>
          </div>

          Inventory Turnover Velocity — line chart of turnover ratio over time; the headline KPI
          card already shows the current ratio; the trend is a deeper analytical view.
          <div className="lg:col-span-7 bento-card p-5">
            <h3>Inventory Turnover Velocity</h3>
            <LineChart data={trends.turnoverTrend}>
              <Line dataKey="turnover" stroke="#8B5CF6" ... />
            </LineChart>
          </div>
        */}
      </div>
    </DashboardLayout>
  );
}
