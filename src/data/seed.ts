import type { Category } from "@/domain/types";
import { categoriesRepo } from "./repositories";

/** Default category set. Only seeded on explicit first-run initialisation. */
export const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "kind" | "context">> = [
  { name: "Groceries", kind: "expense", context: "personal" },
  { name: "Rent", kind: "expense", context: "personal" },
  { name: "Utilities", kind: "expense", context: "personal" },
  { name: "Transport", kind: "expense", context: "personal" },
  { name: "Health", kind: "expense", context: "personal" },
  { name: "Education", kind: "expense", context: "personal" },
  { name: "Dining", kind: "expense", context: "personal" },
  { name: "Shopping", kind: "expense", context: "personal" },
  { name: "Subscriptions", kind: "expense", context: "personal" },
  { name: "Freelance costs", kind: "expense", context: "freelance" },
  { name: "Startup costs", kind: "expense", context: "startup" },
  { name: "Salary", kind: "income", context: "personal" },
  { name: "Freelance income", kind: "income", context: "freelance" },
  { name: "Startup income", kind: "income", context: "startup" },
  { name: "Allowance", kind: "income", context: "personal" },
];

/**
 * First-run setup. This is the ONLY place that writes starter data, and it is
 * always triggered by the user from the empty state — never silently — so no
 * fake transaction can ever appear in real records.
 */
export async function seedCategories(): Promise<void> {
  const existing = await categoriesRepo.all();
  if (existing.length > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    await categoriesRepo.create(c);
  }
}
