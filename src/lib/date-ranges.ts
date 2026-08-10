export type PeriodKey =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "ytd";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
];

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return PERIOD_OPTIONS.some((o) => o.value === value);
}

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

export type ResolvedPeriod = {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  label: string;
  isCurrentMonth: boolean;
};

/**
 * Every period also resolves the immediately-preceding equivalent window, so
 * callers can compute month-over-month (or period-over-period) deltas without
 * a second round trip through the caller.
 */
export function resolvePeriod(key: PeriodKey): ResolvedPeriod {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  switch (key) {
    case "this-month":
      return {
        from: startOfMonth(y, m),
        to: endOfMonth(y, m),
        prevFrom: startOfMonth(y, m - 1),
        prevTo: endOfMonth(y, m - 1),
        label: "This month",
        isCurrentMonth: true,
      };
    case "last-month":
      return {
        from: startOfMonth(y, m - 1),
        to: endOfMonth(y, m - 1),
        prevFrom: startOfMonth(y, m - 2),
        prevTo: endOfMonth(y, m - 2),
        label: "Last month",
        isCurrentMonth: false,
      };
    case "last-3-months":
      return {
        from: startOfMonth(y, m - 2),
        to: endOfMonth(y, m),
        prevFrom: startOfMonth(y, m - 5),
        prevTo: endOfMonth(y, m - 3),
        label: "Last 3 months",
        isCurrentMonth: false,
      };
    case "last-6-months":
      return {
        from: startOfMonth(y, m - 5),
        to: endOfMonth(y, m),
        prevFrom: startOfMonth(y, m - 11),
        prevTo: endOfMonth(y, m - 6),
        label: "Last 6 months",
        isCurrentMonth: false,
      };
    case "ytd":
      return {
        from: startOfMonth(y, 0),
        to: endOfMonth(y, m),
        prevFrom: startOfMonth(y - 1, 0),
        prevTo: endOfMonth(y - 1, m),
        label: "Year to date",
        isCurrentMonth: false,
      };
  }
}

/** Current-month key, e.g. "2026-08" — the shape /o/[orgId]/budgets already keys budgets by. */
export function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
