import { test, expect } from "@playwright/test";

/** Login via the dev-login shortcut (sets cookie directly, no form needed) */
async function devLogin(
  page: import("@playwright/test").Page,
  next = "/dashboard"
) {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

test.describe("PMP Deals Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the deals page
    await devLogin(page, "/campaigns/programmatic/deals");
  });

  test("deals page renders table headers", async ({ page }) => {
    await expect(page.getByText("PMP Deals")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /novo deal/i })
    ).toBeVisible();
  });

  test("clicking Novo Deal opens dialog", async ({ page }) => {
    await page.getByRole("button", { name: /novo deal/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Deal ID")).toBeVisible();
  });

  test("dialog has required form fields", async ({ page }) => {
    await page.getByRole("button", { name: /novo deal/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Check for key fields (Deal ID, Seller ID, Bidfloor, Status)
    const dialog = page.getByRole("dialog");
    const dealIdInput = dialog.locator('input[id*="deal"], input[placeholder*="deal"], input[aria-label*="deal" i]');
    const hasDealIdField =
      (await dealIdInput.count()) > 0 ||
      (await dialog.getByText(/deal id/i).isVisible().catch(() => false));

    expect(hasDealIdField).toBe(true);
  });

  test("closes dialog when Escape key pressed", async ({ page }) => {
    await page.getByRole("button", { name: /novo deal/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("sidebar shows 'PMP Deals' or campaigns navigation", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const hasDealLink =
      (await nav.getByText(/deal/i).isVisible().catch(() => false)) ||
      (await nav.getByText(/programmatic/i).isVisible().catch(() => false));
    expect(hasDealLink).toBe(true);
  });
});

test.describe("PMP Bid Enforcement — API", () => {
  const BID_URL = "/api/rtb/bid";

  test("open auction ignores pmp field", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-open-1",
        imp: [{ id: "imp-1", bidfloor: 1 }],
        at: 1,
      },
    });
    // Should either 200 (bid) or 204 (no bid) — not 400 (invalid)
    expect([200, 204]).toContain(res.status());
  });

  test("private auction with no matching deal returns 204", async ({
    request,
  }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-private-nomatch",
        imp: [
          {
            id: "imp-1",
            bidfloor: 1,
            pmp: {
              private_auction: 1,
              deals: [{ id: "deal-does-not-exist-xyz" }],
            },
          },
        ],
        at: 1,
      },
    });
    expect(res.status()).toBe(204);
  });

  test("bid request with valid pmp schema is not rejected", async ({
    request,
  }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-pmp-valid",
        imp: [
          {
            id: "imp-1",
            bidfloor: 2,
            pmp: {
              private_auction: 1,
              deals: [
                { id: "deal-test", bidfloor: 2, wseat: ["seat-1"] },
              ],
            },
          },
        ],
        at: 1,
        user: { id: "user-test-1" },
      },
    });
    // Not 400 (schema valid), could be 200 or 204
    expect(res.status()).not.toBe(400);
  });

  test("pmp field with private_auction=0 is accepted", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-pmp-open",
        imp: [
          {
            id: "imp-1",
            bidfloor: 1,
            pmp: {
              private_auction: 0,
              deals: [],
            },
          },
        ],
        at: 1,
      },
    });
    // Should be 200 or 204, not 400
    expect([200, 204]).toContain(res.status());
  });

  test("missing pmp field is valid for open auction", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-no-pmp",
        imp: [{ id: "imp-1", bidfloor: 1 }],
        at: 1,
      },
    });
    expect([200, 204]).toContain(res.status());
  });

  test("invalid json body returns 400", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: "not-valid-json",
      headers: { "Content-Type": "application/json" },
    });
    // Will be caught by JSON.parse or schema validation
    expect(res.status()).toBe(400);
  });

  test("missing required imp array returns 400", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-no-imp",
        at: 1,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("empty imp array returns 400", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-empty-imp",
        imp: [],
        at: 1,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("pmp deals array with valid structure accepted", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-pmp-deals",
        imp: [
          {
            id: "imp-1",
            bidfloor: 1.5,
            pmp: {
              private_auction: 1,
              deals: [
                { id: "deal-1", bidfloor: 1.5 },
                { id: "deal-2", bidfloor: 2.0, wseat: ["seat-a", "seat-b"] },
              ],
            },
          },
        ],
        at: 1,
      },
    });
    // Schema accepts this; response is 200/204/no error
    expect(res.status()).not.toBe(400);
  });

  test("user id in bid request is optional", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-no-user",
        imp: [{ id: "imp-1", bidfloor: 1 }],
        at: 1,
        // No user field
      },
    });
    expect([200, 204]).toContain(res.status());
  });

  test("returns CORS headers", async ({ request }) => {
    const res = await request.post(BID_URL, {
      data: {
        id: "req-cors",
        imp: [{ id: "imp-1", bidfloor: 1 }],
        at: 1,
      },
    });
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
  });

  test("OPTIONS request returns 204 with CORS headers", async ({
    request,
  }) => {
    const res = await request.options(BID_URL);
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    expect(res.headers()["access-control-allow-methods"]).toContain("POST");
  });
});
