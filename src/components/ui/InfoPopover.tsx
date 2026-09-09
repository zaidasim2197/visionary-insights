import React from "react";
import { Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

export interface InfoPopoverProps {
  title: string;
  explanation: string;
  formula?: string | undefined;
  source?: string | undefined;
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  explanation,
  formula,
  source,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/50 transition-colors focus:outline-none shrink-0"
          title="Metric Inference"
          aria-label={`Information about ${title}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-80 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-sky-400 animate-pulse" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {title}
            </h4>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            Inference
          </span>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
          {explanation}
        </p>

        {formula && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
              Calculation Logic / Formula
            </span>
            <code className="text-[11px] font-mono text-blue-700 dark:text-sky-300 bg-blue-50/80 dark:bg-sky-950/60 border border-blue-100 dark:border-sky-900/50 px-2.5 py-1.5 rounded-xl block overflow-x-auto whitespace-normal break-words">
              {formula}
            </code>
          </div>
        )}

        {source && (
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Data Source
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
              {source}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
