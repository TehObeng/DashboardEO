# DashboardEO — Codex Agent Instructions

## Project overview
Single-page React + Vite app (TypeScript-flavoured JSX, no strict types enforced).
Event organiser dashboard: clients, events, quotes, invoices, purchases (PO), workers, finance, reports.
Backend: Express + better-sqlite3 (`server.js`). State stored as a single JSON blob via `GET/PUT /api/state`.

## File map
```
src/
  App.tsx                  — all UI except tabs below; modals live here
  dashboardeo-core.ts      — all pure helpers, constants, seed data, DEFAULT_STATE
  tabs/
    PurchasesTab.tsx       — Purchases tab (PO list, add PO, payment ledger, audit)
    FinanceTab.tsx
    ReportsTab.tsx
    SettingsTab.tsx
  components/
    AuditLogPanel.tsx
  documents.tsx            — print/PDF components
```

## Tech stack
- React 18, no Redux — state is plain `useState` lifted to `App`
- Tailwind CSS (utility-first, no custom CSS files)
- Vite build, ESM
- No TypeScript strict mode — treat as JS with JSX

## Commands
```bash
npm run build        # compile — MUST pass before any PR
npm test             # Playwright smoke test (needs server running on :4192)
npm run dev          # dev server on 127.0.0.1:5173
npm start            # production server on :4192
```
**Always run `npm run build` after edits to verify no compile errors.**

## Key utilities in dashboardeo-core.ts (import before using)
| Export | Purpose |
|---|---|
| `inp` | Tailwind class string for all inputs |
| `fc(n, sym)` | Format currency for display |
| `fd(d)` | Format date |
| `ymd()` | Today as YYYY-MM-DD |
| `sc(status)` | Tailwind badge classes by status string |
| `formatMoneyInput(v)` | Number → locale string with thousand separators (id-ID) |
| `parseMoneyInput(v)` | Locale string → raw number (strips commas/periods) |
| `docNo(type, date, rows)` | Generate sequential PO/invoice number |
| `quoteSequencePreview(date, quotes, id)` | Preview sequential quote number |
| `renumberQuotesByMonth(quotes)` | Re-sequence all quotes by month |
| `normalizePurchase(p, list)` | Ensure PO has poNumber, items[], payments[] |
| `normalizeDashboardState(state)` | Normalize full state on load/save |
| `purchaseTotal/Paid/Debt/Status` | PO financial helpers |
| `poItems(p)` | Items array for a PO (filters voided) |
| `purchasePayments(p)` | Payments array for a PO |
| `isEventLocked(ev)` | True if event status is Done/Closed/Finished |

## Money input pattern — ALWAYS use this for currency fields
```jsx
// Display: formatted with thousand separators
// Store: raw number via parseMoneyInput
<input
  type="text"
  inputMode="numeric"
  value={formatMoneyInput(f.someField || 0)}
  onChange={e => setF(p => ({ ...p, someField: parseMoneyInput(e.target.value) }))}
  className={inp}
/>
```
Never use `type="number"` for money/currency fields. Keep `type="number"` only for counts (qty).

## Quote numbering — ALWAYS use sequential numbering
```jsx
// In QuoteModal — initial number:
const nextNum = quoteSequencePreview(today, quotes, null);
// QuoteModal must receive quotes as a prop
// On generatedDate change, recalculate number unless user manually edited it
```
Never generate quote numbers with `Math.random()`.

## PO void pattern
- Voiding a PO: set `status: "Voided"` on the purchase object + `voidedAt` + `voidReason`
- Voiding a PO item: set `voided: true` on the item object inside `po.items`
- `poItems(p)` already filters out voided items, so totals update automatically
- Voided POs should appear muted (opacity-50) and be excluded from summary totals
- Always call `addAudit(action, "purchase", po.poNumber, note)` after void operations

## State management rules
- All state lives in `App.tsx` and is passed as props
- Never add new top-level state without updating `normalizeDashboardState` in core
- Save payload uses `normalizeDashboardState({...all state slices})`
- After hydration (`hydrated=true`), every state change auto-saves via the 350ms debounce effect

## Coding conventions
- No comments unless the WHY is non-obvious
- No new files unless strictly required — prefer editing existing files
- No TypeScript type annotations needed — plain JS patterns are fine
- Tailwind only — no inline `style={{}}` unless for dynamic values
- Event handlers: use arrow functions inline or named handlers above JSX
- All modals rendered at App root level (bottom of JSX tree), not inside tab components
- `Modal` / `SimpleModal` components already exist — reuse them
- `addAudit(action, entityType, entityLabel, note)` must be called for every mutation

## Common pitfalls to avoid
1. **Importing from wrong path** — always import helpers from `../dashboardeo-core` (from tabs) or `./dashboardeo-core` (from App.tsx)
2. **Forgetting `normalizePurchase`** — always wrap raw purchase data before computing totals
3. **Mutating state directly** — always spread: `setPurchases(list => list.map(...))`
4. **Missing `hydrated` guard** — the save effect must check `if (!hydrated) return`
5. **type="number" for money** — use the money input pattern above instead
6. **Random quote numbers** — use `quoteSequencePreview` / `renumberQuotesByMonth`
7. **Not running build** — always verify `npm run build` passes before marking done

## Expand/collapse pattern (PurchasesTab)
```jsx
// Clicking the info area of a card should toggle expand, same as the Details button
<div
  className="grid ... cursor-pointer"
  onClick={() => setExpandedPO(open ? null : p.id)}
  role="button"
  tabIndex={0}
  onKeyDown={e => e.key === "Enter" && setExpandedPO(open ? null : p.id)}
>
  {/* PO info content */}
</div>
// Action buttons (Payment, Print, Void) must stopPropagation to avoid toggling expand
<button onClick={e => { e.stopPropagation(); openPayment(p); }}>Payment</button>
```

## Testing checklist after any change
1. `npm run build` — zero errors
2. Open app, navigate to affected tab, verify UI looks correct
3. If PurchasesTab changed: add a PO, add a payment, void a payment, expand details
4. If QuoteModal changed: create a new quote, verify number is sequential not random
5. If money input changed: type a number, verify it shows with thousand separators on blur
