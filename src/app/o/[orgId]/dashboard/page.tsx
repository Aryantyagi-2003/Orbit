import { requireUser } from "@/lib/session";
import { getSpendByCategory, getSpendOverTime } from "@/lib/data/expenses";
import { listBudgets } from "@/lib/data/budgets";
import { DashboardCharts } from "./dashboard-charts";

function monthRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
  );
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return { from, to, period };
}

export default async function DashboardPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  const { from, to, period } = monthRange();

  const [byCategory, overTime, budgets] = await Promise.all([
    getSpendByCategory(user.id, params.orgId, from, to),
    getSpendOverTime(user.id, params.orgId, from, to),
    listBudgets(user.id, params.orgId, period),
  ]);

  const totalSpend = byCategory.reduce((sum, c) => sum + c.total, 0);
  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}{" "}
          to date.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total spend" value={totalSpend} />
        <StatTile label="Total budgeted" value={totalBudgeted} />
        <StatTile
          label="Remaining"
          value={totalBudgeted - totalSpend}
          tone={totalBudgeted - totalSpend < 0 ? "critical" : "good"}
        />
      </div>

      <DashboardCharts
        byCategory={byCategory.map((c) => ({
          categoryId: c.category.id,
          name: c.category.name,
          total: c.total,
        }))}
        overTime={overTime}
        budgetVsActual={budgets.map((b) => ({
          name: b.category.name,
          budgeted: Number(b.amount),
          actual: b.actual,
        }))}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "critical";
}) {
  const formatted = value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-1 font-serif text-3xl tabular-nums " +
          (tone === "critical"
            ? "text-status-critical"
            : tone === "good"
              ? "text-status-good"
              : "text-foreground")
        }
      >
        {formatted}
      </p>
    </div>
  );
}
