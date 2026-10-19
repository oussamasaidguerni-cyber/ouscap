import { db, TABLES, type ExportBundle } from "./db";
import { decryptJson, encryptJson, isEncryptedEnvelope } from "./crypto";

export const SCHEMA_VERSION = 1;

/** Serialize the entire database into a portable bundle (plaintext). */
export async function buildExportBundle(): Promise<ExportBundle> {
  const data = {} as ExportBundle["data"];
  for (const table of TABLES) {
    data[table] = await (db[table] as { toArray: () => Promise<unknown[]> }).toArray();
  }
  return {
    app: "ouscap",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function exportToFile(opts: {
  passphrase?: string;
  filename?: string;
}): Promise<string> {
  const bundle = await buildExportBundle();
  const json = JSON.stringify(bundle, null, 2);
  const name = opts.filename ?? `ouscap-backup-${new Date().toISOString().slice(0, 10)}`;

  let contents = json;
  let extension = "json";
  if (opts.passphrase) {
    const envelope = await encryptJson(json, opts.passphrase, SCHEMA_VERSION);
    contents = JSON.stringify(envelope, null, 2);
    extension = "ouscap.enc.json";
  }

  triggerDownload(contents, `${name}.${extension}`, "application/json");
  return `${name}.${extension}`;
}

function triggerDownload(contents: string, filename: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  accounts: number;
  transactions: number;
  categories: number;
  goals: number;
  budgets: number;
}

/**
 * Validate + restore a bundle. Parsing and shape validation happen BEFORE any
 * write, and the whole restore runs inside a single transaction, so an invalid
 * backup cannot partially destroy existing records.
 */
export async function restoreFromText(
  text: string,
  passphrase?: string,
): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON");
  }

  let bundle: ExportBundle;
  if (isEncryptedEnvelope(parsed)) {
    if (!passphrase) throw new Error("This backup is encrypted — enter its passphrase");
    const plaintext = await decryptJson(parsed, passphrase);
    bundle = JSON.parse(plaintext) as ExportBundle;
  } else {
    bundle = parsed as ExportBundle;
  }

  validateBundle(bundle);

  // Count first for the result summary; write atomically afterwards.
  const counts = countBundle(bundle);

  await db.transaction(
    "rw",
    TABLES.map((t) => db[t]) as never,
    async () => {
      for (const table of TABLES) {
        await (db[table] as { clear: () => Promise<void> }).clear();
        const rows = bundle.data[table];
        if (Array.isArray(rows) && rows.length > 0) {
          await (db[table] as { bulkAdd: (r: unknown[]) => Promise<unknown> }).bulkAdd(rows);
        }
      }
    },
  );

  return counts;
}

function countBundle(bundle: ExportBundle): RestoreResult {
  const len = (t: string) => (Array.isArray(bundle.data[t as keyof typeof bundle.data]) ? (bundle.data[t as keyof typeof bundle.data] as unknown[]).length : 0);
  return {
    accounts: len("accounts"),
    transactions: len("transactions"),
    categories: len("categories"),
    goals: len("goals"),
    budgets: len("budgets"),
  };
}

function validateBundle(bundle: unknown): asserts bundle is ExportBundle {
  if (typeof bundle !== "object" || bundle === null) {
    throw new Error("Backup file is empty or malformed");
  }
  const b = bundle as Partial<ExportBundle>;
  if (b.app !== "ouscap") throw new Error("This is not an OUSCAP backup");
  if (typeof b.schemaVersion !== "number") throw new Error("Backup is missing a schema version");
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new Error("This backup was made by a newer version of OUSCAP");
  }
  if (typeof b.data !== "object" || b.data === null) {
    throw new Error("Backup contains no data section");
  }
  for (const table of TABLES) {
    const rows = (b.data as Record<string, unknown>)[table];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`Backup table "${table}" is not an array`);
    }
  }
  // Spot-check referential integrity of transactions.
  const tx = (b.data as Record<string, unknown[]>).transactions ?? [];
  for (const t of tx) {
    const row = t as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.amount !== "number" || !Number.isInteger(row.amount)) {
      throw new Error("Backup contains an invalid transaction record");
    }
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      throw new Error("Backup contains a transaction with an invalid date");
    }
  }
}

/** Danger: removes every record from the device. Always confirm in the UI. */
export async function wipeAllData(): Promise<void> {
  await db.transaction(
    "rw",
    TABLES.map((t) => db[t]) as never,
    async () => {
      for (const table of TABLES) {
        await (db[table] as { clear: () => Promise<void> }).clear();
      }
    },
  );
}
