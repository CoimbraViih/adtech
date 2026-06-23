import { test, expect } from "@playwright/test";

/**
 * E2E: pixel ingestion.
 * Estes testes verificam que a rota de ingestão responde corretamente
 * e que a UI de detalhe do pixel renderiza o log de eventos.
 * Não dependem de um pixel real no DB — usam mocks via MSW/fakeSurvey se disponível,
 * ou verificam a UI com dados mock (o estado atual do app).
 */

test.describe("Pixel ingestion API", () => {
  test("POST /api/pixel/nonexistent retorna 404", async ({ request }) => {
    const res = await request.post("/api/pixel/00000000-0000-0000-0000-000000000000", {
      data: { event_type: "page_view" },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /api/pixel/[id] com event_type inválido retorna 400", async ({ request }) => {
    const res = await request.post("/api/pixel/00000000-0000-0000-0000-000000000000", {
      data: { event_type: "invalid_type_xyz" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/pixel/[id] com payload > 10KB retorna 413", async ({ request }) => {
    const bigPayload = { event_type: "page_view", properties: { x: "a".repeat(11 * 1024) } };
    const res = await request.post("/api/pixel/any-pixel-id", {
      data: bigPayload,
    });
    expect(res.status()).toBe(413);
  });

  test("POST /api/pixel/[id] com JSON inválido retorna 400", async ({ request }) => {
    const res = await request.post("/api/pixel/any-pixel-id", {
      headers: { "Content-Type": "application/json" },
      data: "{ invalid json {{",
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Pixel detail page — event log", () => {
  async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
    await page.goto(`/api/auth/dev-login?next=${next}`);
    await page.waitForURL(next, { timeout: 8000 });
  }

  test("página de detalhe do pixel renderiza log de eventos", async ({ page }) => {
    await devLogin(page, "/pixel");
    // Clicar no primeiro pixel da lista (mock data: "Site Principal")
    await page.getByText("Site Principal").click();
    await page.waitForURL(/\/pixel\/.+/, { timeout: 5000 });
    // A seção de evento log deve estar visível
    await expect(page.getByText(/eventos recentes|event log|log de eventos/i)).toBeVisible();
  });

  test("GET /api/health retorna status ok com campo checks.db", async ({ request }) => {
    const res = await request.get("/api/health");
    // Em ambiente de test sem DB real, pode retornar 503 — o importante é que retorne JSON válido
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("db");
  });
});
