import type { Role } from "./shared-types";

/**
 * Server-side security mask according to Haroon's security matrix.
 * VIEWER role: Aggregate counts and totals ONLY.
 * MUST NOT see: Customer names, Unit cost, Receivable detail, Order/invoice drill-downs.
 */

export function sanitizeCustomerName(name: string | null, id: string, role: Role): string | null {
  if (role === "VIEWER") {
    if (!id) return "Restricted";
    return `Customer #${id.replace(/[^0-9]/g, "").slice(-4) || "XXXX"}`;
  }
  return name;
}

export function canAccessDrillDown(role: Role, type: string): boolean {
  if (role === "ADMIN" || role === "MANAGER") return true;
  // VIEWER can only see non-sensitive aggregate list types like lowstock or active products without names/costs
  return type === "lowstock" || type === "outofstock";
}

export function filterSensitiveField<T>(value: T, role: Role): T | null {
  if (role === "VIEWER") return null;
  return value;
}
