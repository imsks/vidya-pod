import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Vidya Pod/i);
  await expect(page.getByRole("link", { name: /sponsor/i }).first()).toBeVisible();
});

test("register page is reachable from navigation", async ({ page }) => {
  await page.goto("/register");

  await expect(page).toHaveTitle(/Register/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
