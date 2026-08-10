import { requireUser } from "@/lib/session";
import { listExpenses } from "@/lib/data/expenses";
import { getOrgForMember, listCategories } from "@/lib/data/orgs";
import { ExpenseLedger } from "./expense-ledger";

export default async function ExpensesPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  const [expenses, categories, { role }] = await Promise.all([
    listExpenses(user.id, params.orgId),
    listCategories(user.id, params.orgId),
    getOrgForMember(user.id, params.orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Expenses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every expense submitted to this organization, newest first.
        </p>
      </div>
      <ExpenseLedger
        orgId={params.orgId}
        expenses={expenses.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          categoryId: e.categoryId,
          categoryName: e.category.name,
          amount: e.amount.toString(),
          note: e.note,
          submittedById: e.submittedById,
          submittedByName: e.submittedBy.name ?? e.submittedBy.email,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currentUserId={user.id}
        currentUserRole={role}
      />
    </div>
  );
}
