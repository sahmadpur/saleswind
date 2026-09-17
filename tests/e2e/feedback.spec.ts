import { test, expect } from "@playwright/test";

test("pipeline feedback batch: sorting, filters, row click, menu toggle, account notes", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);

  // Flat table: no Created column, no month group rows
  await expect(page.locator("th", { hasText: "Accountable" })).toBeVisible();
  await expect(page.locator("th", { hasText: "Created" })).toHaveCount(0);
  await expect(page.getByText(/predicted revenue ·/)).toHaveCount(0);

  // Sorting via column header: URL params set
  await page.click('th a:has-text("PR")');
  await expect(page).toHaveURL(/sort=revenue/);
  await expect(page).toHaveURL(/dir=desc/);

  // Filtering by stage: URL param set, every row shows that stage, sort survives, Clear resets
  await page.getByLabel("Stage").selectOption("SALES");
  await expect(page).toHaveURL(/stage=SALES/);
  await expect(page).toHaveURL(/sort=revenue/);
  const pills = page.locator("tbody tr td:nth-child(4)");
  await expect(pills.first()).toBeVisible();
  for (const t of await pills.allInnerTexts()) expect(t.trim()).toBe("Sales");
  await page.click('button:has-text("Clear")');
  await expect(page).not.toHaveURL(/stage=/);

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
