import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/ui/KpiCard";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CustomChartTooltip } from "@/components/ui/ChartTooltip";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { ReceivableKpis, ReceivableTrends } from "@/lib/shared-types";
import { formatCurrency, formatNumber, formatKpiCurrency, formatKpiNumber } from "@/lib/utils";
import { CreditCard, AlertCircle, FileSpreadsheet, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export const Route = createFileRoute("/receivables")({
  component: ReceivablesPage,
});

function ReceivablesPage() {
  const { dateRange, role, theme, openDrillDown } = useDashboard();
  const [kpis, setKpis] = useState<ReceivableKpis | null>(null);
  const [trends, setTrends] = useState<ReceivableTrends | null>(null);
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
      dashboardService.getReceivableKpis(dateRange, role),
      dashboardService.getReceivableTrends(dateRange, role),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      })
      .finally(() => setLoading(false));
  }, [dateRange, role]);

  return (
    <DashboardLayout
      title="Accounts Receivable & Credit Risk"
    >
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <KpiCard
          title="Outstanding"
          value={loading || !kpis ? "—" : kpis.totalOutstanding !== null ? formatKpiCurrency(kpis.totalOutstanding) : "PKR 0"}
          comparison="Uncollected balances"
          infoExplanation="Total monetary balance remaining to be collected across all unpaid and partially paid customer invoices."
          infoFormula="Sum(Invoice Amount - Amount Paid) where status != 'Paid'"
          infoSource="Receivable"
          onClick={() => openDrillDown("outstanding", "All Outstanding Invoices")}
          icon={<CreditCard className="w-4 h-4 text-blue-500" />}
        />
        <KpiCard
          title="Overdue Amount"
          value={loading || !kpis ? "—" : kpis.overdueAmount !== null ? formatKpiCurrency(kpis.overdueAmount) : "PKR 0"}
          comparison="Past due date"
          infoExplanation="Sum of uncollected balances on invoices whose due date has already passed."
          infoFormula="Sum(Invoice Amount - Amount Paid) where DueDate < Today and status != 'Paid'"
          infoSource="Receivable"
          onClick={() => openDrillDown("overdue", "Overdue Invoices List")}
          icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
        />
        <KpiCard
          title="Overdue Invoices"
          value={loading || !kpis ? "—" : formatKpiNumber(kpis.overdueInvoices)}
          comparison="Require collection"
          infoExplanation="Total number of unpaid customer invoices that have breached their payment terms and passed the due date."
          infoFormula="Count(Invoices) where DueDate < Today and status != 'Paid'"
          infoSource="Receivable"
          onClick={() => openDrillDown("overdue", "Overdue Invoices List")}
          icon={<FileSpreadsheet className="w-4 h-4 text-amber-500" />}
        />
        <KpiCard
          title="Avg Days to Pay"
          value={loading || !kpis ? "—" : kpis.averageDaysToPay !== null ? `${formatNumber(kpis.averageDaysToPay, 1)} days` : "—"}
          comparison="Collection velocity"
          infoExplanation="Average number of days elapsed between invoice issuance and completed payment for invoices paid within the selected period."
          infoFormula="Average(Payment Date - Invoice Date) for paid invoices in range"
          infoSource="Receivable + Payment"
          icon={<Calendar className="w-4 h-4 text-indigo-500" />}
        />
      </div>

      {/* 2 Primary Charts — fixed height on mobile, fill remaining on desktop */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* KEPT: Receivable Aging Buckets — most critical risk view, shows overdue concentration */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Receivable Aging Buckets
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Uncollected amount categorized by overdue days</p>
            </div>
            <InfoPopover
              title="Receivable Aging Buckets"
              explanation="Categorization of outstanding uncollected balances into aging risk buckets (Not yet due, 1-30 days, 31-60 days, >60 days overdue)."
              formula="Sum(Outstanding Balance) grouped by Due Date age"
              source="Receivable"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.aging} margin={{ top: 10, right: 16, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    tickCount={4}
                    width={60}
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                  <Bar dataKey="value" name="Aging Balance" radius={[6, 6, 0, 0]}>
                    {trends.aging.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.label === "Not yet due" ? "#10B981"
                            : entry.label === "1 – 30 days" ? "#F59E0B"
                            : entry.label === "31 – 60 days" ? "#F97316"
                            : "#EF4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KEPT: Invoiced vs Outstanding Trend — shows collection efficiency trajectory over time */}
        <div className="bento-card p-4 sm:p-5 flex flex-col h-72 lg:h-auto lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Invoiced vs Outstanding Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Invoiced amount compared against uncollected balance</p>
            </div>
            <InfoPopover
              title="Invoiced vs Outstanding Trend"
              explanation="Dual-area chart contrasting gross invoiced sales billing against remaining uncollected receivables across historical periods."
              formula="Invoiced Amount vs Outstanding Uncollected Balance per period"
              source="Receivable + Invoice"
            />
          </div>
          <div className="flex-1 min-h-0">
            {loading || !trends ? (
              <div className="h-full bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.outstandingOverTime} margin={{ top: 10, right: 16, left: 10, bottom: 36 }}>
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
                    tick={{ fontSize: 10, fontWeight: 600, fill: axisColor }}
                    stroke={axisColor}
                    tickLine={false}
                    tickCount={4}
                    width={56}
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                  <Area type="monotone" dataKey="invoiced" name="Invoiced Amount" stroke={isDark ? "#38BDF8" : "#3B82F6"} fill={isDark ? "#38BDF8" : "#3B82F6"} fillOpacity={0.15} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding Balance" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/*
          COMMENTED OUT (less important — secondary insights):

          Top Overdue Accounts — scrollable customer list; valuable for collections teams but
          secondary to the aging bucket distribution for management-level dashboarding.
          <div className="lg:col-span-5 bento-card p-5">
            <h3>Top Overdue Accounts</h3>
            scrollable list of customers by overdue balance ...
          </div>

          Payment Status Split — donut (Paid / Partial / Overdue); the overdue amount KPI card
          and aging buckets chart already surface this insight more precisely.
          <div className="lg:col-span-5 bento-card p-5">
            <h3>Payment Status Split</h3>
            <PieChart data={trends.paymentSplit} ... />
          </div>
        */}
      </div>
    </DashboardLayout>
  );
}
