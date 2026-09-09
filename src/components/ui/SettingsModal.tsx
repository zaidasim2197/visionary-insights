import React from "react";
import { X, Shield, Moon, Sun, Monitor, Database, Lock } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type { Role } from "@/lib/shared-types";

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, role, setRole, theme, setTheme, referenceDateText } =
    useDashboard();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              System & Appearance Settings
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Theme Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5 mb-1" /> },
                { id: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5 mb-1" /> },
                { id: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5 mb-1" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id as "light" | "dark" | "system")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                    theme === item.id
                      ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dev Role Simulator */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-semibold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>[DEV TEST TOOL] Role Authorization Simulator</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Per Haroon's architecture rules, server session role is the sole authority. This selector is isolated for UI demonstration to test how Viewer masking hides customer names and sensitive data.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["ADMIN", "MANAGER", "VIEWER"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                    role === r
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Dataset Freshness Info */}
          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3 text-slate-600 dark:text-slate-300">
            <Database className="w-4 h-4 text-slate-400" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Dataset Metadata
              </div>
              <div className="text-[11px] text-slate-500">{referenceDateText} · VisionPulse Engine</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
