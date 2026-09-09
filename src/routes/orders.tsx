import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/ui/KpiCard";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CustomChartTooltip } from "@/components/ui/ChartTooltip";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { OrderKpis, OrderTrends } from "@/lib/shared-types";
import { formatNumber, formatPercent, formatKpiNumber } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, Percent } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/orders")({
  component: OrdersFulfillmentPage,
});

function OrdersFulfillmentPage() {
  const { dateRange, role, theme, openDrillDown } = useDashboard();
  const [kpis, setKpis] = useState<OrderKpis | null>(null);
  const [trends, setTrends] = useState<OrderTrends | null>(null);
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
      dashboardService.getOrderKpis(dateRange, role),
      dashboardService.getOrderTrends(dateRange, role),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      })
      .finally(() => setLoading(false));
  }, [dateRange, role]);

  const STATUS_COLORS: Record<string, string> = {
    Delivered: "#10B981",
    Shipped: "#3B82F6",
    Confirmed: "#6366F1",
    Processing: "#F59E0B",
    Pending: "#EC4899",
    Cancelled: "#EF4444",
    Returned: "#8B5CF6",
  };

  return (
    <DashboardLayout
      title="Orders & Fulfillment Operations"
    >
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <KpiCard
          title="Orders Pending"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.ordersPending)}
          comparison="Pending + Processing"
          infoExplanation="Total count of customer orders currently pending or being processed in the pipeline."
          infoFormula="Count(Orders) where status in ('Pending', 'Processing')"
          infoSource="CustomerOrder"
          onClick={() => openDrillDown("pending", "Pending Orders List")}
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <KpiCard
          title="Orders Delivered"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.ordersDelivered)}
          comparison="Successfully fulfilled"
          infoExplanation="Total count of customer orders that were successfully delivered during the selected period."
          infoFormula="Count(Orders) where status == 'Delivered'"
          infoSource="CustomerOrder"
          onClick={() => openDrillDown("delivered", "Delivered Orders List")}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <KpiCard
          title="Orders Cancelled"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.ordersCancelled)}
          comparison="Excluded from sales"
          infoExplanation="Total count of orders cancelled during the selected period. Cancelled orders do not contribute to revenue."
          infoFormula="Count(Orders) where status == 'Cancelled'"
          infoSource="CustomerOrder"
          onClick={() => openDrillDown("cancelled", "Cancelled Orders List")}
          icon={<XCircle className="w-4 h-4 text-rose-500" />}
        />
        <KpiCard
          title="Fulfillment Rate"
          value={loading || !kpis ? "—" : kpis.fulfillmentRatePct !== null ? formatPercent(kpis.fulfillmentRatePct) : "0%"}
          comparison="Delivered vs qualifying"
          infoExplanation="Percentage of total non-cancelled orders that have been successfully delivered."
          infoFormula="(Orders Delivered / Total Qualifying Orders) × 100"
          infoSource="Derived operational metric"
          icon={<Percent className="w-4 h-4 text-blue-500" />}
        />
      </div>

      {/* 2 Primary Charts — fixed height on mobile, fill remaining on desktop */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* KEPT: Order Status Breakdown — most actionable, shows where orders are in pipeline */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-80 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Order Status Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribution across order statuses</p>
            </div>
            <InfoPopover
              title="Order Status Breakdown"
              explanation="Categorical breakdown of all customer orders in the selected period across fulfillment states."
              formula="Count(Orders) grouped by order_status"
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
                      data={trends.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="55%"
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {trends.statusBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.label] || "#94A3B8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center pt-3 shrink-0">
              {trends?.statusBreakdown.slice(0, 6).map((item) => (
                <div key={item.label} className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[item.label] || "#94A3B8" }} />
                  <span>{item.label}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KEPT: Order Velocity Over Time — shows trend of placed vs delivered, critical for ops */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Order Velocity Over Time
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Placed vs Delivered order volumes</p>
            </div>
            <InfoPopover
              title="Order Velocity Over Time"
              explanation="Tracking volume of newly placed customer orders against successfully delivered order completions across periods."
              formula="Placed Order Count vs Delivered Order Count per period"
              source="CustomerOrder"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.overTime} margin={{ top: 10, right: 16, left: 10, bottom: 36 }}>
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
                    width={42}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="placed" name="Placed Orders" stroke={isDark ? "#38BDF8" : "#3B82F6"} fill={isDark ? "#38BDF8" : "#3B82F6"} fillOpacity={0.2} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="delivered" name="Delivered Orders" stroke="#10B981" fill="#10B981" fillOpacity={0.25} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/*
          COMMENTED OUT (less important — secondary operational detail):

          Processing Pipeline Stage — bar chart of order counts by stage; useful but largely
          captured by the Status Breakdown donut above.
          <div className="lg:col-span-6 bento-card p-5">
            <h3>Processing Pipeline Stage</h3>
            <BarChart data={trends.pipeline} ... />
          </div>

          Fulfillment Rate Efficiency — line trend of fulfillment %; the headline KPI card
          already surfaces the current rate, making the trend secondary here.
          <div className="lg:col-span-6 bento-card p-5">
            <h3>Fulfillment Rate Efficiency</h3>
            <LineChart data={trends.fulfillmentTrend} ... />
          </div>
        */}
      </div>
    </DashboardLayout>
  );
}
