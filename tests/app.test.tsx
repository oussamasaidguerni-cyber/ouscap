import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "@/App";
import { db } from "@/data/db";

async function reset() {
  await Promise.all([
    db.accounts.clear(),
    db.transactions.clear(),
    db.categories.clear(),
    db.budgets.clear(),
    db.goals.clear(),
    db.assets.clear(),
    db.liabilities.clear(),
    db.recurringRules.clear(),
    db.settings.clear(),
  ]);
}

describe("empty states and layout", () => {
  beforeEach(reset);

  // 13. Empty states work without fake financial records.
  it("shows a first-run empty state and creates no fake data", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome to OUSCAP/i)).toBeInTheDocument();
    });
    // Nothing was written to the database by simply rendering.
    expect(await db.transactions.count()).toBe(0);
    expect(await db.accounts.count()).toBe(0);
    expect(await db.categories.count()).toBe(0);
  });

  // 14. Mobile layouts remain usable at iPhone-sized widths.
  it("renders navigation and a quick-add action at 390px width", async () => {
    window.history.pushState({}, "", "/#/");
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    render(<App />);

    // Branding present.
    await waitFor(() => expect(screen.getAllByText("OUSCAP").length).toBeGreaterThan(0));
    // Quick-add controls are present (header + bottom nav + sidebar).
    expect(screen.getAllByLabelText(/Add transaction/i).length).toBeGreaterThan(0);
  });
});
