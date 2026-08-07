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

  test("should navigate to register page", async ({ page }) => {
    await page.goto("/");

    // Find and click the register link
    const registerLink = page.getByRole("link", { name: /become a teacher/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register.*/);
    }
  });

  test("should navigate to sponsor page", async ({ page }) => {
    await page.goto("/");

    // Find and click the sponsor link
    const sponsorLink = page.getByRole("link", { name: /sponsor/i }).first();
    if (await sponsorLink.isVisible()) {
      await sponsorLink.click();
      await expect(page).toHaveURL(/.*sponsor.*/);
    }
  });

  test("should have proper page title", async ({ page }) => {
    await page.goto("/");

    // Check for the page title
    await expect(page).toHaveTitle(/vidya pods/i);
  });
});
