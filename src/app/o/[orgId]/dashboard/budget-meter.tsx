"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function statusColor(pct: number) {
  if (pct >= 100) return "var(--status-critical)";
  if (pct >= 80) return "var(--status-warning)";
  return "var(--status-good)";
}

/** A single ratio against a limit — the dataviz skill's "Meter" form, not
 * a chart trying to do a chart's job. One number, one ring, read in half
 * a second. */
export function BudgetMeter({ actual, budgeted }: { actual: number; budgeted: number }) {
  if (budgeted <= 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm text-muted-foreground">No budgets set this period.</p>
      </div>
    );
  }

  const pct = Math.round((actual / budgeted) * 100);
  const color = statusColor(pct);
  const data = [{ value: Math.min(pct, 100), fill: color }];

  return (
    <div className="relative flex flex-col items-center">
      <RadialBarChart
        width={200}
        height={140}
        cx="50%"
        cy="100%"
        innerRadius={80}
        outerRadius={120}
        barSize={16}
        startAngle={180}
        endAngle={0}
        data={data}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar
          dataKey="value"
          // Hardcoded, not hsl(var(--secondary)) — unlike every other fill/stroke
          // in these charts, Recharts' RadialBar `background` prop doesn't
          // resolve CSS custom properties and silently falls back to black.
          // Confirmed by direct comparison; keep in sync with --secondary.
          background={{ fill: "#efe8d8" }}
          cornerRadius={8}
          isAnimationActive={true}
        />
      </RadialBarChart>
      <div className="absolute inset-x-0 top-[64px] flex flex-col items-center">
        <span className="font-serif text-3xl tabular-nums text-foreground">{pct}%</span>
        <span className="font-mono text-[11px] text-muted-foreground">of budget used</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <span className="tabular">{money(actual)}</span>
        <span>/</span>
        <span className="tabular">{money(budgeted)}</span>
      </div>
    </div>
  );
}
