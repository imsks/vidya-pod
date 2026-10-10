import { expect, test } from "@playwright/test";

test.describe("Sponsor Flow", () => {
  test("sponsor page shows child selection heading", async ({ page }) => {
    await page.goto("/sponsor");
    await expect(page.getByRole("heading", { name: /choose a child to sponsor/i })).toBeVisible();
  });

  test("navigates from home to sponsor selection page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /sponsor/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/sponsor$/);
    await expect(page.getByRole("heading", { name: /choose a child to sponsor/i })).toBeVisible();
  });

  test("checkout page shows fund a pod heading when learner exists", async ({ page }) => {
    await page.route("**/api/learner/ready-to-sponsor*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "550e8400-e29b-41d4-a716-446655440010",
              name: "Asha Kumar",
              standard: "8",
              image_url: null,
              created_at: "2024-01-01T00:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            limit: 12,
            total_count: 1,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false,
          },
        }),
      });
    });

    await page.route("**/api/learner/550e8400-e29b-41d4-a716-446655440010", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "550e8400-e29b-41d4-a716-446655440010",
            name: "Asha Kumar",
            standard: "8",
            image_url: null,
          },
        }),
      });
    });

    await page.goto("/sponsor");
    await page.getByRole("link", { name: /sponsor asha/i }).click();
    await expect(page).toHaveURL(/\/sponsor\/550e8400-e29b-41d4-a716-446655440010$/);
    await expect(page.getByRole("heading", { name: /fund a pod/i })).toBeVisible();
    await expect(page.getByText(/you're sponsoring/i)).toBeVisible();
    await expect(page.getByText("Asha Kumar")).toBeVisible();
  });

  test("thank-you page loads with order id", async ({ page }) => {
    await page.route("**/api/sponsor/VP_test_order", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            order_id: "VP_test_order",
            status: "PENDING",
            plan: "monthly",
            amount: 400,
            learner: {
              name: "Asha Kumar",
              standard: "8",
            },
          },
        }),
      });
    });

    await page.goto("/sponsor/thank-you?order_id=VP_test_order");
    await expect(page.getByRole("heading", { name: /processing payment/i })).toBeVisible();
    await expect(page.getByText("VP_test_order")).toBeVisible();
  });
});
