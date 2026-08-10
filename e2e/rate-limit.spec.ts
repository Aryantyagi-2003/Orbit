import { test, expect } from "@playwright/test";

import { resetSignInRateLimit } from "./helpers";

// Verifies the sign-in rate limiter actually trips — not just that the
// code exists. Requires the dev Redis shim (or real Upstash) to be running;
// see README for `redis-server` + `scripts/dev-redis-http-shim.mjs` setup.
//
// The limiter is keyed by IP, not by email — so tripping it here would
// otherwise block every other spec's sign-in for the rest of the 60s
// window. Clear its keys afterward so this test stays isolated.
test.afterEach(resetSignInRateLimit);

test("sign-in rate limiter blocks after repeated failed attempts", async ({
  page,
}) => {
  const email = `ratelimit-${Date.now()}@e2e.orbit.test`;

  await page.goto("/login");

  let sawRateLimitMessage = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("WrongPassw0rd!");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST", {
        timeout: 15000,
      }),
      page.getByRole("button", { name: "Sign in", exact: true }).last().click(),
    ]);

    const allAlerts = await page.locator('[role="alert"]').allTextContents();
    if (allAlerts.some((t) => t.includes("Too many attempts"))) {
      sawRateLimitMessage = true;
      break;
    }
  }

  expect(sawRateLimitMessage).toBe(true);
});
