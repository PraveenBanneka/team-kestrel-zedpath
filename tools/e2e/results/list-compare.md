# My list + Compare: e2e-style unit cases (2026-10-12)

File: `shared/list.e2e.test.ts` · Command: `npx vitest run shared/list.e2e.test.ts` · Run locally, no network.

## Totals

| Run | Passed | Expected fail (known gap) | Failed |
|---|---|---|---|
| `shared/list.e2e.test.ts` | 35 | 1 (LST-036) | 0 |
| Full suite (`npx vitest run`, 22 files) | 305 | 1 (same LST-036) | 0 |

## What is covered (36 cases, all new; `shared/list.test.ts` left untouched)

| IDs | Area | Source rule |
|---|---|---|
| LST-001..007 | add: NOT_ELIGIBLE, precedence NOT_ELIGIBLE > DUPLICATE > FULL, duplicate by Uni-Code only, 125th accepted / 126th FULL, no mutation, exact-case codes | BR-017, BR-043, FR-302, FR-308 (`LIST_MAX = 125`) |
| LST-008..013 | addManyToList: order kept, in-batch duplicates, partial fill to 125, duplicates on a full list, empty batch, counts add up | FR-301, BR-043 |
| LST-014..019 | remove (as MyList filters), re-add after remove, move up/down/first-to-last, invalid moves are no-ops, Uni-Code text follows order | FR-306 |
| LST-020..025 | order warning: Safe above Likely/Reach, all Safe above the last risky one, none when order is fine, Out of range / No data ignored, fix by move or proposeOrder at 125, coverage warning | BR-041, BR-042, FR-305 |
| LST-026..028 | compare: COMPARE_MAX = 3, multi-select keeps first 3 in pick order, one-at-a-time appends, skips repeats, stops at 3 | `src/screens/Compare.tsx`, `src/App.tsx` |
| LST-029..036 | storage: list/compare round-trip, empty default, corrupted JSON default, storage throwing (private mode), 125-entry round-trip, clearEverything | NFR-030, FR-106 |

## Honest notes

1. **Known gap (LST-036, marked `it.fails`)**: `src/storage.ts` `read()` catches only JSON parse errors. Valid JSON of
   the wrong shape (e.g. `{"a":1}` under `zedpath.list.v1`) comes back as-is, so `loadList()` can return a non-array.
   Corrupted JSON is handled (LST-032). Fix suggestion (not applied, app code out of scope): `Array.isArray` guard in
   `loadList` / `loadCompare`. When fixed, LST-036 will start "unexpectedly passing": switch `it.fails` to `it`.
2. **Compare has no pure helper**: the max-3 / selection-order rules are inline in the UI (`picked.slice(0, COMPARE_MAX)`
   in Courses; `includes || length >= COMPARE_MAX` in DegreeDetails; Ask.tsx hard-codes `< 3`). LST-027/028 test mirrors
   of those expressions, so they will not notice if the UI drifts. Extracting a `shared/compare.ts` helper would close that.
3. Storage tests use an in-memory `localStorage` stub (vitest runs in node, no jsdom installed).
