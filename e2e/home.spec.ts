import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the main heading", async ({ page }) => {
    await page.goto("/");

    // Check for the main heading
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for navigation
    await expect(page.getByRole("link", { name: /vidya pods/i })).toBeVisible();
  });

  test("should have 'Become a Sponsor' call to action", async ({ page }) => {
    await page.goto("/");

    // Check that the main CTA button is visible
    const ctaButton = page.getByRole("link", { name: /become a sponsor/i });
    await expect(ctaButton).toBeVisible();
  });

  test("should navigate to sponsor page", async ({ page }) => {
    await page.goto("/");

    // Find and click the sponsor link
    const sponsorLink = page.getByRole("link", { name: /sponsor/i }).first();
    await expect(sponsorLink).toBeVisible();
    await sponsorLink.click();
    await expect(page).toHaveURL(/.*sponsor.*/);
  });

  test("should have proper page title", async ({ page }) => {
    await page.goto("/");

    // Check for the page title
    await expect(page).toHaveTitle(/vidya pods/i);
  });
});
