import { test, expect } from "@playwright/test";

// M15 — Creative Asset Uploads E2E
// Note: uploads use mock stubs so no real files are sent to storage.

test.describe("Creative uploads — AI Studio", () => {
  test("criativo detail shows assets section", async ({ page }) => {
    await page.goto("/creatives");
    // Click on any creative in the gallery
    const firstCard = page.locator("a[href^='/creatives/']").first();
    await firstCard.click();
    await page.waitForURL(/\/creatives\/.+/);

    await expect(page.getByText(/assets do criativo/i)).toBeVisible();
    await expect(
      page.getByText(/arraste imagens ou clique para selecionar/i)
    ).toBeVisible();
  });

  test("dropzone rejects oversized files client-side", async ({ page }) => {
    // Navigate to a creative detail
    await page.goto("/creatives");
    const link = page.locator("a[href^='/creatives/']").first();
    await link.click();
    await page.waitForURL(/\/creatives\/.+/);

    // react-dropzone rejection shows error without calling API
    const dropInput = page
      .locator("input[type='file']")
      .first();

    // Create a 15 MB buffer (over limit)
    const oversizedBuffer = Buffer.alloc(15 * 1024 * 1024, "x");
    await dropInput.setInputFiles({
      name: "huge.png",
      mimeType: "image/png",
      buffer: oversizedBuffer,
    });

    // react-dropzone should display a rejection message
    await expect(page.getByText(/huge\.png/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Creative uploads — Campaign detail", () => {
  test("campaign detail shows assets section", async ({ page }) => {
    await page.goto("/campaigns");
    const firstCampaign = page.locator("a[href^='/campaigns/']:not([href*='programmatic'])").first();
    await firstCampaign.click();
    await page.waitForURL(/\/campaigns\/(?!programmatic).+/);

    await expect(page.getByText(/imagens da campanha/i)).toBeVisible();
    await expect(
      page.getByText(/arraste imagens ou clique para selecionar/i)
    ).toBeVisible();
  });
});

test.describe("Creative uploads — RTB campaign detail", () => {
  test("rtb campaign detail shows banners section", async ({ page }) => {
    await page.goto("/campaigns/programmatic");
    const firstCampaign = page.locator("a[href^='/campaigns/programmatic/']").first();
    await firstCampaign.click();
    await page.waitForURL(/\/campaigns\/programmatic\/.+/);

    await expect(page.getByText(/banners display/i)).toBeVisible();
    // IAB format badges visible
    await expect(page.getByText(/300×250/i)).toBeVisible();
    await expect(page.getByText(/728×90/i)).toBeVisible();
    await expect(
      page.getByText(/arraste imagens ou clique para selecionar/i)
    ).toBeVisible();
  });
});
