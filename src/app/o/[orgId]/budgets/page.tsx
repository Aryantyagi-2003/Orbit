import { requireUser } from "@/lib/session";
import { listBudgets } from "@/lib/data/budgets";
import { getOrgForMember, listCategories } from "@/lib/data/orgs";
import { can } from "@/lib/permissions";
import { BudgetList } from "./budget-list";

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function BudgetsPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  const period = currentPeriod();
  const [budgets, categories, { role }] = await Promise.all([
    listBudgets(user.id, params.orgId, period),
    listCategories(user.id, params.orgId),
    getOrgForMember(user.id, params.orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Budgets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-category budgets for {period}, measured against actual spend.
        </p>
      </div>
      <BudgetList
        orgId={params.orgId}
        period={period}
        budgets={budgets.map((b) => ({
          id: b.id,
          categoryId: b.categoryId,
          categoryName: b.category.name,
          amount: b.amount.toString(),
          actual: b.actual,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        canManage={can(role, "budget:manage")}
      />
    </div>
  );
}
