import { test, expect } from "@playwright/test";

test("core flow: login → create account → create opportunity → advance → comment", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);

  // Create account
  await page.goto("/accounts");
  await page.fill('input[name="name"]', "E2E Account");
  await page.click('button:has-text("Save account")');
  await expect(page.locator("h1")).toContainText("E2E Account");

  // Create opportunity
  await page.goto("/opportunities/new");
  await page.selectOption('select[name="accountId"]', { label: "E2E Account" });
  await page.fill('input[name="title"]', "E2E Opportunity");
  await page.selectOption('select[name="ownerId"]', { index: 1 });
  await page.fill('input[name="revenue"]', "100000");
  await page.fill('input[name="marginPct"]', "30");
  await page.click('button:has-text("Create opportunity")');
  await expect(page.locator("h1")).toContainText("E2E Opportunity");

  // Advance
  await page.click('button:has-text("Advance")');
  // Use exact text so this matches the "Sales" stepper label and not the
  // "Saleswind" logo in the nav (which a substring "Sales" match would hit).
  await expect(page.getByText("Sales", { exact: true })).toBeVisible();

  // Comment
  await page.fill('input[name="body"]', "First comment");
  await page.click('button:has-text("Post")');
  await expect(page.locator("text=First comment")).toBeVisible();
});
