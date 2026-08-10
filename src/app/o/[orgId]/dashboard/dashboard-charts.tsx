"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <h2 className="mb-4 font-medium text-foreground">{title}</h2>
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
    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-mono text-muted-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}: {money(p.value)}
        </p>
      ))}
    </div>
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
            <BarChart
              data={byCategory}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar dataKey="total" name="Spend" radius={[3, 3, 0, 0]}>
                {byCategory.map((entry) => {
                  const colorIndex = sortedCategories.findIndex(
                    (c) => c.categoryId === entry.categoryId,
                  );
                  return (
                    <Cell
                      key={entry.categoryId}
                      fill={
                        CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length]
                      }
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
            <LineChart
              data={overTime}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--chart-1)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Budget vs actual">
        {budgetVsActual.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={budgetVsActual}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--accent)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="budgeted"
                name="Budgeted"
                fill="var(--chart-1)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <ReferenceLine x={0} stroke="var(--border)" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0].value as number;
                  return (
                    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="mb-1 font-mono text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-foreground">
                        {v > 0
                          ? "Over by "
                          : v < 0
                            ? "Under by "
                            : "On budget — "}
                        {money(Math.abs(v))}
                      </p>
                    </div>
                  );
                }}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar dataKey="variance" radius={[0, 3, 3, 0]}>
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
        <ChartCard title="Spend trend — last 6 months">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={monthlyTrend}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(m: string) => m.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--chart-3)" }}
              />
            </LineChart>
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar
                dataKey="total"
                name="Spend"
                fill="var(--chart-1)"
                radius={[0, 3, 3, 0]}
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
