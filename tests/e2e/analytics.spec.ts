import { test, expect } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Login via the dev-login shortcut (sets cookie directly, no form needed) */
async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

// ── Analytics page ────────────────────────────────────────────────────────────

test.describe("Analytics & Attribution page (/analytics)", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/analytics");
  });

  test("renders page title and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /analytics & atribuição/i })).toBeVisible();
    await expect(page.getByText(/performance de conversões/i)).toBeVisible();
  });

  test("renders all KPI cards", async ({ page }) => {
    await expect(page.getByText("Total de Eventos")).toBeVisible();
    await expect(page.getByText("Conversões")).toBeVisible();
    await expect(page.getByText("Receita")).toBeVisible();
    await expect(page.getByText("CPA")).toBeVisible();
    await expect(page.getByText("Ticket Médio")).toBeVisible();
  });

  test("funnel chart section is visible", async ({ page }) => {
    await expect(page.getByText(/funil de conversão/i)).toBeVisible();
  });

  test("attribution section is visible with channel data", async ({ page }) => {
    await expect(page.getByText(/atribuição por canal/i)).toBeVisible();
    // Check for channel labels in the table (displayed as localized names)
    await expect(page.getByText("Google")).toBeVisible();
    await expect(page.getByText(/Facebook|Meta/)).toBeVisible();
  });

  test("sidebar shows Analytics link", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByText("Analytics")).toBeVisible();
  });
});

// ── Attribution model selector ─────────────────────────────────────────────────

test.describe("Attribution model selector", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/analytics");
  });

  test("shows all attribution model buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /último clique/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /linear/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /decaimento temporal/i })).toBeVisible();
  });

  test("switches to linear model", async ({ page }) => {
    await page.getByRole("button", { name: /linear/i }).click();
    await expect(page).toHaveURL(/model=linear/);
  });

  test("switches to time decay model", async ({ page }) => {
    await page.getByRole("button", { name: /decaimento temporal/i }).click();
    await expect(page).toHaveURL(/model=time_decay/);
  });
});

// ── Date range picker ──────────────────────────────────────────────────────────

test.describe("Date range picker", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/analytics");
  });

  test("shows all preset date range buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /7 dias/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /30 dias/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /90 dias/i })).toBeVisible();
  });

  test("date preset updates URL with date parameters", async ({ page }) => {
    await page.getByRole("button", { name: /7 dias/i }).click();
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  });

  test("preserves model parameter when changing date range", async ({ page }) => {
    await page.getByRole("button", { name: /linear/i }).click();
    await expect(page).toHaveURL(/model=linear/);
    await page.getByRole("button", { name: /7 dias/i }).click();
    await expect(page).toHaveURL(/model=linear/);
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────────

test.describe("Analytics navigation", () => {
  test("clicking sidebar Analytics link navigates to /analytics", async ({ page }) => {
    await devLogin(page, "/dashboard");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByText("Analytics").click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByRole("heading", { name: /analytics & atribuição/i })).toBeVisible();
  });
});
