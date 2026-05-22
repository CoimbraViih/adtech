import { test, expect } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Login via the dev-login shortcut (sets cookie directly, no form needed) */
async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
  await page.goto(`/api/auth/dev-login?next=${next}`);
  await page.waitForURL(next, { timeout: 8000 });
}

// ── Auth route protection ─────────────────────────────────────────────────────

test.describe("Route protection — unauthenticated", () => {
  test("redirects /dashboard → /login without session cookie", async ({ page }) => {
    // Clear all cookies to ensure clean state
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /dashboard → /login with ?next param preserved", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/next=%2Fdashboard/);
  });

  test("allows /login page without session", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Entrar no AdFlow")).toBeVisible();
  });

  test("allows /signup page without session", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("Route protection — authenticated", () => {
  test("redirects /login → /dashboard when already logged in", async ({ page }) => {
    await devLogin(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("redirects /signup → /dashboard when already logged in", async ({ page }) => {
    await devLogin(page);
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("allows /dashboard when logged in", async ({ page }) => {
    await devLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Dashboard")).toBeVisible();
  });
});

// ── Login form ────────────────────────────────────────────────────────────────

test.describe("Login form", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
  });

  test("shows inline error for empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /link mágico/i }).click();
    await expect(page.getByText("E-mail é obrigatório")).toBeVisible();
  });

  test("shows inline error for invalid email", async ({ page }) => {
    await page.getByLabel("E-mail").fill("not-an-email");
    await page.getByRole("button", { name: /link mágico/i }).click();
    await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  });

  test("shows success state after valid email submit", async ({ page }) => {
    await page.getByLabel("E-mail").fill("test@agencia.com");
    await page.getByRole("button", { name: /link mágico/i }).click();
    await expect(page.getByText("Link enviado!")).toBeVisible({ timeout: 5000 });
  });

  test("dev-login link is visible in non-production", async ({ page }) => {
    await expect(page.getByText("entrar direto sem e-mail")).toBeVisible();
  });
});

// ── Signup form ───────────────────────────────────────────────────────────────

test.describe("Signup form", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
  });

  test("shows errors for empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByText("Nome deve ter ao menos 2 caracteres")).toBeVisible();
    await expect(page.getByText("E-mail é obrigatório")).toBeVisible();
  });

  test("shows error for name too short", async ({ page }) => {
    await page.getByLabel("Nome completo").fill("A");
    await page.getByLabel("E-mail profissional").fill("test@example.com");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByText("Nome deve ter ao menos 2 caracteres")).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.getByLabel("Nome completo").fill("João Silva");
    await page.getByLabel("E-mail profissional").fill("not-email");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  });

  test("valid signup shows success state and navigates to onboarding", async ({ page }) => {
    await page.getByLabel("Nome completo").fill("João Silva");
    await page.getByLabel("E-mail profissional").fill("joao@agencia.com");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByText("Conta criada!")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5000 });
  });
});

// ── Onboarding wizard ─────────────────────────────────────────────────────────

test.describe("Onboarding wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/onboarding");
  });

  test("shows step 1 with org name and type fields", async ({ page }) => {
    await expect(page.getByText("Sobre sua organização")).toBeVisible();
    await expect(page.getByPlaceholder("Agência Exemplo LTDA")).toBeVisible();
    await expect(page.getByText("Agência")).toBeVisible();
  });

  test("step 1: shows error for empty org name", async ({ page }) => {
    await page.getByRole("button", { name: /próximo/i }).click();
    await expect(page.getByText("Nome da organização deve ter ao menos 2 caracteres")).toBeVisible();
  });

  test("step 1 → step 2: fills org and advances", async ({ page }) => {
    await page.getByPlaceholder("Agência Exemplo LTDA").fill("Minha Agência");
    await page.getByText("Agência").click();
    await page.getByRole("button", { name: /próximo/i }).click();
    await expect(page.getByText("Crie seu primeiro workspace")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Minha Agência")).toBeVisible();
  });

  test("full onboarding → redirects to /dashboard with session cookie", async ({ page }) => {
    // Step 1
    await page.getByPlaceholder("Agência Exemplo LTDA").fill("Agência Teste");
    await page.getByText("Agência").click();
    await page.getByRole("button", { name: /próximo/i }).click();

    // Step 2
    await expect(page.getByText("Crie seu primeiro workspace")).toBeVisible({ timeout: 5000 });
    const wsInput = page.getByPlaceholder("Clientes principais");
    await wsInput.clear();
    await wsInput.fill("Workspace Principal");
    await page.getByRole("button", { name: /entrar no dashboard/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
    await expect(page.getByText("Dashboard")).toBeVisible();
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

test.describe("Logout", () => {
  test("logout clears session and redirects to /login", async ({ page }) => {
    await devLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Open user menu and click logout
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /sair/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

    // After logout, /dashboard should redirect back to /login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Dev-login shortcut ────────────────────────────────────────────────────────

test.describe("Dev-login route", () => {
  test("GET /api/auth/dev-login sets session and redirects to /dashboard", async ({ page }) => {
    await page.context().clearCookies();
    await devLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Session cookie should now be present
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "adflow_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
  });

  test("GET /api/auth/dev-login respects ?next param", async ({ page }) => {
    await page.context().clearCookies();
    await devLogin(page, "/onboarding");
    await expect(page).toHaveURL(/\/onboarding/);
  });
});
