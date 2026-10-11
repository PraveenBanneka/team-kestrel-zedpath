# Journey logic: test results

File: `shared/journey.e2e.test.ts`. Run: `npx vitest run shared/journey.e2e.test.ts` (vitest 4.1.11, local, no network).
Code tested as written; no app code was changed.

| Total | Passed | Failed |
|---|---|---|
| 39 (29 named cases JRN-001..029; JRN-001/002/003 repeat once per step id) | 39 | 0 |

## What each group proves

| Cases | Group | What it proves |
|---|---|---|
| JRN-001 (x3) | stepWindow, prep steps | RESULTS, LIST, COMPARE are always open, with any date and any step list. A date on a same-id entry is ignored. |
| JRN-002 (x5) | UGC steps, no date | UGC_APPLY, UGC_ORDER, APTITUDE, UGC_SELECTION, UGC_REGISTER stay closed when `opensOn` is null, missing, or the step is absent. ZedPath never invents a date. |
| JRN-003 (x5) | UGC steps, boundary | Each UGC step is closed the day before `opensOn`, open on that exact date, and open after it. |
| JRN-004..005 | isolation, calendar | One step's date never opens another step. Month, year and Feb-to-Mar boundaries compare correctly. |
| JRN-006 | shipped data | In `worker/generated/journey-2025-2026.json`, the 5 UGC steps have no dates yet, so all of them are closed today. |
| JRN-007..009 | noticeTickable | A notice is closed the day before it opens and tickable on and after the opening date. A notice with no `opensOn` is open. `undefined` is not blocked here, because the Worker checks "follow first" separately. Every shipped notice opens on exactly its own date. |
| JRN-010..011 | isStepId | All 8 ids are accepted. These are rejected: wrong case, extra spaces, step kinds, empty values, non-strings and a boxed String. |
| JRN-012..013 | D1 parity | The test reads the `journey_step` CHECK list from `migrations/0010_journey_avatars_rules.sql`. It matches `JOURNEY_STEP_IDS` exactly, including order. The prep steps come first and every id is unique. |
| JRN-014..016 | readPrefs | Pinned defaults: week and day on, 08:00, badge on, offsets [7, 1]. Input that is not an object gives the defaults. A bad field falls back on its own and the valid fields are kept. Only 8 and 18 are accepted as the hour. |
| JRN-017..019 | reminderTimes | Default reminders come 7 days and 1 day before, at 08:00 local time. The week, day and evening (18:00) settings are respected. Only future times are kept, and a time exactly equal to now is dropped. Month rollover works. |
| JRN-020..024 | toIcs | The calendar wrapper is valid. Every line ends in CRLF, with no bare LF or CR. BEGIN/END pairs balance. The UTC DTSTAMP has no millis. An all-day event on 31 Dec gets DTEND on 1 Jan. The UID is cleaned of unsafe characters. TEXT escaping covers `\` `;` `,` and newlines. Alarm triggers follow the settings (-P7D/-P1D, or -P6DT6H/-P0DT6H for evening). An empty list gives an empty calendar, and each item gets one VEVENT. |
| JRN-025..029 | todayLk (UTC+05:30) | The Sri Lanka date changes at 18:30:00 UTC. UTC midnight is already the same date in Sri Lanka. Year end and 29 Feb 2028 work. End to end, a step that opens on 14 Nov becomes tickable at 18:30 UTC on 13 Nov, which is Sri Lanka midnight, not UTC midnight. |

## Honest notes

- No failures and no bugs were found in the code tested.
- `reminderTimes` uses the phone's local clock. The tests build the expected dates with the same local-time constructor, so they hold in any time zone. The file was also run under TZ=UTC, America/New_York and Pacific/Kiritimati (UTC+14), and all 39 tests passed in each.
- `noticeTickable(undefined)` returns true by design. The Worker stops an unknown notice elsewhere ("Follow it first", 404). This is documented here, not tested end to end.
- These are pure-logic tests. HTTP-level enforcement (409 before a window opens) is covered by `worker/my-journey.test.ts`, not by this file.
