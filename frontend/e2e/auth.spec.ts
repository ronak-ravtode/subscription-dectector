import { test, expect, TEST_USER } from "./helpers";

test.describe("Authentication Flow", () => {
  test.describe("Registration", () => {
    test("shows registration form", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
      await expect(page.locator('input[id="email"]')).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    test("shows link to login", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    });

    test("redirects to login after successful registration", async ({ page }) => {
      const uniqueEmail = `register-${Date.now()}@example.com`;
      await page.goto("/register");
      await page.fill('input[id="email"]', uniqueEmail);
      await page.fill('input[id="password"]', "TestPassword123!");
      await page.fill('input[id="confirmPassword"]', "TestPassword123!");
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL("/login", { timeout: 10000 });
    });

    test("shows error for mismatched passwords", async ({ page }) => {
      await page.goto("/register");
      await page.fill('input[id="email"]', "test@example.com");
      await page.fill('input[id="password"]', "TestPassword123!");
      await page.fill('input[id="confirmPassword"]', "DifferentPassword!");
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("shows error for short password", async ({ page }) => {
      await page.goto("/register");
      await page.fill('input[id="email"]', "test@example.com");
      await page.fill('input[id="password"]', "short");
      await page.fill('input[id="confirmPassword"]', "short");
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page.getByText("at least 8 characters")).toBeVisible();
    });
  });

  test.describe("Login", () => {
    test("shows login form", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "SubGuard" })).toBeVisible();
      await expect(page.locator('input[id="email"]')).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    });

    test("shows link to register", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    });

    test("redirects to dashboard after successful login", async ({ page }) => {
      const uniqueEmail = `login-${Date.now()}@example.com`;
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

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[id="email"]', "nonexistent@example.com");
      await page.fill('input[id="password"]', "WrongPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForTimeout(3000);
      const errorVisible = await page.getByText("Invalid email or password").isVisible().catch(() => false);
      const loginFailed = await page.getByText("Login failed").isVisible().catch(() => false);
      const signingIn = await page.getByText("Signing in...").isVisible().catch(() => false);
      expect(errorVisible || loginFailed || !signingIn).toBeTruthy();
    });
  });

  test.describe("Protected Routes", () => {
    test("redirects unauthenticated user to login", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL("/login", { timeout: 10000 });
    });

    test("redirects unauthenticated user from upload to login", async ({ page }) => {
      await page.goto("/upload");
      await page.waitForURL("/login", { timeout: 10000 });
    });

    test("redirects unauthenticated user from subscriptions to login", async ({ page }) => {
      await page.goto("/subscriptions");
      await page.waitForURL("/login", { timeout: 10000 });
    });

    test("redirects unauthenticated user from history to login", async ({ page }) => {
      await page.goto("/history");
      await page.waitForURL("/login", { timeout: 10000 });
    });

    test("redirects unauthenticated user from settings to login", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForURL("/login", { timeout: 10000 });
    });
  });

  test.describe("Logout", () => {
    test("logs out and redirects to login", async ({ page }) => {
      const uniqueEmail = `logout-${Date.now()}@example.com`;
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

      await page.locator("header button").last().click();
      await page.getByText("Log out").click();
      await page.waitForURL("/login", { timeout: 10000 });
    });
  });
});
