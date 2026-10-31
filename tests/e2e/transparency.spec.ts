import { expect, test } from "@playwright/test";

const summary = {
  received: 9600,
  spent: 500,
  category_totals: [{ category: "STATIONERY", amount: 500 }],
  recent_expenses: [
    {
      id: "expense-1",
      category: "STATIONERY",
      amount: 500,
      description: "Notebooks for the pod",
      incurred_at: "2026-10-30",
    },
  ],
  supporters: [{ id: "sponsor-1", name: "Priya Patel" }],
  recent_expense_limit: 30,
};

test.describe("Transparency page", () => {
  test("renders figures once the API resolves", async ({ page }) => {
    await page.route("**/api/transparency", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(summary),
      });
    });

    await page.goto("/transparency");

    await expect(page.getByRole("heading", { name: /where the support goes/i })).toBeVisible();
    await expect(page.getByText("₹9,600")).toBeVisible();
    await expect(page.getByText("Notebooks for the pod")).toBeVisible();
    await expect(page.getByText("Priya Patel")).toBeVisible();
  });

  test("shows a retry affordance when the API fails", async ({ page }) => {
    await page.route("**/api/transparency", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unable to load figures" }),
      });
    });

    await page.goto("/transparency");

    await expect(page.getByText(/could not load the figures/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });
});
