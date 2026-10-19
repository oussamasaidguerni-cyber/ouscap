import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { accountsRepo, categoriesRepo, transactionsRepo } from "@/data/repositories";
import { accountBalance } from "@/domain/accounting";
import { buildExportBundle, restoreFromText } from "@/data/backup";

async function reset() {
  await db.accounts.clear();
  await db.transactions.clear();
  await db.categories.clear();
  await db.budgets.clear();
  await db.goals.clear();
  await db.assets.clear();
  await db.liabilities.clear();
  await db.recurringRules.clear();
  await db.settings.clear();
}

describe("persistence and backup", () => {
  beforeEach(reset);

  // 10. Records persist after a page refresh (IndexedDB survives a reload).
  it("persists accounts and transactions in IndexedDB", async () => {
    const account = await accountsRepo.create({ name: "Cash", type: "cash", openingBalance: 10000 });
    await transactionsRepo.create({
      type: "expense",
      amount: 2500,
      date: "2026-01-10",
      accountId: account.id,
      categoryId: null,
      context: "personal",
    });

    // Simulate a reload by reading fresh from the database.
    const accounts = await db.accounts.toArray();
    const txs = await db.transactions.toArray();
    expect(accounts).toHaveLength(1);
    expect(txs).toHaveLength(1);
    expect(accountBalance(accounts[0], txs)).toBe(7500);
  });

  // 11. Exported data can be restored correctly.
  it("round-trips an export and restore", async () => {
    const account = await accountsRepo.create({ name: "Bank", type: "bank", openingBalance: 50000 });
    await transactionsRepo.create({
      type: "income",
      amount: 20000,
      date: "2026-01-01",
      accountId: account.id,
      categoryId: null,
      context: "freelance",
    });

    const bundle = await buildExportBundle();
    const json = JSON.stringify(bundle);

    // Wipe, then restore.
    await reset();
    expect((await db.accounts.toArray()).length).toBe(0);

    const result = await restoreFromText(json);
    expect(result.accounts).toBe(1);
    expect(result.transactions).toBe(1);
    const restoredAccounts = await db.accounts.toArray();
    const restoredTxs = await db.transactions.toArray();
    expect(accountBalance(restoredAccounts[0], restoredTxs)).toBe(70000);
  });

  // 12. Invalid backups are rejected without destroying existing records.
  it("rejects an invalid backup and preserves existing records", async () => {
    await accountsRepo.create({ name: "Keep me", type: "cash", openingBalance: 1234 });
    const before = await db.accounts.toArray();

    await expect(restoreFromText("{ not json")).rejects.toThrow();
    await expect(restoreFromText(JSON.stringify({ app: "other", schemaVersion: 1, data: {} }))).rejects.toThrow();
    await expect(
      restoreFromText(JSON.stringify({ app: "ouscap", schemaVersion: 1, data: { transactions: "not-array" } })),
    ).rejects.toThrow();

    const after = await db.accounts.toArray();
    expect(after).toEqual(before);
    expect(after[0].name).toBe("Keep me");
  });

  it("rejects a backup from a newer schema version", async () => {
    await expect(
      restoreFromText(JSON.stringify({ app: "ouscap", schemaVersion: 999, data: {} })),
    ).rejects.toThrow(/newer version/);
  });

  it("rejects a transaction with an invalid date inside an otherwise valid bundle", async () => {
    const bad = {
      app: "ouscap",
      schemaVersion: 1,
      exportedAt: "2026-01-01",
      data: {
        transactions: [{ id: "t", amount: 100, date: "not-a-date" }],
      },
    };
    await expect(restoreFromText(JSON.stringify(bad))).rejects.toThrow();
  });

  it("archives (never deletes) an account that has transactions", async () => {
    const account = await accountsRepo.create({ name: "HasHistory", type: "cash", openingBalance: 0 });
    await transactionsRepo.create({
      type: "expense",
      amount: 100,
      date: "2026-01-01",
      accountId: account.id,
      categoryId: null,
      context: "personal",
    });
    const result = await accountsRepo.remove(account.id);
    expect(result.archived).toBe(true);
    expect(await db.accounts.get(account.id)).toBeTruthy();
  });

  it("preserves transaction history when a category is deleted", async () => {
    const category = await categoriesRepo.create({ name: "Temp", kind: "expense", context: "personal" });
    const account = await accountsRepo.create({ name: "Cash", type: "cash", openingBalance: 0 });
    const tx = await transactionsRepo.create({
      type: "expense",
      amount: 500,
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      context: "personal",
    });
    await categoriesRepo.remove(category.id);
    const after = await db.transactions.get(tx.id);
    expect(after).toBeTruthy();
    expect(after!.categoryId).toBeNull();
  });
});
