import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, compact = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "PKR 0";
  if (compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `PKR ${(amount / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `PKR ${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount).replace("PKR", "PKR ");
}

/**
 * Compact currency formatter for KPI card headline values.
 * Always abbreviates large numbers so they never overflow a card.
 *   ≥ 1B  → PKR 1.23B
 *   ≥ 1M  → PKR 335.7M
 *   ≥ 1K  → PKR 662K
 *   < 1K  → PKR 999
 */
export function formatKpiCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "PKR 0";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `PKR ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `PKR ${(amount / 1_000).toFixed(1)}K`;
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Compact number formatter for KPI card headline counts.
 * Always abbreviates large numbers.
 *   ≥ 1B  → 1.2B
 *   ≥ 1M  → 3.5M
 *   ≥ 1K  → 12.3K
 *   < 1K  → 999
 */
export function formatKpiNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return Math.round(val).toLocaleString("en-US");
}

export function formatNumber(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}
