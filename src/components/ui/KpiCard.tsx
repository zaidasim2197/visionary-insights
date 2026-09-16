import React from "react";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { InfoPopover } from "./InfoPopover";

export interface KpiCardProps {
  title: string;
  value: string | number | null;
  comparison?: string;
  changePct?: number | null | undefined;
  infoExplanation: string;
  infoFormula?: string;
  infoSource?: string;
  onClick?: (() => void) | undefined;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  comparison,
  changePct,
  infoExplanation,
  infoFormula,
  infoSource,
  onClick,
  icon,
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bento-card relative p-3 sm:p-5 flex flex-col justify-between overflow-hidden group ${
        isClickable ? "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700" : ""
      }`}
    >
      {/* Background Accent Pill */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:scale-110" />

      {/* Top Header Row */}
      <div className="flex items-start justify-between z-10 gap-2">
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          {icon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</span>}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <InfoPopover
            title={title}
            explanation={infoExplanation}
            formula={infoFormula}
            source={infoSource}
          />
          {isClickable && (
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          )}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 z-10">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight break-all">
          {value !== null && value !== undefined ? value : "—"}
        </div>
      </div>

      {/* Footer / Subtext */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs z-10">
        {changePct !== undefined && changePct !== null && (
          <span
            className={`inline-flex items-center font-medium px-1.5 py-0.5 rounded shrink-0 ${
              changePct > 0
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                : changePct < 0
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {changePct > 0 ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : changePct < 0 ? (
              <TrendingDown className="w-3 h-3 mr-1" />
            ) : (
              <Minus className="w-3 h-3 mr-1" />
            )}
            {changePct > 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`}
          </span>
        )}

        {comparison && (
          <span className="text-slate-500 dark:text-slate-400 font-normal truncate min-w-0">
            {comparison}
          </span>
        )}
      </div>
    </div>
  );
};
