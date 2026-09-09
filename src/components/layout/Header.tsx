import React, { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Settings,
  Menu,
  X,
  TrendingUp,
  ShoppingBag,
  Package,
  CreditCard,
  Award,
  Activity,
  Bot,
  Sun,
  Moon,
  Shield,
  Zap,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { AlertsPopover } from "../ui/AlertsPopover";

export const Header: React.FC = () => {
  const { role, theme, setTheme, setIsSearchOpen, setIsSettingsOpen } = useDashboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { label: "Overview", href: "/", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Orders", href: "/orders", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { label: "Inventory", href: "/inventory", icon: <Package className="w-3.5 h-3.5" /> },
    { label: "Receivables", href: "/receivables", icon: <CreditCard className="w-3.5 h-3.5" /> },
    { label: "Top Performers", href: "/top-performers", icon: <Award className="w-3.5 h-3.5" /> },
    { label: "Operations", href: "/operations", icon: <Activity className="w-3.5 h-3.5" /> },
    {
      label: "AI Assistant",
      href: "/ai-assistant",
      icon: <Bot className="w-3.5 h-3.5 text-blue-500 dark:text-sky-400" />,
    },
  ];

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-3 sm:px-6 max-w-[1440px] mx-auto w-full">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg flex items-center justify-between transition-all">
        {/* Brand Logo & Name (Left) */}
        <div className="flex items-center shrink-0">
          <Link to="/" className="flex items-center space-x-2 group shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-sky-500 dark:to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                VisionPulse
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase -mt-0.5">
                Business Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links (Centered) */}
        <nav className="hidden lg:flex items-center justify-center flex-1 space-x-0.5 xl:space-x-1.5 px-3">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Tools & Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 xl:space-x-2 shrink-0">
          {/* Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline font-medium">Search...</span>
            <kbd className="hidden sm:inline px-1 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Action Center Popover */}
          <AlertsPopover />

          {/* Theme Quick Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          </button>

          {/* Session Role Display / Dev Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-slate-800 dark:text-slate-200 shrink-0 border border-slate-200/60 dark:border-slate-700/60"
            title="Session & Settings"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
            <span className="hidden sm:inline-block uppercase tracking-wider text-[10px] font-extrabold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-sky-800/50 shrink-0 whitespace-nowrap">
              {role}
            </span>
            <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-1 animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
