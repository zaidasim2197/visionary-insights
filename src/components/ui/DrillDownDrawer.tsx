import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, ShieldAlert } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const DrillDownDrawer: React.FC = () => {
  const { drillDown, closeDrillDown, dateRange, role } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [dataState, setDataState] = useState<{
    rows: Record<string, unknown>[];
    columns: { key: string; label: string; align?: "right" }[];
    total: number;
    restricted?: boolean | undefined;
  }>({ rows: [], columns: [], total: 0 });

  useEffect(() => {
    if (!drillDown.isOpen || !drillDown.type) return;
    setLoading(true);
    dashboardService
      .getDrillDown(drillDown.type, { from: dateRange.from, to: dateRange.to }, role, page, 25, drillDown.entityId)
      .then((res) => {
        setDataState({
          rows: res.data.data.rows,
          columns: res.data.columns,
          total: res.data.data.total,
          restricted: res.data.restricted,
        });
      })
      .finally(() => setLoading(false));
  }, [drillDown.isOpen, drillDown.type, drillDown.entityId, page, dateRange, role]);

  // Reset page when drillDown opens or type changes
  useEffect(() => {
    setPage(1);
  }, [drillDown.type, drillDown.entityId]);

  if (!drillDown.isOpen) return null;

  const totalPages = Math.ceil(dataState.total / 25) || 1;

  const renderCellContent = (key: string, val: unknown) => {
    if (val === null || val === undefined) return "—";
    if (key === "amount" || key === "value" || key === "price") {
      return formatCurrency(Number(val));
    }
    if (key === "status") {
      const s = String(val);
      const color =
        s === "Delivered" || s === "Paid"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
          : s === "Cancelled" || s === "Overdue"
            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200";
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
          {s}
        </span>
      );
    }
    if (typeof val === "number") return formatNumber(val);
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {drillDown.title || "Drill-down View"}
              </h3>
              {role === "VIEWER" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200">
                  Viewer Masked View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing dataset records contributing to this metric ({dateRange.from} to {dateRange.to})
            </p>
          </div>
          <button
            onClick={closeDrillDown}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {dataState.restricted ? (
            <div className="p-8 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl my-6">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Detailed Record Access Restricted
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                Your current account role (<strong>VIEWER</strong>) allows viewing aggregate totals and operational KPIs. Granular transaction logs, invoice breakdowns, and customer contact records require <strong>Manager</strong> or <strong>Admin</strong> access.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-3 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ) : dataState.rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              No detailed records found for the selected period.
            </div>
          ) : (
            <>
              {/* Mobile Responsive Stacked Card View (Zero Horizontal Scroll) */}
              <div className="block sm:hidden space-y-3">
                {dataState.rows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
                  >
                    {dataState.columns.map((col) => (
                      <div
                        key={col.key}
                        className="flex items-center justify-between text-xs border-b border-slate-200/50 dark:border-slate-700/40 pb-1.5 last:border-b-0 last:pb-0"
                      >
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500">
                          {col.label}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-right max-w-[200px] truncate">
                          {renderCellContent(col.key, row[col.key])}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Desktop Data Table View */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      {dataState.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 border-b border-slate-200 dark:border-slate-800 ${
                            col.align === "right" ? "text-right" : "text-left"
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {dataState.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {dataState.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 ${
                              col.align === "right" ? "text-right font-medium" : ""
                            }`}
                          >
                            {renderCellContent(col.key, row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer with Pagination */}
        {!dataState.restricted && dataState.total > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              Showing <strong>{(page - 1) * 25 + 1}</strong> –{" "}
              <strong>{Math.min(page * 25, dataState.total)}</strong> of{" "}
              <strong>{dataState.total}</strong> records
            </span>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
