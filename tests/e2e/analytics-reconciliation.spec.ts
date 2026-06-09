import { test, expect } from "@playwright/test";

test.describe("Analytics Reconciliation page", () => {
  test("renderiza o heading da página de reconciliação", async ({ page }) => {
    await page.goto("/analytics/reconciliation");
    await expect(
      page.getByRole("heading", { name: "Reconciliação de Conversões" })
    ).toBeVisible();
  });

  test("mostra tabela ou estado vazio (nunca erro 500)", async ({ page }) => {
    const response = await page.goto("/analytics/reconciliation");
    expect(response?.status()).toBeLessThan(500);
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText("Nenhum dado disponível")
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test("link Reconciliação está visível na sidebar quando em /analytics", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("link", { name: /Reconcilia/i })).toBeVisible();
  });
});
