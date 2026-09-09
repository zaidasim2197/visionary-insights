import { REFERENCE_DATE, DATA_START_DATE } from "@/lib/dataset";

export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"
  | "allTime"
  | "custom";

export interface DateRange {
  preset: PresetKey;
  from: string; // yyyy-mm-dd inclusive
  to: string; // yyyy-mm-dd inclusive
}

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisQuarter: "This Quarter",
  thisYear: "This Year",
  allTime: "All Time",
  custom: "Custom Range",
};

export const PRESET_ORDER: PresetKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "thisQuarter",
  "thisYear",
  "allTime",
];

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

export function resolvePreset(preset: PresetKey, today = REFERENCE_DATE): DateRange {
  const d = parse(today);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startOfMonth = toISO(new Date(Date.UTC(y, m, 1)));
  switch (preset) {
    case "today":
      return { preset, from: today, to: today };
    case "yesterday": {
      const yd = addDays(today, -1);
      return { preset, from: yd, to: yd };
    }
    case "last7":
      return { preset, from: addDays(today, -6), to: today };
    case "last30":
      return { preset, from: addDays(today, -29), to: today };
    case "thisMonth":
      return { preset, from: startOfMonth, to: today };
    case "lastMonth":
      return {
        preset,
        from: toISO(new Date(Date.UTC(y, m - 1, 1))),
        to: toISO(new Date(Date.UTC(y, m, 0))),
      };
    case "thisQuarter":
      return { preset, from: toISO(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))), to: today };
    case "thisYear":
      return { preset, from: toISO(new Date(Date.UTC(y, 0, 1))), to: today };
    case "allTime":
    default:
      return { preset: "allTime", from: DATA_START_DATE, to: today };
  }
}

/** Immediately preceding window of identical length, for period-over-period comparison. */
export function previousRange(range: DateRange): DateRange {
  const len = daysBetween(range.from, range.to) + 1;
  return {
    preset: "custom",
    from: addDays(range.from, -len),
    to: addDays(range.from, -1),
  };
}

export function formatRange(range: DateRange): string {
  if (range.preset !== "custom") return PRESET_LABELS[range.preset];
  return `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${String(y).slice(2)}`;
}

export const inRange = (iso: string | null | undefined, r: DateRange) =>
  !!iso && iso >= r.from && iso <= r.to;
