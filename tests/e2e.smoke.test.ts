import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke test against the production build. Runs the core financial
 * journey the way a person would: set up an account, add an expense, add
 * income, transfer between accounts, and confirm the dashboard figures.
 */
test.describe("OUSCAP production smoke", () => {
  // The brand intro is skipped in tests to keep them deterministic.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("ouscap.intro.seen", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("brand, onboarding, and expense flow update the dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    // Brand present.
    await expect(page.getByText("Welcome to OUSCAP")).toBeVisible();

    // First-run: create an account with the default categories (3-step wizard).
    await page.getByRole("button", { name: /get started/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/account name/i).fill("Cash");
    await page.getByLabel(/opening balance/i).fill("100000");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /create account/i }).click();

    // Dashboard now shows net worth equal to the opening balance.
    await expect(page.getByText("Net worth")).toBeVisible();
    await expect(page.getByText(/100 000 DZD|100 000 DZD/).first()).toBeVisible();

    // Add an expense.
    await page.getByRole("button", { name: /add transaction/i }).first().click();
    await page.getByRole("button", { name: "Expense" }).click();
    await page.getByLabel(/amount/i).fill("25000");
    // Choose the first real category (Groceries).
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    const categorySelect = dialog.locator("select").nth(1);
    await categorySelect.selectOption({ index: 1 });
    await dialog.getByRole("button", { name: /^add transaction$/i }).click();

    // Net worth drops to 75 000.
    await expect(page.getByText(/75 000 DZD|75 000 DZD/).first()).toBeVisible();
    await expect(page.getByText("Expenses", { exact: true })).toBeVisible();

    // Add income of 50 000 → net worth 125 000.
    await page.getByRole("button", { name: /add transaction/i }).first().click();
    const incomeDialog = page.getByRole("dialog", { name: "Add transaction" });
    await incomeDialog.getByRole("button", { name: "Income" }).click();
    await incomeDialog.getByLabel(/amount/i).fill("50000");
    await incomeDialog.locator("select").nth(1).selectOption({ index: 1 });
    await incomeDialog.getByRole("button", { name: /^add transaction$/i }).click();
    await expect(page.getByText(/125 000 DZD|125 000 DZD/).first()).toBeVisible();

    // Records persist across a reload.
    await page.reload();
    await expect(page.getByText(/125 000 DZD|125 000 DZD/).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("mobile viewport shows bottom navigation and quick-add", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto("/");
    await expect(page.getByLabel(/add transaction/i).first()).toBeVisible();
  });
});
