import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { useDashboard, type DatePreset } from "@/context/DashboardContext";

export const DateRangePicker: React.FC = () => {
  const { dateRange, setDateRange } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const selectPreset = (preset: DatePreset) => {
    // Reference date for demo dataset is August 2026 (2026-08-31)
    let from = "2026-08-01";
    let to = "2026-08-31";

    switch (preset) {
      case "today":
        from = "2026-08-31";
        to = "2026-08-31";
        break;
      case "this_week":
        from = "2026-08-25";
        to = "2026-08-31";
        break;
      case "this_month":
        from = "2026-08-01";
        to = "2026-08-31";
        break;
      case "this_quarter":
        from = "2026-07-01";
        to = "2026-08-31";
        break;
      case "this_year":
        from = "2026-01-01";
        to = "2026-08-31";
        break;
      case "custom":
        from = customFrom;
        to = customTo;
        break;
    }

    setDateRange({ from, to, preset });
    if (preset !== "custom") setIsOpen(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setDateRange({ from: customFrom, to: customTo, preset: "custom" });
      setIsOpen(false);
    }
  };

  const presetLabels: Record<DatePreset, string> = {
    today: "Today",
    this_week: "This Week",
    this_month: "This Month (Aug 2026)",
    this_quarter: "This Quarter (Q3 2026)",
    this_year: "This Year (2026)",
    custom: "Custom Range",
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm focus:outline-none"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>{presetLabels[dateRange.preset] || `${dateRange.from} – ${dateRange.to}`}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            Select Period
          </div>

          <div className="mt-1.5 space-y-0.5">
            {(["today", "this_week", "this_month", "this_quarter", "this_year"] as DatePreset[]).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => selectPreset(p)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    dateRange.preset === p
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>{presetLabels[p]}</span>
                  {dateRange.preset === p && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />}
                </button>
              ),
            )}
          </div>

          {/* Custom Date Input Section */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 block mb-2">
              Custom Date Range
            </span>
            <div className="space-y-2 px-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <button
                onClick={applyCustom}
                className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
