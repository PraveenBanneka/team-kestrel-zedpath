# Data integrity: curated read-model data (DAT-001..053)

Run: 2026-10-12 · `npx vitest run worker/data-integrity.e2e.test.ts` · local files only, no network.
Test file: `worker/data-integrity.e2e.test.ts` (new; no app code or data changed).

## Totals

| Item | Value |
|---|---|
| Test cases | 53 (DAT-001..DAT-053) |
| Passed | 53 |
| Failed | 0 |
| Real data problems found | 2 (pinned in `KNOWN`, see below) |
| Run time | about 1.4 s |

The two problems are pinned as an exact list, so the suite is green today, and it fails as soon as a new problem appears
or one of these is fixed (then remove it from `KNOWN`).

## Data covered

| Source | Content |
|---|---|
| `data/routes/routes-2026-10-05.json` (since 23 Oct: `routes-2026-10-23.json`, 51 routes, R029 withdrawn) | 52 routes R001-R052 (private degrees, diplomas, professional, vocational, job exams, scholarships abroad, retry) |
| `data/journey/ugc-steps-2025-2026.json` | 5 UGC Journey steps |
| `data/alerts/notices-2026-10-11.json` (since 23 Oct: `notices-2026-10-23.json`, adds R023) | 5 notices (R043, R027, R040, R041, R044) |
| `data/degrees/syllabi-2026-10-05.json` | 13 syllabi (12 FOUND, 1 UNREADABLE, withheld) |
| `worker/generated/journey-2025-2026.json`, `rulebook-2025-2026.json` | the compiled bundles (routes, 121 course rules, 255 offerings with cut-offs, 5 hashed UGC sources) |
| `data/ugc/2025-2026/unicodes.csv` | 255 Uni-Codes |
| `shared/group-samples.ts`, `src/demo.ts` | sample chats and the demo student |
| `src/i18n/en.ts`, `si.ts`, `ta.ts` | English, Sinhala, Tamil interface text |

## What is checked

| Area | Cases | Checks |
|---|---|---|
| Route ids and references | DAT-001..006 | ids match `R###`, unique; rulebook routes equal the curated routes field by field; every notice and every `R###` mentioned in journey/alerts/syllabi exists; 7 route groups, each labelled |
| Compiled vs curated | DAT-007..009 | compiled steps and notices equal their sources; notice provider/source copied from its route; build stamps valid |
| Dates | DAT-010..015 | ISO dates; opens before closes; retrieval dates not after the build; each compiled closing date and each notice date is written in that route's own intake text ("before X" may close the day before); notice and route close dates agree; "OPEN at retrieval" only where the text says OPEN |
| No invented UGC dates | DAT-016..019 | no UGC step has `opensOn`; no step text states a calendar date; each step cites a handbook page and quote; unique step ids |
| Links | DAT-020..029 | blocked hosts read from `worker/syllabi.ts`; no link or text anywhere uses a blocked host; served syllabi never link one; every link parses; https only; official domain only (`*.ac.lk`, `ugc.ac.lk`, `*.gov.lk`, or an institution's own domain from the routes' `official_url`); a route's source is government/university or the provider's own site; syllabus links on university domains |
| Every number has a source | DAT-030..037 | every route has source link, locator, retrieval date; costs whole, non-negative, min <= max; confidence 0..1; notice age/A/L numbers come with a verbatim quote from the route's official text; A/L subject codes real; every course rule has page + quote; every cut-off year names one of the 5 SHA-256-hashed UGC sources + page; 25 district values per row, each null or a plausible Z |
| Syllabi and Uni-Codes | DAT-038..042 | every syllabus Uni-Code is in `unicodes.csv` and in the offerings; same university name; Uni-Codes well formed and unique; only FOUND syllabi with modules and a link are served; no repeated modules or year labels |
| Duplicates | DAT-043..045 | no route with the same name + provider; no duplicate notice; districts/streams/subjects unique, 25 districts |
| Sample content | DAT-046..049 | every sample chat message has `sample: true`, an author starting "Sample", a `sample-` id; no "verified" badge, Z-score, year or date in a sample; sample threads only for real course codes; demo student uses an `example.com` address and a "demo" username |
| Sinhala and Tamil | DAT-050..053 | Journey step text equals the English interface source and has Sinhala + Tamil in the right script; every route group and stream has si/ta labels; si/ta cover every English key |

## Real data problems

1. **R027 (National Diploma in Technology, ITUM): `official_url` is `http://`, not `https://`.**
   The same link is copied into the compiled rulebook route and into the R027 notice's `officialUrl`, so the app shows
   an unencrypted link. Fix: change the scheme to https in `data/routes/routes-2026-10-05.json` (after checking the
   page serves over https), rebuild the rulebook and journey bundles, then remove `'R027 official_url'` from `KNOWN.notHttps`.
2. **Syllabus 001A (MBBS, University of Colombo): the second `sourceUrls` entry is a Google Drive file link**, not
   the university's own domain. The entry is FOUND, so the Worker serves it and students see this link. The first link
   is on the faculty's own `cmb.ac.lk` site. Fix: replace it with the faculty's own copy of the document, or drop it and
   keep only the faculty page, then remove the entry from `KNOWN.offAllowList`.

No link anywhere in the curated or compiled data uses a blocked host (field links, links inside free text, and the
bare host name were all checked). The one syllabus withheld for that reason (UNREADABLE) has no stored links.

## Observations (not failures)

- The compiled `closesOn` for the loan-scheme routes R001 and R003-R017 is 2026-11-19, the **end of the online
  interviews**, not the application close (27.09.2026, CLOSED). The build takes the latest date in the intake text.
  It is sourced and `openAtRetrieval` is correctly false, but any screen that labels `closesOn` as "applications close"
  would be wrong for these routes.
- R040 and R041: the notices close on 2026-10-14 while the compiled routes say 2026-10-15. The source says
  applications "must be received before 15.10.2026", so the notice (last day 14th) is the careful reading. The test
  accepts exactly this one-day difference only when the text says "before".
- The route data, notices and syllabi are English only by design (`src/i18n/index.ts`: official data is shown as
  published). The Sinhala/Tamil check therefore covers every interface label that wraps that data (steps, route groups,
  streams, all keys), not the official text itself.
