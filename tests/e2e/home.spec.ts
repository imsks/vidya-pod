import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("has proper page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/vidya pods/i);
  });

  test("displays the main heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows brand navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /vidya pods/i }).first()).toBeVisible();
  });

  test("shows sponsor call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sponsor/i }).first()).toBeVisible();
  });

  test("navigates to sponsor page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /sponsor/i })
      .first()
      .click();
    await expect(page).toHaveURL(/sponsor/);
  });

  test("register route redirects to admin", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/admin$/);
  });
});
