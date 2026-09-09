import React from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

export interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isCurrency?: boolean;
  unit?: string;
}

export const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  isCurrency = false,
  unit,
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs z-50">
      {label && (
        <div className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1.5">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => {
          const val = Number(entry.value);
          const formattedVal = isCurrency
            ? formatCurrency(val)
            : unit === "%"
              ? `${val.toFixed(1)}%`
              : unit === "days"
                ? `${val.toFixed(1)} days`
                : unit === "x"
                  ? `${val.toFixed(2)}x`
                  : formatNumber(val);

          return (
            <div key={index} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill || "#3B82F6" }}
                />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {entry.name || entry.dataKey}:
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
