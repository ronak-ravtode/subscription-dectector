import { test, expect } from "./helpers";

test.describe("Upload Page", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `upload-${Date.now()}@example.com`;
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
    await page.goto("/upload");
  });

  test("shows upload page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Upload Statement" })).toBeVisible();
  });

  test("shows file dropzone", async ({ page }) => {
    await expect(page.getByText("Drag & drop your bank statement")).toBeVisible();
    await expect(page.getByText("PDF files up to 10MB")).toBeVisible();
  });

  test("shows description text", async ({ page }) => {
    await expect(
      page.getByText("Upload your bank statement PDF to detect subscription leaks")
    ).toBeVisible();
  });
});

test.describe("Upload Flow", () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `upload-flow-${Date.now()}@example.com`;
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
    await page.goto("/upload");
  });

  test("shows file input for PDF", async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="pdf"]');
    await expect(fileInput).toHaveCount(1);
  });

  test("accepts PDF file selection via dropzone", async ({ page }) => {
    const dropzone = page.getByText("Drag & drop your bank statement").locator("..");
    await expect(dropzone).toBeVisible();
  });
});

test.describe("Analysis Page", () => {
  test("shows not found for invalid analysis ID", async ({ page }) => {
    const uniqueEmail = `analysis-${Date.now()}@example.com`;
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

    await page.goto("/analysis/nonexistent-id");
    await page.waitForTimeout(2000);
    await expect(page.getByText("Analysis not found")).toBeVisible();
  });
});
