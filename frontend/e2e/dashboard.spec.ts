import { test, expect } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `dash-${Date.now()}@example.com`;
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
  });

  test("shows dashboard title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows summary cards", async ({ page }) => {
    await expect(page.getByText("Total Monthly Leak")).toBeVisible();
    await expect(page.getByText("Potential Savings")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
  });

  test("shows upload button", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Upload Statement/i })).toBeVisible();
  });

  test("navigates to upload page", async ({ page }) => {
    await page.getByRole("link", { name: /Upload Statement/i }).click();
    await page.waitForURL("/upload", { timeout: 10000 });
  });

  test("shows recent analyses section", async ({ page }) => {
    await expect(page.getByText("Recent Analyses")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `nav-${Date.now()}@example.com`;
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
  });

  test("navbar shows SubGuard brand", async ({ page }) => {
    await expect(page.getByRole("link", { name: "SubGuard" })).toBeVisible();
  });

  test("navbar shows Upload link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Upload", exact: true })).toBeVisible();
  });

  test("navbar shows Subscriptions link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Subscriptions" })).toBeVisible();
  });

  test("navbar shows History link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  });

  test("navigates to subscriptions page", async ({ page }) => {
    await page.getByRole("link", { name: "Subscriptions" }).click();
    await page.waitForURL("/subscriptions", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
  });

  test("navigates to history page", async ({ page }) => {
    await page.getByRole("link", { name: "History" }).click();
    await page.waitForURL("/history", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Analysis History" })).toBeVisible();
  });
});
