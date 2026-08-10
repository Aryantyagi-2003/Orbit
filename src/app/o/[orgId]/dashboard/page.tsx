import { requireUser } from "@/lib/session";
import {
  getExpenseStats,
  getMonthlySpendTrend,
  getMyExpenseStats,
  getMyRecentExpenses,
  getRecentExpenses,
  getSpendByCategory,
  getSpendByMember,
  getSpendOverTime,
  getSpendTotal,
  getTopExpenses,
} from "@/lib/data/expenses";
import {
  countCategoriesOverBudget,
  getCategoryBreakdown,
  listBudgets,
} from "@/lib/data/budgets";
import { getOrgForMember, listCategories } from "@/lib/data/orgs";
import { can } from "@/lib/permissions";
import {
  currentPeriodKey,
  isPeriodKey,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/date-ranges";
import {
  AlertTriangle,
  Banknote,
  Gauge,
  Layers,
  Receipt,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";

import { FilterBar } from "./filter-bar";
import { StatTile, StatTileGrid } from "./stat-tiles";
import { money } from "./format";
import { DashboardCharts } from "./dashboard-charts";
import { CompositionBar } from "./composition-bar";
import { CategoryBreakdownTable } from "./category-breakdown-table";
import { TopExpensesList } from "./top-expenses";
import { ActivityFeed } from "./activity-feed";
import { BudgetMeter } from "./budget-meter";
import { BiggestMover } from "./biggest-mover";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 shadow-[0_1px_2px_rgba(38,32,25,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(38,32,25,0.08)]">
      <h2 className="mb-4 font-medium text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: { orgId: string };
  searchParams: { period?: string; category?: string };
}) {
  const user = await requireUser();
  const { role } = await getOrgForMember(user.id, params.orgId);

  const periodKey: PeriodKey = isPeriodKey(searchParams.period)
    ? searchParams.period
    : "this-month";
  const resolved = resolvePeriod(periodKey);
  const categoryId = searchParams.category || undefined;

  const categories = await listCategories(user.id, params.orgId);

  const canSeeFinance = can(role, "budget:manage");

  if (!canSeeFinance) {
    // Member view: their own numbers first, org budgets as read-only context
    // — never a peer-spend leaderboard, which belongs to Admin/Owner only.
    const [myStats, byCategory, budgetVsActual, myRecent] = await Promise.all([
      getMyExpenseStats(user.id, params.orgId, resolved.from, resolved.to),
      getSpendByCategory(
        user.id,
        params.orgId,
        resolved.from,
        resolved.to,
        categoryId,
      ),
      listBudgets(user.id, params.orgId, currentPeriodKey()),
      getMyRecentExpenses(user.id, params.orgId, 8),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {resolved.label}
            </p>
          </div>
          <FilterBar
            period={periodKey}
            categoryId={categoryId ?? null}
            categories={categories}
          />
        </div>

        <StatTileGrid>
          <StatTile label="My spend" value={money(myStats.total)} icon={<Banknote className="h-3.5 w-3.5 text-muted-foreground/60" />} />
          <StatTile label="My expenses" value={String(myStats.count)} icon={<Layers className="h-3.5 w-3.5 text-muted-foreground/60" />} />
          <StatTile
            label="Org budget remaining"
            value={money(
              budgetVsActual.reduce((sum, b) => sum + Number(b.amount), 0) -
                budgetVsActual.reduce((sum, b) => sum + b.actual, 0),
            )}
            icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground/60" />}
          />
        </StatTileGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Org spend by category">
            <CompositionBar
              segments={byCategory.map((c) => ({
                categoryId: c.category.id,
                name: c.category.name,
                total: c.total,
              }))}
            />
          </Section>
          <Section title="My recent expenses">
            <ActivityFeed
              items={myRecent.map((e) => ({
                id: e.id,
                amount: Number(e.amount),
                categoryName: e.category.name,
                submittedByName: e.submittedBy.name ?? e.submittedBy.email,
                createdAt: e.createdAt.toISOString(),
              }))}
            />
          </Section>
        </div>
      </div>
    );
  }

  // Owner/Admin: the full finance suite.
  const [
    stats,
    prevTotal,
    byCategory,
    prevByCategory,
    overTime,
    budgets,
    monthlyTrend,
    spendByMember,
    topExpenses,
    recent,
    breakdown,
    overBudgetCount,
  ] = await Promise.all([
    getExpenseStats(
      user.id,
      params.orgId,
      resolved.from,
      resolved.to,
      categoryId,
    ),
    getSpendTotal(
      user.id,
      params.orgId,
      resolved.prevFrom,
      resolved.prevTo,
      categoryId,
    ),
    getSpendByCategory(
      user.id,
      params.orgId,
      resolved.from,
      resolved.to,
      categoryId,
    ),
    getSpendByCategory(
      user.id,
      params.orgId,
      resolved.prevFrom,
      resolved.prevTo,
      categoryId,
    ),
    getSpendOverTime(
      user.id,
      params.orgId,
      resolved.from,
      resolved.to,
      categoryId,
    ),
    listBudgets(user.id, params.orgId, currentPeriodKey()),
    getMonthlySpendTrend(user.id, params.orgId, 6, categoryId),
    getSpendByMember(
      user.id,
      params.orgId,
      resolved.from,
      resolved.to,
      categoryId,
    ),
    getTopExpenses(
      user.id,
      params.orgId,
      resolved.from,
      resolved.to,
      8,
      categoryId,
    ),
    getRecentExpenses(user.id, params.orgId, 8),
    getCategoryBreakdown(user.id, params.orgId, currentPeriodKey(), categoryId),
    countCategoriesOverBudget(user.id, params.orgId, currentPeriodKey()),
  ]);

  const prevByCategoryMap = new Map(
    prevByCategory.map((c) => [c.category.id, c.total]),
  );
  const movers = byCategory.map((c) => ({
    categoryName: c.category.name,
    current: c.total,
    previous: prevByCategoryMap.get(c.category.id) ?? 0,
  }));

  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.actual, 0);
  const remaining = totalBudgeted - totalActual;

  const momDelta =
    prevTotal > 0 ? ((stats.total - prevTotal) / prevTotal) * 100 : null;

  const daysElapsed = resolved.isCurrentMonth
    ? Math.max(
        1,
        Math.ceil((Date.now() - resolved.from.getTime()) / 86_400_000),
      )
    : null;
  const daysInPeriod = resolved.isCurrentMonth
    ? Math.ceil((resolved.to.getTime() - resolved.from.getTime()) / 86_400_000)
    : null;
  const projectedSpend =
    daysElapsed && daysInPeriod
      ? (stats.total / daysElapsed) * daysInPeriod
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{resolved.label}</p>
        </div>
        <FilterBar
          period={periodKey}
          categoryId={categoryId ?? null}
          categories={categories}
        />
      </div>

      <StatTileGrid>
        <StatTile
          label="Total spend"
          value={money(stats.total)}
          deltaPercent={momDelta}
          icon={<Banknote className="h-3.5 w-3.5 text-muted-foreground/60" />}
          sparkline={overTime.map((d) => d.total)}
        />
        <StatTile
          label="Total budgeted"
          value={money(totalBudgeted)}
          sublabel={currentPeriodKey()}
          icon={<Target className="h-3.5 w-3.5 text-muted-foreground/60" />}
        />
        <StatTile
          label="Remaining"
          value={money(remaining)}
          tone={remaining < 0 ? "critical" : "good"}
          icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground/60" />}
        />
        <StatTile
          label="Categories over budget"
          value={String(overBudgetCount)}
          tone={overBudgetCount > 0 ? "critical" : "good"}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/60" />}
        />
        <StatTile
          label="Avg expense"
          value={money(stats.average, { maxFractionDigits: 2 })}
          icon={<Receipt className="h-3.5 w-3.5 text-muted-foreground/60" />}
        />
        <StatTile label="Expense count" value={String(stats.count)} icon={<Layers className="h-3.5 w-3.5 text-muted-foreground/60" />} />
        <StatTile
          label="Largest expense"
          value={stats.largest ? money(stats.largest.amount) : "—"}
          sublabel={stats.largest?.categoryName}
          icon={<Trophy className="h-3.5 w-3.5 text-muted-foreground/60" />}
        />
        {projectedSpend !== null && (
          <StatTile
            label="Projected month-end"
            value={money(projectedSpend)}
            icon={<Gauge className="h-3.5 w-3.5 text-muted-foreground/60" />}
            tone={
              totalBudgeted > 0 && projectedSpend > totalBudgeted
                ? "critical"
                : undefined
            }
            sublabel="at current pace"
          />
        )}
      </StatTileGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Overall budget usage">
          <BudgetMeter actual={totalActual} budgeted={totalBudgeted} />
        </Section>
        <div className="lg:col-span-2">
          <Section title="Biggest movers vs. last period">
            <BiggestMover movers={movers} />
          </Section>
        </div>
      </div>

      <Section title="Spend composition">
        <CompositionBar
          segments={byCategory.map((c) => ({
            categoryId: c.category.id,
            name: c.category.name,
            total: c.total,
          }))}
        />
      </Section>

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
        monthlyTrend={monthlyTrend}
        spendByMember={spendByMember.map((m) => ({
          name: m.name,
          total: m.total,
        }))}
      />

      <Section title="Category breakdown">
        <CategoryBreakdownTable rows={breakdown} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top expenses">
          <TopExpensesList
            expenses={topExpenses.map((e) => ({
              id: e.id,
              amount: Number(e.amount),
              date: e.date.toISOString(),
              note: e.note,
              categoryName: e.category.name,
              submittedByName: e.submittedBy.name ?? e.submittedBy.email,
            }))}
          />
        </Section>
        <Section title="Recent activity">
          <ActivityFeed
            items={recent.map((e) => ({
              id: e.id,
              amount: Number(e.amount),
              categoryName: e.category.name,
              submittedByName: e.submittedBy.name ?? e.submittedBy.email,
              createdAt: e.createdAt.toISOString(),
            }))}
          />
        </Section>
      </div>
    </div>
  );
}
