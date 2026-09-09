import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { AlertItem } from "@/lib/shared-types";
import { useNavigate } from "@tanstack/react-router";

export const AlertsPopover: React.FC = () => {
  const { role, openDrillDown } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardService.getAlerts(role).then((res) => setAlerts(res.data));
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (alert: AlertItem) => {
    setIsOpen(false);
    if (alert.id === "out-of-stock" || alert.id === "low-stock") {
      navigate({ to: "/inventory" });
    } else if (alert.id === "overdue") {
      navigate({ to: "/receivables" });
    } else if (alert.id === "overdue-open" || alert.id === "cancelled") {
      navigate({ to: "/orders" });
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        title="Needs Attention Action Center"
        aria-label="Action Center Alerts"
      >
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Needs Attention
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                {alerts.length} Issues
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active operational alerts requiring management attention.
              </div>
            ) : (
              alerts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAction(item)}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-2.5">
                    {item.severity === "critical" ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    ) : item.severity === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {item.detail}
                      </div>
                      <div className="mt-1.5 flex items-center text-[10px] font-medium text-slate-700 dark:text-slate-300">
                        <span>{item.action}</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
