"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Fixed categorical order — the dataviz skill's validated default set,
// re-validated against this app's paper surface. Assigned by category
// identity (stable sort by id), never re-cycled by rank/value, so a given
// category keeps the same color across renders and across charts.
const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

// Recharts substitutes its own default "active" (hovered) bar shape on
// every <Bar> — when Cell children supply custom per-bar fills, that
// substitution doesn't inherit them and renders solid black instead,
// even when activeBar is given an explicit style object (it still swaps
// in Recharts' own default fill underneath). `activeBar={false}` is the
// only setting that reliably keeps the bar's real color on hover; the
// Tooltip's `cursor` fill and the tooltip itself already carry the hover
// feedback, so nothing is lost.

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-sm border border-border bg-card p-4 shadow-[0_1px_2px_rgba(38,32,25,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(38,32,25,0.08)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-medium text-foreground">{title}</h2>
        {subtitle && (
          <span className="font-mono text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-sm border border-border bg-popover shadow-lg">
      {label && (
        <p className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-1 px-3 py-2">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-mono font-medium tabular text-foreground">
              {money(p.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

// A soft gradient fade from the series color to transparent — the
// "modern SaaS" area-under-line treatment, kept subtle (18% peak opacity)
// so it reads as depth, not as its own competing shape.
function AreaGradientDefs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.22} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export function DashboardCharts({
  byCategory,
  overTime,
  budgetVsActual,
  monthlyTrend,
  spendByMember,
}: {
  byCategory: { categoryId: string; name: string; total: number }[];
  overTime: { date: string; total: number }[];
  budgetVsActual: { name: string; budgeted: number; actual: number }[];
  monthlyTrend?: { month: string; total: number }[];
  spendByMember?: { name: string; total: number }[];
}) {
  const sortedCategories = [...byCategory].sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Spend by category">
        {byCategory.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCategory} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="total" name="Spend" radius={[4, 4, 0, 0]} activeBar={false}>
                {byCategory.map((entry) => {
                  const colorIndex = sortedCategories.findIndex(
                    (c) => c.categoryId === entry.categoryId,
                  );
                  return (
                    <Cell
                      key={entry.categoryId}
                      fill={CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length]}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Spend over time">
        {overTime.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={overTime} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <AreaGradientDefs id="spendOverTimeFill" color="var(--chart-1)" />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#spendOverTimeFill)"
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Budget vs actual">
        {budgetVsActual.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={budgetVsActual} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="budgeted"
                name="Budgeted"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                activeBar={false}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                activeBar={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {budgetVsActual.length > 0 && (
        <ChartCard title="Budget variance">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={budgetVsActual.map((b) => ({
                name: b.name,
                variance: b.actual - b.budgeted,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0].value as number;
                  return (
                    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 font-mono text-muted-foreground">{label}</p>
                      <p className="font-medium text-foreground">
                        {v > 0 ? "Over by " : v < 0 ? "Under by " : "On budget — "}
                        {money(Math.abs(v))}
                      </p>
                    </div>
                  );
                }}
                cursor={{ fill: "hsl(var(--accent))" }}
              />
              <Bar dataKey="variance" radius={[0, 4, 4, 0]} activeBar={false}>
                {budgetVsActual.map((b) => (
                  <Cell
                    key={b.name}
                    fill={
                      b.actual - b.budgeted > 0
                        ? "var(--status-critical)"
                        : "var(--status-good)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {monthlyTrend && monthlyTrend.length > 0 && (
        <ChartCard title="Spend trend" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <AreaGradientDefs id="monthlyTrendFill" color="var(--chart-3)" />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                tickFormatter={(m: string) => m.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fill="url(#monthlyTrendFill)"
                dot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--chart-3)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {spendByMember && spendByMember.length > 0 && (
        <ChartCard title="Spend by teammate">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={spendByMember}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar
                dataKey="total"
                name="Spend"
                fill="var(--chart-1)"
                radius={[0, 4, 4, 0]}
                activeBar={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      No data yet this period.
    </div>
  );
}
