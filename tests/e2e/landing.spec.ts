import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero headline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Publicidade com IA/i })
    ).toBeVisible();
  });

  test("renders the features section", async ({ page }) => {
    await expect(page.getByText("Tudo que sua agência precisa")).toBeVisible();
    await expect(page.getByText("Campanhas Unificadas")).toBeVisible();
    await expect(page.getByText("AI Creative Studio")).toBeVisible();
    await expect(page.getByText("Pixel Server-Side")).toBeVisible();
  });

  test("renders the pricing section", async ({ page }) => {
    await expect(page.getByText("Planos simples, sem surpresas")).toBeVisible();
    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Agency")).toBeVisible();
  });

  test("renders the FAQ section", async ({ page }) => {
    await expect(page.getByText("Perguntas frequentes")).toBeVisible();
  });

  test("FAQ item expands on click", async ({ page }) => {
    const firstQuestion = page.getByText(
      "O AdFlow funciona com Meta Ads e Google Ads ao mesmo tempo?"
    );
    await firstQuestion.click();
    await expect(
      page.getByText(/Meta Marketing API e a Google Ads API nativamente/)
    ).toBeVisible();
  });

  test("renders the waitlist section", async ({ page }) => {
    await expect(page.getByText("Entre na lista de espera")).toBeVisible();
  });

  test("shows validation errors on empty form submit", async ({ page }) => {
    await page.getByRole("button", { name: /Garantir minha vaga/i }).click();
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
    await expect(page.getByText("E-mail inválido")).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.getByLabel("Nome").fill("Ana Lima");
    await page.getByLabel("E-mail profissional").fill("not-an-email");
    await page.getByRole("button", { name: /Garantir minha vaga/i }).click();
    await expect(page.getByText("E-mail inválido")).toBeVisible();
  });

  test("submits the waitlist form successfully with valid data", async ({ page }) => {
    await page.getByLabel("Nome").fill("Ana Lima");
    await page.getByLabel("E-mail profissional").fill(`ana.${Date.now()}@agencia.com.br`);
    await page.getByLabel("Tamanho da agência").selectOption("small");
    await page.getByRole("button", { name: /Garantir minha vaga/i }).click();
    await expect(page.getByText("Você está na lista!")).toBeVisible({ timeout: 8000 });
  });

  test("marketing header has Login link pointing to /login", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: "Entrar" });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("navigates to /login from header", async ({ page }) => {
    await page.getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL("/login");
  });
});
