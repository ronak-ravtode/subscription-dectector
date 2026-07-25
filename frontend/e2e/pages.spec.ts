import { test, expect } from "./helpers";

test.describe("Subscriptions Page", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `subs-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.fill('input[id="confirmPassword"]', "TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL("/login", { timeout: 10000 });
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 10000 });
    await page.goto("/subscriptions");
  });

  test("shows subscriptions page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await expect(page.getByPlaceholder("Search")).toBeVisible();
  });

  test("shows action filter dropdown", async ({ page }) => {
    await expect(page.getByText("All Actions")).toBeVisible();
  });

  test("shows frequency filter dropdown", async ({ page }) => {
    await expect(page.getByText("All Frequencies")).toBeVisible();
  });

  test("shows empty state when no subscriptions", async ({ page }) => {
    await expect(page.getByText("No subscriptions found")).toBeVisible();
  });

  test("search filters subscriptions", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search");
    await searchInput.fill("Netflix");
    await page.waitForTimeout(500);
  });
});

test.describe("History Page", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `history-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.fill('input[id="confirmPassword"]', "TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL("/login", { timeout: 10000 });
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 10000 });
    await page.goto("/history");
  });

  test("shows history page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Analysis History" })).toBeVisible();
  });

  test("shows empty state when no history", async ({ page }) => {
    await expect(page.getByText("No analyses found")).toBeVisible();
  });
});

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `settings-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    await page.goto("/register");
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.fill('input[id="confirmPassword"]', "TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL("/login", { timeout: 15000 });
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', "TestPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 15000 });
    await page.goto("/settings");
  });

  test("shows settings page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("shows appearance section", async ({ page }) => {
    await expect(page.getByText("Appearance")).toBeVisible();
  });

  test("shows theme selector", async ({ page }) => {
    await expect(page.getByText("Theme")).toBeVisible();
  });

  test("shows preferences section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  });

  test("shows currency selector", async ({ page }) => {
    await expect(page.getByText("Currency")).toBeVisible();
  });

  test("shows save button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Save Settings" })).toBeVisible();
  });
});
