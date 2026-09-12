# pension-statements endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pension-statements` mock endpoint to the CSSP feature that returns a base64-encoded PDF statement plus a 58-row array of pension payment statement records.

**Architecture:** Follows the exact existing CSSP mock pattern: types in `src/features/cssp/types/`, a per-endpoint variant catalog in `src/features/cssp/api/responses/`, a single registry switchboard in `src/features/cssp/api/registry.ts`, and a thin POST route handler under `src/app/api/cpps/PensionersApp/v1/`. The body is `{ base64, data }` where `base64` is a placeholder encoded PDF and `data` is the full statement array.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, `@feature/cssp/...` import alias, Vitest.

**Spec:** Conversation request (58-row `const mockData` pasted verbatim; endpooint `pension-statements` under CSSP; response has a `base64` section and a `data` array section). The full 58-row array lives in that user message — embedding it is a copy task, not a composition task.

## Global Constraints

- Every exported TypeScript symbol gets a detailed JSDoc block: what it does, how to use it, side effects/edge cases. Match the existing style in `src/features/cssp/types/index.ts` and `.../api/responses/summary.ts`.
- All row fields are **strings** (mirror DRF serialisation), exact values verbatim — do not reformat `net_amt`, dates (`6/24/26`), or `'0'` amounts.
- Filenames: kebab-case (`pension-statements.ts`). Registry keys: snake_case (`pension_statements`).
- Imports use the `@feature/cssp/...` alias (matches existing routes/registry).
- No `console.log`. Conventional Commits (`feat:`, `chore:`).
- HTTP statuses restricted to `200 | 202 | 400 | 403 | 429 | 500` (see `respond.ts` `MockVariant`).
- Do NOT touch or commit the untracked `http/` directory or any files outside the task lists. Current working tree is `master` with only untracked `http/` — no existing local changes to preserve.
- Do not write a new test file — there is no cssp test directory; verification is lint + typecheck + existing Vitest suite staying green.

---

### Task 1: Add `PensionStatementRow` and `PensionStatementsSuccess` types

**Files:**
- Modify: `src/features/cssp/types/index.ts` (append at end, after `SummaryPpoSuccess`, line 136)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `PensionStatementRow` — 17 string fields: `date_frm`, `date_to`, `no_of_months`, `bp`, `dp`, `da`, `ma`, `age_bonus`, `wa`, `dra`, `oth`, `arr_gross`, `gra_gross`, `comm_gross`, `deduction`, `net_amt`, `ddo_bill_date`.
  - `PensionStatementsSuccess` — `{ base64: string; data: PensionStatementRow[] }`.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/pension-statements
```

- [ ] **Step 2: Append the two exported types with JSDoc**

```ts
/** One period-based pension payment statement row from the pension-statements endpoint. */
export interface PensionStatementRow {
  /** Period start, 'Mon-YY' e.g. 'Jul-22'. */
  date_frm: string;
  /** Period end, 'Mon-YY'; always equals date_frm (period-based row). */
  date_to: string;
  /** Number of months covered, '1' normally. */
  no_of_months: string;
  /** Basic pay for the period. */
  bp: string;
  /** Dearness pay. */
  dp: string;
  /** Dearness allowance. */
  da: string;
  /** Medical allowance. */
  ma: string;
  /** Age bonus. */
  age_bonus: string;
  /** Washing allowance. */
  wa: string;
  /** Dearness relief arrears. */
  dra: string;
  /** Other allowances. */
  oth: string;
  /** Arrears gross amount. */
  arr_gross: string;
  /** Gratuity gross amount. */
  gra_gross: string;
  /** Commutation gross amount. */
  comm_gross: string;
  /** Deductions for the period. */
  deduction: string;
  /** Net amount payable. */
  net_amt: string;
  /** DDO bill date, 'd/m/yy' e.g. '6/24/26'. */
  ddo_bill_date: string;
}

/**
 * Success payload of POST PensionersApp/v1/pension-statements.
 * `base64` carries a placeholder base64-encoded PDF; `data` holds the full
 * per-period payment statement array.
 */
