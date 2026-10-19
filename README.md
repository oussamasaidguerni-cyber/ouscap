# OUSCAP

**Your money. In perspective.**

A private, local-first personal financial command center. Track spending, income,
transfers, accounts, assets, liabilities, budgets, and goals — entirely on your
device. No backend, no account, no cloud, no analytics, no external AI.

Primary currency: **Algerian dinar (DZD)**, stored as integer whole-dinar amounts.

---

## The brand

OUSCAP uses a custom geometric **O/C monogram** with an integrated
upward-moving line:

- The ring is the **O** of OUSCAP; its right side opens into a **C** aperture.
- A single rising diagonal bridges the aperture — the growth line.
- A terminal tick caps the line so the mark stays crisp at 16px.

The same geometry (defined once in `src/brand/Monogram.tsx` and reused by every
SVG asset) drives the sidebar, loading state, settings, lockup, app icon, and
favicon. Palette is strict monochrome: ink `#0B0B0B`, surface `#171717`, borders
`#292929`, secondary gray `#A3A3A3`, white `#FFFFFF`. Dark mode is the signature
experience; light mode is fully supported.

Deliverables live in `src/brand/` (component usage) and `public/` (files):

| Asset | Where |
| --- | --- |
| Primary monogram | `src/brand/Monogram.tsx`, `public/logo.svg` |
| Horizontal lockup + wordmark | `src/brand/Wordmark.tsx`, `brandAssets.lockup` |
| Dark-background version | `public/logo-light.svg` |
| Light-background version | `public/logo.svg` |
| Compact app icon | `public/icons/icon-192.png`, `icon-512.png` |
| Maskable icon | `public/icons/maskable-512.png` |
| Favicon | `public/favicon.svg` |

---

## Getting started

```bash
npm install
npm run dev        # development server (http://localhost:5174)
npm run build      # typecheck + production build (PWA shell + service worker)
npm run preview    # serve the production build
npm test           # unit + domain tests (Vitest)
npm run test:e2e   # end-to-end smoke tests (Playwright, runs the built app)
npm run lint       # oxlint, zero warnings
npm run typecheck  # tsc -b
npm run ci         # full gate: typecheck → lint → unit → build → e2e
```

Requires Node 20+.

---

## Feature summary

- **Overview** — net worth (assets − liabilities), income, expenses, net cash
  flow, budget utilization, goal progress, spending-by-category, income-vs-expense
  trend, recent transactions, upcoming recurring items. Period filters: this
  month, last month, last 90 days, custom range. Every metric reacts to the period.
- **Transactions** — income, expenses, transfers, and explicit balance
  adjustments. Full search, sorting, and filtering by date, category, account,
  type, and financial context (Personal / Freelance / Startup). Create, edit,
  delete with confirmation.
- **Recurring rules** — weekly, monthly, and annual schedules. Next expected
  occurrence is shown; occurrences are recorded only when you confirm them, with
  idempotency keys preventing duplicates and a cap preventing runaway backlogs.
- **Accounts & net worth** — cash, bank, savings, and other accounts with
  opening balances and full transaction history; additional assets and
  liabilities. Accounts with history are archived rather than deleted.
- **Budgets** — monthly category limits with spent, remaining, utilization, and a
  configurable warning threshold. Only qualifying expenses count; transfers never
  inflate spending.
- **Goals** — targets with explicit, manually-recorded contributions, status, and
  a required-monthly figure when a deadline exists. A transfer is never assumed to
  fund a goal.
- **Insights** — spending by category and context, month-over-month comparison,
  savings rate, average daily expense, budget warnings, and a clearly-labelled
  month-end cash-flow **estimate** with its assumption stated.
- **Settings** — theme, date format, month-start day, category management,
  storage information, export/restore, and a guarded data-wipe.
- **PWA** — installable, offline app shell, monochrome icons. The service worker
  **never** caches financial records; they live only in IndexedDB.

### Accounting rules (enforced in `src/domain/accounting.ts`)

- Net worth = tracked assets − tracked liabilities, with an optional exclusion set
  to avoid double counting money that is both an account and a recorded asset.
- Net cash flow = qualifying income − qualifying expenses.
- Transfers move money between owned accounts and are **never** income or expense.
- Balance adjustments are explicit, typed, and never counted as spending.
- Budgets and category analytics count only qualifying expenses.
- Goal contributions are explicit and never duplicate account balances.

---

## Project structure

```
ouscap/
  src/
    brand/            Monogram, Wordmark, SVG assets (shared geometry)
    domain/           types, money, accounting engine, zod schemas
    data/             Dexie db, repositories, seed, backup, crypto, recurring
    store/            FinanceProvider, SettingsProvider, PeriodProvider
    components/       layout (Nav, AppShell, PageHeader), ui primitives,
                      charts, TransactionForm, RecurringRules, TxRow
    pages/            Overview, Transactions, Accounts, Budgets, Goals,
                      Insights, Settings
    lib/              cn, dates
    styles/           design tokens + global css
  tests/              accounting, money, validation, persistence, crypto,
                      recurring. app (empty states + mobile), pwa (build contract),
                      e2e.smoke (Playwright)
  public/             icons, favicon, logo svgs, _headers (CSP)
```

Financial calculations never live inside presentation components — pages call the
pure domain functions and the live `FinanceProvider` derives shared values.

---

## Storage & backup

- All data is stored locally in **IndexedDB** (Dexie, versioned schema at
  `src/data/db.ts`). OUSCAP requests persistent storage where the browser allows it.
- **Export** (Settings → Backup): plain JSON, or an **encrypted** backup using
  WebCrypto **AES-GCM** with a **PBKDF2-SHA256**-derived key (310 000 iterations).
  No custom cryptography; the passphrase is never stored and is required to restore
  an encrypted backup.
- **Restore** validates the bundle — including transaction shape and referential
  checks — **before** writing anything, and writes inside a single transaction, so
  an invalid file cannot damage existing records.
- **Reset**: Settings → Danger zone wipes everything, behind an explicit confirmation.

> Browser storage is **not** automatically encrypted and can be lost if browser
> data is cleared or a device fails. A client-side app cannot strongly protect data
> from someone who already controls the device or browser profile. Export regular
> backups — especially before clearing browser data or switching devices.

---

## Privacy

No advertising trackers, no analytics, no third-party financial APIs, no
unrequested data collection, no external AI processing, no embedded API secrets,
no backend. Deployment should be over HTTPS with the CSP and security headers in
`public/_headers`.

---

## Known limitations

- Net-worth history is collected **prospectively** only (`netWorthSnapshots`);
  OUSCAP never fabricates past data.
- Single currency (DZD) in this version; no bank connections.
- Recurring rules require manual confirmation to record — notifications are not
  implemented because browsers cannot reliably deliver them without a backend.
- Category deletion preserves transactions (they become Uncategorized) and removes
  any budget bound to that category.
- Notifications, iOS background behavior, and multi-device sync are out of scope.
