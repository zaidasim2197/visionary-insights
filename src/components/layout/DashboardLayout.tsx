import React from "react";
import { Header } from "./Header";
import { DateRangePicker } from "../ui/DateRangePicker";
import { SearchModal } from "../ui/SearchModal";
import { DrillDownDrawer } from "../ui/DrillDownDrawer";
import { SettingsModal } from "../ui/SettingsModal";
import { useDashboard } from "@/context/DashboardContext";
import { Clock } from "lucide-react";

export interface DashboardLayoutProps {
  title: string;
  children: React.ReactNode;
  hideDateFilter?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  children,
  hideDateFilter = false,
}) => {
  const { referenceDateText } = useDashboard();

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-slate-50/50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-slate-100 dark:selection:text-slate-900">
      {/* Floating Header */}
      <Header />

      {/* Main Page Container */}
      <main className="flex-1 lg:min-h-0 max-w-[1440px] w-full mx-auto px-4 sm:px-7 pt-20 sm:pt-[4.5rem] pb-6 lg:pb-4 flex flex-col lg:overflow-hidden">
        {/* Page Top Bar */}
        <div className="flex flex-row items-center justify-between mb-4 gap-3 shrink-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>

          <div className="flex items-center space-x-3 shrink-0">
            {!hideDateFilter && <DateRangePicker />}

            {/* Data Freshness Badge */}
            <div className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{referenceDateText}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <div className="flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">{children}</div>
      </main>

      {/* Global Modals and Drawers */}
      <SearchModal />
      <DrillDownDrawer />
      <SettingsModal />
    </div>
  );
};
