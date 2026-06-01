import { test, expect } from "@playwright/test";

async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

test.describe("Diagnostics page (/analytics/diagnostics)", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/analytics/diagnostics");
  });

  test("renders page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /diagnósticos de campanha/i }),
    ).toBeVisible();
  });

  test("renders description text", async ({ page }) => {
    await expect(
      page.getByText(/problemas detectados automaticamente/i),
    ).toBeVisible();
  });

  test("shows Run button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /rodar análise/i }),
    ).toBeVisible();
  });

  test("shows empty state when no diagnostics", async ({ page }) => {
    // The dev/mock environment starts with no open diagnostics
    await expect(
      page.getByText(/nenhum problema detectado/i),
    ).toBeVisible();
  });
});

test.describe("Diagnostics nav entry", () => {
  test("sidebar shows Diagnósticos link", async ({ page }) => {
    await devLogin(page, "/dashboard");
    await expect(
      page.getByRole("link", { name: /diagnósticos/i }),
    ).toBeVisible();
  });

  test("clicking Diagnósticos navigates to /analytics/diagnostics", async ({ page }) => {
    await devLogin(page, "/dashboard");
    await page.getByRole("link", { name: /diagnósticos/i }).click();
    await expect(page).toHaveURL(/\/analytics\/diagnostics/);
  });
});