export interface PensionStatementsSuccess {
  /** Base64-encoded mock pension statement PDF (placeholder). */
  base64: string;
  /** Period-based payment statement rows (all string-valued). */
  data: PensionStatementRow[];
}
```

- [ ] **Step 3: Verify the types compile**

Run: `npx tsc --noEmit`
Expected: no errors (types aren't referenced yet, so no new output).

### Task 2: Create the response variant catalog

**Files:**
- Create: `src/features/cssp/api/responses/pension-statements.ts`

**Interfaces:**
- Consumes: `MockVariant` from `../respond`, `MsgError` + `PensionStatementsSuccess` from `../../types`.
- Produces: `PENSION_STATEMENTS_VARIANTS` and `PensionStatementsVariantName`.

- [ ] **Step 1: Write the catalog file**

Header, imports, and variant shape (placeholder `base64` value below is a valid minimal PDF):

```ts
import { MockVariant } from "../respond";
import { MsgError, PensionStatementsSuccess } from "../../types";

/**
 * Response shapes of POST PensionersApp/v1/pension-statements (pension
 * statement PDF + per-period payment rows). `base64` is a placeholder PDF;
 * replace freely with any small valid PDF base64.
 */
export const PENSION_STATEMENTS_VARIANTS = {
  /** 200 — full statement: encoded PDF plus all payment rows. */
  success: {
    status: 200,
    body: {
      base64:
        "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCA+PiA+PgplbmRvYmoKNCAwIG9iago8PCAvTGVuZ3RoIDM5ID4+CnN0cmVhbQpCVCAvRjEgMTIgVGYgMjAgNTAgVGQgKFBlbnNpb24pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnRyYWlsZXIKPDwgL1Jvb3QgMSAwIFIgL1NpemUgNiA+Pgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMjcgMDAwMDAgbiAKMDAwMDAwMDMxMiAwMDAwMCBuIAp0cmFpbGVyCjw8IC9Sb290IDEgMCBSIC9TaXplIDYgPj4Kc3RhcnR4cmVmCjM5NAolJUVPRgo=",
      data: [
        // ⬇️ PASTE THE FULL 58-ROW ARRAY VERBATIM HERE. ⬇️
        // Source: the `const mockData` array in the user's request message.
        // Copy every row exactly — all 17 string fields per row, original
        // values, original ordering (Jul-22 → Aug-26). Do not invent rows,
        // trim fields, or "correct" values. Rows include all-zero-amount
        // arrears rows and the gra_gross=887700 gratuity row.
        //
        // Reference first three rows (shape check only):
        { date_frm: 'Jul-22', date_to: 'Jul-22', no_of_months: '1', bp: '26900', dp: '0', da: '6725', ma: '1000', age_bonus: '0', wa: '0', dra: '0', oth: '0', arr_gross: '0', gra_gross: '0', comm_gross: '0', deduction: '0', net_amt: '34625', ddo_bill_date: '8/3/22' },
        { date_frm: 'Nov-22', date_to: 'Nov-22', no_of_months: '1', bp: '0', dp: '0', da: '0', ma: '0', age_bonus: '0', wa: '0', dra: '0', oth: '0', arr_gross: '0', gra_gross: '887700', comm_gross: '0', deduction: '0', net_amt: '887700', ddo_bill_date: '12/6/22' },
        { date_frm: 'Jun-26', date_to: 'Jun-26', no_of_months: '1', bp: '26900', dp: '0', da: '13719', ma: '1000', age_bonus: '0', wa: '0', dra: '0', oth: '0', arr_gross: '0', gra_gross: '0', comm_gross: '0', deduction: '0', net_amt: '41619', ddo_bill_date: '6/24/26' },
      ],
    },
  },
  /** Missing/invalid request → generic outer-handler failure. */
  failure: { status: 400, body: { msg: " (Unable to process)" } },
} satisfies Record<string, MockVariant<PensionStatementsSuccess | MsgError>>;

/** Selectable variant names for pension-statements. */
export type PensionStatementsVariantName = keyof typeof PENSION_STATEMENTS_VARIANTS;
```

Important: replace the comment block + 3 reference rows with the **full 58-row array** from the user message. The final file must contain exactly 58 rows inside `data`. Single quotes, 17 fields, each value a string.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If row count/fields are off, TS catches every missing/mistyped field.

### Task 3: Register the endpoint in the registry switchboard

**Files:**
- Modify: `src/features/cssp/api/registry.ts`

**Interfaces:**
- Consumes: `PENSION_STATEMENTS_VARIANTS` from Task 2.
- Produces: new `pension_statements` key on `EndpointKey` (derived automatically from `ALL_VARIANTS`).

- [ ] **Step 1: Add the import** — after line 9 import, alphabetically next to the other responses:

```ts
import { PENSION_STATEMENTS_VARIANTS } from "./responses/pension-statements";
```

- [ ] **Step 2: Add to `ALL_VARIANTS`** — add after `create_pensioner` line (line 19) to keep grouping:

```ts
  pension_statements: PENSION_STATEMENTS_VARIANTS,
