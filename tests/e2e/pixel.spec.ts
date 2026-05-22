import { test, expect } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Login via the dev-login shortcut (sets cookie directly, no form needed) */
async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

// ── Pixel list page ───────────────────────────────────────────────────────────

test.describe("Pixel list page (/pixel)", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/pixel");
  });

  test("renders heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pixels & tracking/i })).toBeVisible();
    await expect(page.getByText(/instale o pixel adflow/i)).toBeVisible();
  });

  test("renders 'Novo Pixel' button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /novo pixel/i })).toBeVisible();
  });

  test("renders pixel table with mock data", async ({ page }) => {
    // Should show the two mock pixels
    await expect(page.getByText("Site Principal")).toBeVisible();
    await expect(page.getByText("Landing Page Oferta")).toBeVisible();
  });

  test("sidebar shows 'Pixel' link", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByText("Pixel")).toBeVisible();
  });
});

// ── Create pixel dialog ───────────────────────────────────────────────────────

test.describe("Create pixel dialog", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/pixel");
  });

  test("opens when 'Novo Pixel' button clicked", async ({ page }) => {
    await page.getByRole("button", { name: /novo pixel/i }).click();
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).toBeVisible();
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByLabel(/meta pixel id/i)).toBeVisible();
    await expect(page.getByLabel(/google tag id/i)).toBeVisible();
  });

  test("closes when Escape key pressed", async ({ page }) => {
    await page.getByRole("button", { name: /novo pixel/i }).click();
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).not.toBeVisible();
  });

  test("closes when Cancelar button clicked", async ({ page }) => {
    await page.getByRole("button", { name: /novo pixel/i }).click();
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).toBeVisible();
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).not.toBeVisible();
  });

  test("shows error for empty name on submit", async ({ page }) => {
    await page.getByRole("button", { name: /novo pixel/i }).click();
    await page.getByRole("button", { name: /criar pixel/i }).click();
    // The input has required attribute, so HTML5 validation will prevent form submission
    // We can check that the form is still visible (dialog not closed)
    await expect(page.getByRole("heading", { name: /criar novo pixel/i })).toBeVisible();
  });
});

// ── Pixel detail page ─────────────────────────────────────────────────────────

test.describe("Pixel detail page (/pixel/px_demo_001)", () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, "/pixel/px_demo_001");
  });

  test("shows pixel name as heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /site principal/i })).toBeVisible();
  });

  test("shows pixel ID", async ({ page }) => {
    await expect(page.getByText("px_demo_001")).toBeVisible();
  });

  test("shows event summary cards", async ({ page }) => {
    // Total de Eventos
    await expect(page.getByText("Total de Eventos")).toBeVisible();
    // Compras
    await expect(page.getByText("Compras")).toBeVisible();
    // Receita Rastreada
    await expect(page.getByText("Receita Rastreada")).toBeVisible();
  });

  test("shows 'Código de instalação' section", async ({ page }) => {
    await expect(page.getByText("Código de instalação")).toBeVisible();
    // Should show the pixel snippet code
    await expect(page.getByText(/window\.__ADFLOW_PIXEL_ID/)).toBeVisible();
  });

  test("shows 'Log de Eventos' section", async ({ page }) => {
    await expect(page.getByText("Log de Eventos")).toBeVisible();
  });

  test("'Copiar snippet' button exists and works", async ({ page }) => {
    const copyButton = page.getByRole("button", { name: /copiar snippet/i });
    await expect(copyButton).toBeVisible();

    // Verify the button shows "Copiado!" after click
    await copyButton.click();
    await expect(page.getByRole("button", { name: /copiado!/i })).toBeVisible({ timeout: 3000 });

    // After 2 seconds, it should return to "Copiar snippet"
    await page.waitForTimeout(2100);
    await expect(page.getByRole("button", { name: /copiar snippet/i })).toBeVisible();
  });

  test("displays event types in log table", async ({ page }) => {
    // Check for event type columns (page_view, purchase, lead from mock data)
    await expect(page.getByText(/page_view|purchase|lead/)).toBeVisible();
  });

  test("sidebar shows 'Pixel' link", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByText("Pixel")).toBeVisible();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

test.describe("Pixel navigation", () => {
  test("clicking sidebar Pixel link navigates to /pixel", async ({ page }) => {
    await devLogin(page, "/dashboard");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByText("Pixel").click();
    await expect(page).toHaveURL(/\/pixel/);
    await expect(page.getByRole("heading", { name: /pixels & tracking/i })).toBeVisible();
  });

  test("pixel table shows clickable rows", async ({ page }) => {
    await devLogin(page, "/pixel");
    // Click on the first pixel (Site Principal)
    await page.getByText("Site Principal").click();
    await expect(page).toHaveURL(/\/pixel\/px_demo_001/);
  });
});
