import { test, expect } from "@playwright/test";

import {
  createVerifiedUser,
  createOrgWithOwner,
  createExpenseFixture,
  prisma,
  resetSignInRateLimit,
} from "./helpers";

test.describe("cross-org isolation", () => {
  test.beforeEach(resetSignInRateLimit);

  test("a user in Org A cannot read or mutate Org B's data, even via direct URL", async ({
    page,
  }) => {
    const ownerA = await createVerifiedUser("owner-a", "Owner A");
    const ownerB = await createVerifiedUser("owner-b", "Owner B");
    const { org: orgA } = await createOrgWithOwner(
      "Org A " + Date.now(),
      ownerA,
    );
    const { org: orgB, category: categoryB } = await createOrgWithOwner(
      "Org B " + Date.now(),
      ownerB,
    );
    const orgBExpense = await createExpenseFixture(
      orgB.id,
      categoryB.id,
      ownerB.id,
      "999.99",
    );

    // Sign in as Org A's owner.
    await page.goto("/login");
    await page.getByLabel("Email").fill(ownerA.email);
    await page.getByLabel("Password").fill(ownerA.password);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    await page.waitForURL(`**/o/${orgA.id}/**`, { timeout: 20000 });

    // Direct URL access to Org B's dashboard, expenses, and members pages —
    // Org A's owner is authenticated, just not a member of Org B.
    for (const path of [
      `/o/${orgB.id}/dashboard`,
      `/o/${orgB.id}/expenses`,
      `/o/${orgB.id}/settings/members`,
      `/o/${orgB.id}/settings/audit-log`,
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain(`/o/${orgB.id}`);
      const body = await page.textContent("body");
      expect(body).not.toContain("999.99");
      expect(body).not.toContain(orgB.name);
    }

    // Confirm Org B's data is untouched in the database.
    const stillThere = await prisma.expense.findUnique({
      where: { id: orgBExpense.id },
    });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.amount.toString()).toBe("999.99");
  });
});
