import { test, expect } from "@playwright/test";

test("pipeline feedback batch: month groups, sorting, row click, menu toggle, account notes", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);

  // Default table groups by created month, with per-month predicted totals
  await expect(page.getByText(/predicted revenue ·/).first()).toBeVisible();
  await expect(page.locator("th", { hasText: "Accountable" })).toBeVisible();

  // Sorting via column header: URL params set, month sections collapse into a flat table
  await page.click('th a:has-text("Predicted revenue")');
  await expect(page).toHaveURL(/sort=revenue/);
  await expect(page).toHaveURL(/dir=desc/);
  await expect(page.getByText(/predicted revenue ·/)).toHaveCount(0);

  // Clicking anywhere on a row (not just the title link) opens the detail page
  await page.locator("tbody tr").first().locator("td").nth(2).click();
  await expect(page).toHaveURL(/\/opportunities\/[a-z0-9]+/);

  // Menu button collapses/expands the sidebar
  const sidebar = page.locator("aside");
  await expect(sidebar).toHaveCount(1);
  await page.click('button[aria-label="Toggle navigation"]');
  await expect(sidebar).toHaveCount(0);
  await page.click('button[aria-label="Toggle navigation"]');
  await expect(sidebar).toHaveCount(1);

  // Account detail has an editable Notes section that persists
  await page.goto("/accounts");
  await page.locator("tbody tr").first().locator("td").nth(2).click();
  await expect(page).toHaveURL(/\/accounts\/[a-z0-9]+/);
  const note = `Visited on-site, met CTO — ${Date.now()}`;
  await page.fill('textarea[name="notes"]', note);
  await page.click('button:has-text("Save notes")');
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.locator('textarea[name="notes"]')).toHaveValue(note);
});

test("create account keeps entered values and shows field errors on failed validation", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);

  await page.goto("/accounts");
  await page.fill('input[name="name"]', "Persistence Test");
  await page.fill('input[name="website"]', "not a valid website at all");
  await page.click('button:has-text("Save account")');

  await expect(page.getByText("Enter a valid website")).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue("Persistence Test");
  await expect(page.locator('input[name="website"]')).toHaveValue("not a valid website at all");
});