```

- [ ] **Step 3: Add to `CURRENT_VARIANT`** — add matching entry:

```ts
  pension_statements: "success",
```

- [ ] **Step 4: Verify the registry compiles and the switchboard is exhaustive**

Run: `npx tsc --noEmit`
Expected: no errors. The `CurrentVariant` mapped type now requires `pension_statements`; `"success"` satisfies it.

### Task 4: Create the route handler

**Files:**
- Create: `src/app/api/cpps/PensionersApp/v1/pension-statements/route.ts`

**Interfaces:**
- Consumes: `resolveVariant("pension_statements")`, `respondWith`.
- Produces: the HTTP route.

- [ ] **Step 1: Write the route with JSDoc**

```ts
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";

/**
 * Mock of the pension-statements POST endpoint — returns a base64-encoded
 * PDF statement plus the full pension payment statement array from the
 * registry-selected PENSION_STATEMENTS_VARIANTS entry.
 *
 * @returns Registry-selected pension-statements response.
 */
export async function POST() {
  return respondWith(resolveVariant("pension_statements"));
}
```

- [ ] **Step 2: Verify route + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both exit 0. (`lint` = `eslint`; it may warn on unrelated pre-existing files — zero errors in our three new files.)

### Task 5: Full verification + commit

- [ ] **Step 1: Run the full check suite**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: typecheck clean, eslint exits 0, Vitest passes the 4 existing suites (`npm test` = `vitest run`; no cssp tests exist — existing suite must remain green).

- [ ] **Step 2: Smoke-test the endpoint (optional, dev server)**

```bash
npm run dev
curl -s -X POST http://localhost:3000/api/cpps/PensionersApp/v1/pension-statements
```

Expected: JSON with `base64` (starts `JVBERi0xLjQK...`) and `data` containing 58 rows. **Do not leave the dev server running after the check.**

- [ ] **Step 3: Commit**

```bash
git add src/features/cssp/types/index.ts src/features/cssp/api/responses/pension-statements.ts src/features/cssp/api/registry.ts src/app/api/cpps/PensionersApp/v1/pension-statements/route.ts
git commit -m "feat(cssp): add pension-statements mock endpoint"
```

Do NOT `git add` the untracked `http/` directory.

---

## Files to be created/modified

- Create: `src/features/cssp/api/responses/pension-statements.ts`
- Create: `src/app/api/cpps/PensionersApp/v1/pension-statements/route.ts`
- Modify: `src/features/cssp/types/index.ts`
- Modify: `src/features/cssp/api/registry.ts`

## Open decisions for Build agent

1. **Full 58-row array source:** The complete array is the `const mockData` pasted in the user's request message — this plan embeds only 3 reference rows plus a paste-point comment. Task 2's implementer MUST copy all 58 rows verbatim from that message (if the implementing subagent lacks the message, re-supply the array in its dispatch prompt — never guess or fabricate rows).
2. **Top-level keys** `base64` + `data` were chosen per the request ("one section for base64 and another with the mock data array"). If the user actually expected a nested envelope (e.g. `data: { base64, rows: [...] }`), that is a one-field change confined to Task 1/2 — confirm only if a consumer of this mock objects.
3. **Error variant** `failure` mirrors `summary.ts`'s generic outer-handler `400 { msg: " (Unable to process)" }`. If the upstream source reveals a more specific error (e.g. `invalid_username`-style), add it.
4. **base64 placeholder:** the embedded value is a real, minimal base64-encoded PDF. Byte-exactness is not important — swap for any small valid PDF base64 if preferred.
5. **Endpoint key:** route dir uses kebab-case `pension-statements`; registry key is snake_case `pension_statements`, matching existing keys (`get_registration_status`, `summary_ppo`).