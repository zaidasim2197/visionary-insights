import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "@/lib/shared-types";
import type { DrillType } from "@/lib/metrics.server";

export type DatePreset = "all_time" | "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "custom";

export interface DateRange {
  from: string;
  to: string;
  preset: DatePreset;
}

export interface DrillDownState {
  isOpen: boolean;
  type: DrillType | null;
  title: string;
  entityId?: string | undefined;
}

interface DashboardContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  role: Role;
  setRole: (role: Role) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  drillDown: DrillDownState;
  openDrillDown: (type: DrillType, title: string, entityId?: string) => void;
  closeDrillDown: () => void;
  referenceDateText: string;
}

const DEFAULT_RANGE: DateRange = {
  from: "2025-03-01",
  to: "2026-08-31",
  preset: "all_time",
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [role, setRoleState] = useState<Role>("ADMIN");
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("light");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    isOpen: false,
    type: null,
    title: "",
  });

  // Load stored preferences on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedRole = localStorage.getItem("v71_role") as Role | null;
    if (storedRole && ["ADMIN", "MANAGER", "VIEWER"].includes(storedRole)) {
      setRoleState(storedRole);
    }

    const storedTheme = localStorage.getItem("v71_theme") as "light" | "dark" | "system" | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }
  }, []);

  // Theme application
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("v71_theme", theme);
  }, [theme]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("v71_role", newRole);
    }
  };

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
  };

  const openDrillDown = (type: DrillType, title: string, entityId?: string) => {
    setDrillDown({ isOpen: true, type, title, entityId });
  };

  const closeDrillDown = () => {
    setDrillDown((prev) => ({ ...prev, isOpen: false }));
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        dateRange,
        setDateRange,
        role,
        setRole,
        theme,
        setTheme,
        isSearchOpen,
        setIsSearchOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        drillDown,
        openDrillDown,
        closeDrillDown,
        referenceDateText: "Data through Aug 31, 2026",
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
