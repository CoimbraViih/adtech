import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("dashboard shell renders sidebar and topbar", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByText("Dashboard")).toBeVisible();
  await expect(page.getByText("Campanhas")).toBeVisible();
  await expect(page.getByText("Criativos")).toBeVisible();
});

test("login page renders magic link form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("Entrar no AdFlow")).toBeVisible();
  await expect(page.getByRole("button", { name: /link mágico/i })).toBeVisible();
});
