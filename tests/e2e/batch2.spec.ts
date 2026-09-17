import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);
}

test("opportunities table: pagination footer, inline edit, exports", async ({ page }) => {
  await login(page);

  // Pager with page-size links; choosing a size keeps sort and resets to page 1
  const pager = page.getByRole("navigation", { name: "Pagination" });
  await expect(pager).toContainText(/of \d+/);
  await page.click('th a:has-text("PR")');
  await expect(page).toHaveURL(/sort=revenue/);
  await pager.getByRole("link", { name: "50" }).click();
  await expect(page).toHaveURL(/size=50/);
  await expect(page).toHaveURL(/sort=revenue/);
  await expect(page).toHaveURL(/page=1/);

  // Inline edit of MR: invalid value shows an error and stays on the list; valid value saves
  const row = page.locator("tbody tr").first();
  await row.getByTitle("Edit MR").click();
  const input = row.getByLabel("MR");
  await input.fill("150");
  await input.press("Enter");
  await expect(row.getByRole("alert")).toHaveText("Must be 0–100");
  await input.fill("25");
  await input.press("Enter");
  await expect(row.getByTitle("Edit MR")).toContainText("25%");
  await expect(page).toHaveURL(/\/opportunities\?/);

  // Export links download files
  const [xlsx] = await Promise.all([page.waitForEvent("download"), page.click('a:has-text("Excel")')]);
  expect(xlsx.suggestedFilename()).toMatch(/^opportunities-.*\.xlsx$/);
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.click('a:has-text("PDF")')]);
  expect(pdf.suggestedFilename()).toMatch(/^opportunities-.*\.pdf$/);
});

test("comment mentions autocomplete and render as mention chips", async ({ page }) => {
  await login(page);
  await page.locator("tbody tr").first().locator("td").nth(2).click();
  await expect(page).toHaveURL(/\/opportunities\/[a-z0-9]+/);

  const box = page.locator('textarea[name="body"]');
  const text = `E2E mention ${Date.now()}`;
  await box.fill("");
  await box.pressSequentially(`${text} @ma`);
  const option = page.getByRole("listbox", { name: "Mention a user" }).getByRole("option").first();
  // Option text is avatar initial + name; the name is the last line.
  const name = (await option.innerText()).trim().split("\n").pop()!.trim();
  await box.press("Enter");
  await expect(box).toHaveValue(`${text} @${name} `);
  await page.click('button:has-text("Post")');
  const comment = page.locator("p", { hasText: text });
  await expect(comment.locator("span", { hasText: `@${name}` })).toBeVisible();
});

test("new pages: tasks quick add, vendors directory, instructions", async ({ page }) => {
  await login(page);

  await page.goto("/tasks");
  const title = `E2E task ${Date.now()}`;
  await page.fill('input[name="title"]', title);
  await page.click('button:has-text("Add")');
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("checkbox", { name: `Complete "${title}"` }).check();
  // Completed tasks drop off the open list once the server confirms.
  await expect(page.getByText(title)).toHaveCount(0);
  await page.goto("/tasks?show=done");
  await expect(page.getByText(title)).toBeVisible();

  await page.goto("/vendors");
  await page.click('button:has-text("New vendor")');
  const vendor = `E2E Vendor ${Date.now()}`;
  await page.fill('input[name="name"]', vendor);
  await page.click('button:has-text("Save vendor")');
  await expect(page.locator("h1")).toHaveText(vendor);
  await expect(page.getByText(/VEN-\d{4}/)).toBeVisible();

  await page.goto("/instructions");
  await expect(page.locator("h1").first()).toHaveText("Instructions");
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
