import { test, expect } from "@playwright/test";

/** Login via the dev-login shortcut (sets cookie directly, no form needed) */
async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

test.describe("Programmatic DSP/SSP pages", () => {
  test("página /campaigns/programmatic carrega com título", async ({ page }) => {
    await devLogin(page, "/campaigns/programmatic");
    await expect(page.getByRole("heading").filter({ hasText: /Programát/i })).toBeVisible();
  });

  test("exibe KPI cards na página principal", async ({ page }) => {
    await devLogin(page, "/campaigns/programmatic");
    // Expect at least 3 cards with numeric/metric content visible on the page
    const cards = page.locator("[data-testid*='kpi'], [class*='card'], [class*='Card']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("tabela de campanhas RTB tem linhas", async ({ page }) => {
    await devLogin(page, "/campaigns/programmatic");
    // Either a table with rows or a list of campaign cards should be present
    const tableRows = page.locator("table tbody tr");
    const listItems = page.locator("[data-testid='campaign-row'], [class*='campaign-row']");
    const rowCount = await tableRows.count();
    const listCount = await listItems.count();
    expect(rowCount + listCount).toBeGreaterThan(0);
  });

  test("botão Nova Campanha RTB navega para /new", async ({ page }) => {
    await devLogin(page, "/campaigns/programmatic");
    await page.getByRole("link", { name: /Nova Campanha/i }).click();
    await expect(page).toHaveURL(/\/campaigns\/programmatic\/new/);
  });

  test("wizard passo 1 mostra seletor de deal type", async ({ page }) => {
    await devLogin(page, "/campaigns/programmatic/new");
    // Look for deal type options (Open Auction or similar)
    const openAuction = page.getByText(/Open Auction|open|open_auction/i);
    const dealTypeLabel = page.getByText(/Deal Type|Tipo de Deal|deal/i);
    const hasOpenAuction = await openAuction.isVisible().catch(() => false);
    const hasDealTypeLabel = await dealTypeLabel.isVisible().catch(() => false);
    expect(hasOpenAuction || hasDealTypeLabel).toBe(true);
  });

  test("página /audiences carrega", async ({ page }) => {
    await devLogin(page, "/audiences");
    await expect(page.getByRole("heading", { name: /Audiências/i })).toBeVisible();
  });

  test("exibe KPI cards na página de audiências", async ({ page }) => {
    await devLogin(page, "/audiences");
    // Check for stat/metric cards or summary numbers
    const cards = page.locator("[data-testid*='kpi'], [class*='card'], [class*='Card'], [class*='stat']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("botão Nova Audiência abre dialog", async ({ page }) => {
    await devLogin(page, "/audiences");
    await page.getByRole("button", { name: /Nova Audiência/i }).click();
    // Check that a dialog or modal appears
    const dialog = page.getByRole("dialog");
    const formVisible = page.locator("form").first();
    const hasDialog = await dialog.isVisible().catch(() => false);
    const hasForm = await formVisible.isVisible().catch(() => false);
    expect(hasDialog || hasForm).toBe(true);
  });
});
