import { test as base, expect, Page } from "@playwright/test";

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
};

async function registerUser(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.fill('input[id="confirmPassword"]', password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("/login", { timeout: 10000 });
}

async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 10000 });
}

type TestFixtures = {
  testUser: { email: string; password: string };
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },
  authenticatedPage: async ({ page, testUser }, use) => {
    await registerUser(page, testUser.email, testUser.password);
    await loginUser(page, testUser.email, testUser.password);
    await expect(page).toHaveURL("/");
    await use(page);
  },
});

export { expect, registerUser, loginUser, TEST_USER };
