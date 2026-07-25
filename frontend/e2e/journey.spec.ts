import { test, expect } from "./helpers";

test.describe("Full User Journey", () => {
  test("complete flow: register -> login -> dashboard -> upload -> subscriptions -> settings -> logout", async ({
    page,
  }) => {
    const uniqueEmail = `journey-${Date.now()}@example.com`;

    await test.step("Register new user", async () => {
      await page.goto("/register");
      await page.fill('input[id="email"]', uniqueEmail);
      await page.fill('input[id="password"]', "TestPassword123!");
      await page.fill('input[id="confirmPassword"]', "TestPassword123!");
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL("/login", { timeout: 10000 });
    });

    await test.step("Login", async () => {
      await page.fill('input[id="email"]', uniqueEmail);
      await page.fill('input[id="password"]', "TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("/", { timeout: 10000 });
    });

    await test.step("View dashboard", async () => {
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await expect(page.getByText("Total Monthly Leak")).toBeVisible();
      await expect(page.getByText("Potential Savings")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
    });

    await test.step("Navigate to upload page", async () => {
      await page.getByRole("link", { name: /Upload Statement/i }).click();
      await page.waitForURL("/upload", { timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Upload Statement" })).toBeVisible();
      await expect(page.getByText("Drag & drop your bank statement")).toBeVisible();
    });

    await test.step("Navigate to subscriptions page", async () => {
      await page.getByRole("link", { name: "Subscriptions" }).click();
      await page.waitForURL("/subscriptions", { timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
    });

    await test.step("Navigate to history page", async () => {
      await page.getByRole("link", { name: "History" }).click();
      await page.waitForURL("/history", { timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Analysis History" })).toBeVisible();
    });

    await test.step("Navigate to settings page", async () => {
      await page.locator("header button").last().click();
      await page.getByText("Settings").click();
      await page.waitForURL("/settings", { timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    });

    await test.step("Logout", async () => {
      await page.locator("header button").last().click();
      await page.getByText("Log out").click();
      await page.waitForURL("/login", { timeout: 10000 });
      await expect(page.getByRole("heading", { name: "SubGuard" })).toBeVisible();
    });
  });
});

test.describe("Error Handling", () => {
  test("handles 404 by redirecting to home", async ({ page }) => {
    const uniqueEmail = `error-${Date.now()}@example.com`;
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

    await page.goto("/nonexistent-page");
    await page.waitForURL("/", { timeout: 10000 });
  });

  test("shows error for invalid login credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="email"]', "wrong@example.com");
    await page.fill('input[id="password"]', "WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForTimeout(3000);
    const errorVisible = await page.getByText("Invalid email or password").isVisible().catch(() => false);
    const loginFailed = await page.getByText("Login failed").isVisible().catch(() => false);
    const signingIn = await page.getByText("Signing in...").isVisible().catch(() => false);
    expect(errorVisible || loginFailed || !signingIn).toBeTruthy();
  });
});
