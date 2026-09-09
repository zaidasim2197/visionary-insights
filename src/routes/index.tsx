import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/ui/KpiCard";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CustomChartTooltip } from "@/components/ui/ChartTooltip";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { SalesKpis, SalesTrends } from "@/lib/shared-types";
import { formatCurrency, formatNumber, formatPercent, formatKpiCurrency, formatKpiNumber } from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  Calculator,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export const Route = createFileRoute("/")({
  component: SalesPerformancePage,
});

function SalesPerformancePage() {
  const { dateRange, role, theme, openDrillDown } = useDashboard();
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [trends, setTrends] = useState<SalesTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const axisColor = isDark ? "#F8FAFC" : "#0F172A";
  const gridColor = isDark ? "#334155" : "#E2E8F0";
  const lineStroke = isDark ? "#38BDF8" : "#0F172A";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getSalesKpis(dateRange, role),
      dashboardService.getSalesTrends(dateRange, role),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      })
      .finally(() => setLoading(false));
  }, [dateRange, role]);

  const CATEGORY_COLORS = isDark
    ? ["#38BDF8", "#818CF8", "#34D399", "#FBBF24", "#F472B6", "#A78BFA"]
    : ["#0F172A", "#2563EB", "#059669", "#D97706", "#4F46E5", "#DB2777"];

  return (
    <DashboardLayout
      title="Sales Performance Overview"
    >
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <KpiCard
          title="Total Sales"
          value={loading || !kpis ? "—" : kpis.totalSales !== null ? formatKpiCurrency(kpis.totalSales) : "PKR 0"}
          changePct={kpis?.salesGrowthPct}
          comparison={kpis?.previousPeriodSales ? `vs ${formatKpiCurrency(kpis.previousPeriodSales)} prev` : "Selected period"}
          infoExplanation="Total monetary value of sales generated during the selected date range, excluding cancelled orders."
          infoFormula="Sum(Quantity × Unit Price)"
          infoSource="CustomerOrder + OrderLine"
          onClick={() => openDrillDown("sales", "Total Sales Breakdown")}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
        />
        <KpiCard
          title="Total Orders"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.totalOrders)}
          comparison="Non-cancelled qualifying orders"
          infoExplanation="Total count of customer orders placed during the selected date range that were not cancelled."
          infoFormula="Count(Orders) where status != 'Cancelled'"
          infoSource="CustomerOrder"
          onClick={() => openDrillDown("orders", "Total Qualifying Orders")}
          icon={<ShoppingBag className="w-4 h-4 text-blue-500" />}
        />
        <KpiCard
          title="Avg Order Value"
          value={loading || !kpis ? "—" : kpis.averageOrderValue !== null ? formatKpiCurrency(kpis.averageOrderValue) : "PKR 0"}
          comparison="Per qualifying order"
          infoExplanation="Average revenue generated per qualifying customer order within the selected date range."
          infoFormula="Total Sales / Total Orders"
          infoSource="Calculated derived metric"
          icon={<Calculator className="w-4 h-4 text-indigo-500" />}
        />
        <KpiCard
          title="Sales Growth"
          value={loading || !kpis ? "—" : kpis.salesGrowthPct !== null ? formatPercent(kpis.salesGrowthPct) : "N/A"}
          changePct={kpis?.salesGrowthPct}
          comparison={`vs prev ${dateRange.preset.replace('_', ' ')}`}
          infoExplanation="Percentage growth in sales compared to the immediately preceding period of equal length."
          infoFormula="((Current Sales - Previous Sales) / Previous Sales) × 100"
          infoSource="Period-over-Period calculation"
          icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
        />
      </div>

      {/* 2 Primary Charts — fixed height on mobile, fill remaining on desktop */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* KEPT: Sales & Revenue Trend — most important, shows sales trajectory */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Sales & Revenue Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gross sales distribution across periods
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {trends?.monthly.length ?? 0} Buckets
              </span>
              <InfoPopover
                title="Sales & Revenue Trend"
                explanation="Gross revenue trajectory aggregated by monthly time buckets across the selected date range."
                formula="Sum(Quantity × Unit Price) grouped by Month"
                source="CustomerOrder + OrderLine"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.monthly} margin={{ top: 10, right: 16, left: 10, bottom: 36 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineStroke} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={lineStroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                  <XAxis
                    dataKey="month"
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
                    width={68}
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke={lineStroke} strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KEPT: Sales by Category — critical for revenue attribution */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Sales by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue contribution per product category</p>
            </div>
            <InfoPopover
              title="Sales by Category"
              explanation="Total sales revenue contributed by each product category line during the selected timeframe."
              formula="Sum(OrderLine Amount) grouped by Product.Category"
              source="Product + OrderLine"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={trends.byCategory} margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
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
                  <Bar dataKey="value" name="Sales" radius={[0, 6, 6, 0]}>
                    {trends.byCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/*
          COMMENTED OUT (less important — secondary insights):

          Period Comparison — shows only 2 bars (prev vs current), redundant with the KPI Sales Growth card
          <div className="lg:col-span-6 bento-card p-5 flex flex-col justify-between">
            <h3>Period Comparison</h3>
            <BarChart data={trends.growth} ... />
          </div>

          Order Value Distribution — histogram of order brackets, useful but secondary to trend & category
          <div className="lg:col-span-6 bento-card p-5 flex flex-col justify-between">
            <h3>Order Value Distribution</h3>
            <BarChart data={trends.orderValueDistribution} ... />
          </div>
        */}
      </div>
    </DashboardLayout>
  );
}
