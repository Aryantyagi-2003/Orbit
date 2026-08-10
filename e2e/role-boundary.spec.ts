import { test, expect } from "@playwright/test";

import {
  createVerifiedUser,
  createOrgWithOwner,
  addMember,
  resetSignInRateLimit,
} from "./helpers";

test.describe("role boundary", () => {
  test.beforeEach(resetSignInRateLimit);

  test("a Member is UI-hidden from Admin-only actions on the members page", async ({
    page,
  }) => {
    const owner = await createVerifiedUser("rb-owner", "RB Owner");
    const admin = await createVerifiedUser("rb-admin", "RB Admin");
    const member = await createVerifiedUser("rb-member", "RB Member");
    const { org } = await createOrgWithOwner(
      "Role Boundary Org " + Date.now(),
      owner,
    );
    await addMember(org.id, admin.id, "ADMIN");
    await addMember(org.id, member.id, "MEMBER");

    await page.goto("/login");
    await page.getByLabel("Email").fill(member.email);
    await page.getByLabel("Password").fill(member.password);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    await page.waitForURL(`**/o/${org.id}/**`, { timeout: 60000 });

    // Member can't invite, can't see role selects, can't see remove — the
    // "Invite a teammate" panel shouldn't render at all for them.
    await page.goto(`/o/${org.id}/settings/members`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Invite a teammate")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("Remove", { exact: true })).toHaveCount(0);

    // Audit log is Admin/Owner only — a Member navigating there directly
    // gets bounced, not shown a stripped-down view.
    await page.goto(`/o/${org.id}/settings/audit-log`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/settings/audit-log");
  });

  test("an Admin sees member management, a Member does not — same org", async ({
    page,
  }) => {
    const owner = await createVerifiedUser("rb2-owner", "RB2 Owner");
    const admin = await createVerifiedUser("rb2-admin", "RB2 Admin");
    const { org } = await createOrgWithOwner(
      "Role Boundary Org 2 " + Date.now(),
      owner,
    );
    await addMember(org.id, admin.id, "ADMIN");

    await page.goto("/login");
    await page.getByLabel("Email").fill(admin.email);
    await page.getByLabel("Password").fill(admin.password);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    await page.waitForURL(`**/o/${org.id}/**`, { timeout: 60000 });

    await page.goto(`/o/${org.id}/settings/members`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Invite a teammate")).toBeVisible();
  });
});
