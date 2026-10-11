# ZedPath live read-only E2E pass

- Server: live (production)
- Run at: 2026-10-11T18:54:00.254Z
- Mode: read-only (GETs, the pure /api/results calculation, and requests refused before any write)
- Harness: `node tools/e2e/live-readonly.ts <base-url>`

**Total 86 · Passed 85 · Failed 1**

## Performance (10 calls each, this network)

| Endpoint | p50 ms | p95 ms | max ms |
|---|---|---|---|
| GET /api/meta | 58 | 59 | 59 |
| POST /api/results | 73 | 145 | 145 |
| GET /api/offerings/:uni | 57 | 153 | 153 |
| GET /api/routes | 78 | 213 | 213 |
| GET /api/journey | 59 | 352 | 352 |

## Observations (recorded, not failed)

- HTML (/): missing strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy
- API (/api/meta): missing strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy
- API error (/api/me 401): missing strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy

## Cases

| ID | Area | Title | Trace | Expected | Actual | Result | ms |
|---|---|---|---|---|---|---|---|
| E2E-LIVE-001 | meta | GET /api/health is up and rules reconciled | NFR-040 | 200 JSON {ok:true, rules:RECONCILED} | 200 ok=true rules=RECONCILED year=2025/2026 | PASS | 1417 |
| E2E-LIVE-002 | meta | GET /api/meta shape (year, 25 districts, 6 streams, subjects, sources) | FR-101; NFR-050 | 200 JSON; 25 districts with code/name/disadvantaged; 6 streams; >=40 subjects; sources with id/title | 200 year=2025/2026 districts=25 streams=6 subjects=59 sources=5 | PASS | 62 |
| E2E-LIVE-003 | meta | GET /api/meta revalidates with ETag (304 on If-None-Match) | NFR-011 | 200 with ETag + Cache-Control no-cache; repeat with If-None-Match -> 304 empty body | ETag (compressed)=W/"r...; cache-control="public, no-cache"; revalidate with the ETag the client got -> 200; uncompressed strong ETag -> 304 | FAIL | 63 |
| E2E-LIVE-004 | meta | GET /api/routes shape (id, name, group, openNow boolean) | FR-501; FR-503 | 200 JSON array, every route has id/name/group and boolean openNow | 200 routes=52 openNow=4 cache-control="public, max-age=300" | PASS | 251 |
| E2E-LIVE-005 | meta | GET /api/journey shape (academicYear, steps with id/title/page) | FR-401; FR-402; NFR-050 | 200 JSON; steps[] each with id, title and a handbook page | 200 year=2025/2026 steps=5 keys=academicYear,handbook,steps,notices | PASS | 66 |
| E2E-LIVE-006 | meta | GET /api/journey does not expose the internal builtAt stamp | n/a | no builtAt key in body | builtAt present=false | PASS | 82 |
| E2E-LIVE-007 | results | POST /api/results physKur (PHYS, KUR, z=1.4821) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=64 hidden=191 S/L/R/O/N=38/6/9/11/0 badBand=0 badGap=0 | PASS | 125 |
| E2E-LIVE-008 | results | POST /api/results bioCol (BIO, COL, z=1.5000) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=121 hidden=134 S/L/R/O/N=75/1/16/29/0 badBand=0 badGap=0 | PASS | 95 |
| E2E-LIVE-009 | results | POST /api/results commGal (COMMERCE, GAL, z=1.0000) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=51 hidden=206 S/L/R/O/N=6/2/0/43/0 badBand=0 badGap=0 | PASS | 78 |
| E2E-LIVE-010 | results | POST /api/results artsJaf (ARTS, JAF, z=0.8000) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=41 hidden=214 S/L/R/O/N=4/0/2/31/4 badBand=0 badGap=0 | PASS | 101 |
| E2E-LIVE-011 | results | POST /api/results etAmp (ET, AMP, z=0.5000) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=41 hidden=214 S/L/R/O/N=1/4/4/32/0 badBand=0 badGap=0 | PASS | 121 |
| E2E-LIVE-012 | results | POST /api/results bstMon (BST, MON, z=0.3000) sanity | FR-201; FR-205; FR-206; NFR-051 | 200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN | 200 offerings=27 hidden=228 S/L/R/O/N=1/1/3/22/0 badBand=0 badGap=0 | PASS | 108 |
| E2E-LIVE-013 | results | Hidden offerings each carry a reason and handbook page | FR-204; NFR-050 | every hidden item has non-empty reason and integer page | hidden=191 missing reason/page=0 | PASS | 0 |
| E2E-LIVE-014 | results | Edge: maximum Z-score +4.0000 is accepted; nothing is Reach/Out of range | FR-102; BR-030 | 200; REACH=0 and OUT_OF_RANGE=0; SAFE > 0 | 200 S/L/R/O/N=64/0/0/0/0 | PASS | 95 |
| E2E-LIVE-015 | results | Edge: minimum Z-score -4.0000 is accepted; nothing is Safe or Likely | FR-102; BR-030 | 200; SAFE=0 and LIKELY=0 | 200 S/L/R/O/N=0/0/0/64/0 | PASS | 77 |
| E2E-LIVE-016 | results | Edge: Z-score 0.0000 accepted | FR-102 | 200 JSON, counts sum = offerings | 200 S/L/R/O/N=0/0/0/51/0 | PASS | 96 |
| E2E-LIVE-017 | results | Monotonic: higher Z-score never lowers the Safe count (same profile) | BR-030 to BR-036 | SAFE(z=2.0) >= SAFE(z=1.0) >= SAFE(z=0.5) | SAFE at 0.5/1.0/2.0 = 2/20/115 | PASS | 395 |
| E2E-LIVE-018 | results | District matters: same results, different district changes bands | BR-014 | COL vs a disadvantaged district (MON) give different band counts | COL {"SAFE":75,"LIKELY":1,"REACH":16,"OUT_OF_RANGE":29,"NOT_ENOUGH_DATA":0} \| MON {"SAFE":71,"LIKELY":5,"REACH":19,"OUT_OF_RANGE":19,"NOT_ENOUGH_DATA":7} | PASS | 258 |
| E2E-LIVE-019 | results | Results are not cached publicly and set no cookie | NFR-030 | no Set-Cookie; Cache-Control not public | set-cookie=false cache-control=(none) | PASS | 93 |
| E2E-LIVE-020 | results | No response states or implies certain admission | FR-207 | no "guarantee"/"you will get in"/"certain to" in results, meta, routes, journey | no certainty wording found | PASS | 279 |
| E2E-LIVE-021 | offering | GET /api/offerings/:uniCode with district: cited history with district cut-offs | FR-208; FR-209; NFR-050 | 200; requirementCitation.page; each history row has citation and numeric/null zE4; some non-null | 200 uni=011G groups=1 historyRows=5 nonNull=5 | PASS | 58 |
| E2E-LIVE-022 | offering | Offering without district: history zE4 all null (no guessing) | FR-208 | 200; every history zE4 === null | 200 rows=5 nonNull=0 | PASS | 64 |
| E2E-LIVE-023 | offering | Uni-Code lookup is case-insensitive | n/a | lower-case code -> 200 same uniCode | 200 uniCode=011G | PASS | 58 |
| E2E-LIVE-024 | offering | Unknown Uni-Code -> 404 JSON error | NFR-035 | 404 JSON {error} | 404 {"error":"No such Uni-Code"} | PASS | 69 |
| E2E-LIVE-025 | offering | Unknown district query is ignored safely (no 500) | NFR-035 | 200; history zE4 all null | 200 nonNull=0 | PASS | 70 |
| E2E-LIVE-026 | validation | POST /api/results rejects no body | FR-101; NFR-035 | 400 JSON {error} | 400 {"error":"A JSON profile is required"} | PASS | 57 |
| E2E-LIVE-027 | validation | POST /api/results rejects non-JSON body | NFR-035 | 400 JSON {error} | 400 {"error":"A JSON profile is required"} | PASS | 61 |
| E2E-LIVE-028 | validation | POST /api/results rejects unknown stream | FR-101; NFR-035 | 400 JSON {error, field:stream} | 400 {"error":"Unknown stream","field":"stream"} | PASS | 57 |
| E2E-LIVE-029 | validation | POST /api/results rejects unknown district | FR-101; NFR-035 | 400 JSON {error, field:district} | 400 {"error":"Unknown district","field":"district"} | PASS | 92 |
| E2E-LIVE-030 | validation | POST /api/results rejects Z-score above +4.0000 | FR-102 | 400 JSON {error, field:zE4} | 400 {"error":"Z-score must be between −4.0000 and +4.0000","field":"zE4"} | PASS | 57 |
| E2E-LIVE-031 | validation | POST /api/results rejects Z-score below -4.0000 | FR-102 | 400 JSON {error, field:zE4} | 400 {"error":"Z-score must be between −4.0000 and +4.0000","field":"zE4"} | PASS | 118 |
| E2E-LIVE-032 | validation | POST /api/results rejects Z-score with more than four decimals (non-integer zE4) | FR-102 | 400 JSON {error, field:zE4} | 400 {"error":"Z-score must be between −4.0000 and +4.0000","field":"zE4"} | PASS | 83 |
| E2E-LIVE-033 | validation | POST /api/results rejects Z-score as string | FR-102; NFR-035 | 400 JSON {error, field:zE4} | 400 {"error":"Z-score must be between −4.0000 and +4.0000","field":"zE4"} | PASS | 79 |
| E2E-LIVE-034 | validation | POST /api/results rejects only two subjects | FR-101 | 400 JSON {error, field:al} | 400 {"error":"Enter exactly three A/L subjects","field":"al"} | PASS | 57 |
| E2E-LIVE-035 | validation | POST /api/results rejects invalid grade E | FR-101 | 400 JSON {error, field:al} | 400 {"error":"Each subject needs a grade of A, B, C or S","field":"al"} | PASS | 66 |
| E2E-LIVE-036 | validation | POST /api/auth/signup with an invalid username -> 400 (nothing created) | BR-050; NFR-035 | 400 JSON field=username; no Set-Cookie | 400 {"error":"Usernames are 3 to 24 characters: letters, numbers, dot or underscore","field":"username"} | PASS | 73 |
| E2E-LIVE-037 | validation | POST /api/auth/signup with valid-format username but malformed key -> 400 (nothing created) | FR-114; NFR-036 | 400 JSON field=key; no Set-Cookie | 400 {"error":"Malformed sign-up request","field":"key"} | PASS | 61 |
| E2E-LIVE-038 | auth | GET /api/me without session -> 401 | FR-116; FR-117 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 55 |
| E2E-LIVE-039 | auth | PUT /api/me without session -> 401 | FR-116; FR-117 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 85 |
| E2E-LIVE-040 | auth | DELETE /api/me without session -> 401 | FR-116; FR-117 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 55 |
| E2E-LIVE-041 | auth | PUT /api/me/contact without session -> 401 | FR-116; FR-117 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 60 |
| E2E-LIVE-042 | auth | PUT /api/me/avatar without session -> 401 | FR-116; FR-117 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 58 |
| E2E-LIVE-043 | auth | GET /api/me/journey without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 58 |
| E2E-LIVE-044 | auth | PUT /api/me/journey/courses/ZZZ999 without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 56 |
| E2E-LIVE-045 | auth | DELETE /api/me/journey/courses/ZZZ999 without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 61 |
| E2E-LIVE-046 | auth | PUT /api/me/journey/notices/R001 without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 58 |
| E2E-LIVE-047 | auth | DELETE /api/me/journey/notices/R001 without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 91 |
| E2E-LIVE-048 | auth | PUT /api/me/journey/notices/R001/applied without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 59 |
| E2E-LIVE-049 | auth | PUT /api/me/journey/steps/UGC_APPLY without session -> 401 | FR-411; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 74 |
| E2E-LIVE-050 | auth | POST /api/auth/logout without session -> 401 | FR-115 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 54 |
| E2E-LIVE-051 | auth | POST /api/auth/logout-all without session -> 401 | FR-115 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 63 |
| E2E-LIVE-052 | auth | GET /api/groups without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 57 |
| E2E-LIVE-053 | auth | POST /api/groups/join without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 64 |
| E2E-LIVE-054 | auth | GET /api/groups/1 without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 54 |
| E2E-LIVE-055 | auth | POST /api/groups/1/leave without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 57 |
| E2E-LIVE-056 | auth | GET /api/groups/1/live without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 56 |
| E2E-LIVE-057 | auth | GET /api/groups/1/members without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 104 |
| E2E-LIVE-058 | auth | POST /api/groups/1/report without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 55 |
| E2E-LIVE-059 | auth | GET /api/blocks without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 87 |
| E2E-LIVE-060 | auth | POST /api/blocks without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 55 |
| E2E-LIVE-061 | auth | DELETE /api/blocks/someone without session -> 401 | FR-705; NFR-038 | 401 JSON {error} | 401 {"error":"Please log in"} | PASS | 56 |
| E2E-LIVE-062 | auth | Forged well-formed session cookie -> 401 and cookie cleared | NFR-036 | 401; Set-Cookie clears zp session | 401 set-cookie=zp_session=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Lax | PASS | 82 |
| E2E-LIVE-063 | auth | Malformed session cookie -> 401 | NFR-035 | 401 | 401 | PASS | 54 |
| E2E-LIVE-064 | cors | Foreign Origin on PUT /api/me -> 403 (refused before session check) | NFR-035 | 403 JSON "Cross-site request refused" | 403 {"error":"Cross-site request refused"} | PASS | 54 |
| E2E-LIVE-065 | cors | Foreign Origin on POST /api/auth/signup -> 403 | NFR-035; NFR-037 | 403 | 403 {"error":"Cross-site request refused"} | PASS | 60 |
| E2E-LIVE-066 | cors | Foreign Origin on PUT /api/me/journey/steps -> 403 | NFR-038 | 403 | 403 | PASS | 54 |
| E2E-LIVE-067 | cors | Foreign Origin on POST /api/groups/join -> 403 | NFR-038 | 403 | 403 | PASS | 59 |
| E2E-LIVE-068 | cors | GET /api/meta from a foreign Origin: no credentialed CORS grant | NFR-035 | Access-Control-Allow-Origin absent, or not the foreign origin with credentials | ACAO=(none) ACAC=(none) | PASS | 56 |
| E2E-LIVE-069 | cors | OPTIONS preflight from a foreign Origin for PUT /api/me: not granted | NFR-035 | no Access-Control-Allow-Origin for the foreign origin | 403 ACAO=(none) ACAM=(none) | PASS | 53 |
| E2E-LIVE-070 | routing | Unknown API route -> 404 JSON | n/a | 404 JSON {error:"Not found"} | 404 {"error":"Not found"} | PASS | 57 |
| E2E-LIVE-071 | routing | Wrong method on a known route (GET /api/results) -> 404 JSON, not 500 | n/a | 404 or 405 JSON | 404 {"error":"Not found"} | PASS | 55 |
| E2E-LIVE-072 | routing | POST /api/dev/embed is disabled in production -> 404 (no model call) | NFR-033 | 404 | 404 {"error":"Not found"} | PASS | 59 |
| E2E-LIVE-073 | routing | POST /api/dev/search is disabled in production -> 404 (no model call) | NFR-033 | 404 | 404 {"error":"Not found"} | PASS | 56 |
| E2E-LIVE-074 | routing | Path traversal attempt on offerings -> 404, no file content | NFR-035 | 404 JSON | 404 {"error":"No such Uni-Code"} | PASS | 64 |
| E2E-LIVE-075 | static | GET / serves the app HTML | NFR-012; NFR-063 | 200 text/html with <div id="root"> or a script tag | 200 text/html bytes=1229 | PASS | 64 |
| E2E-LIVE-076 | static | Deep link (SPA route) serves the app HTML, not a 404 page | NFR-063 | 200 text/html | 200 text/html | PASS | 65 |
| E2E-LIVE-077 | headers | Security headers recorded on HTML (/) | NFR-035 | Content-Type present (fail only if missing); other headers recorded | content-type=text/html; present=[]; missing=[strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy] | PASS | 61 |
| E2E-LIVE-078 | headers | Security headers recorded on API (/api/meta) | NFR-035 | Content-Type present (fail only if missing); other headers recorded | content-type=application/json; present=[]; missing=[strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy] | PASS | 57 |
| E2E-LIVE-079 | headers | Security headers recorded on API error (/api/me 401) | NFR-035 | Content-Type present (fail only if missing); other headers recorded | content-type=application/json; present=[]; missing=[strict-transport-security, x-content-type-options, content-security-policy, x-frame-options, referrer-policy, permissions-policy] | PASS | 55 |
| E2E-LIVE-080 | headers | Server does not leak framework/version headers (X-Powered-By) | n/a | no X-Powered-By | x-powered-by=(none) | PASS | 58 |
| E2E-LIVE-081 | headers | All JSON endpoints answer with application/json | n/a | content-type application/json on health, meta, routes, journey, offering, results, 400, 401, 404 | all 9 JSON | PASS | 844 |
| E2E-LIVE-082 | performance | GET /api/meta p95 over 10 calls <= 1500 ms | NFR-002; NFR-003 | p95 <= 1500 ms on this network (all 10 return 200) | p50=58 ms p95=59 ms max=59 ms non200=0 | PASS | 59 |
| E2E-LIVE-083 | performance | POST /api/results p95 over 10 calls <= 1500 ms | NFR-002; NFR-003 | p95 <= 1500 ms on this network (all 10 return 200) | p50=73 ms p95=145 ms max=145 ms non200=0 | PASS | 145 |
| E2E-LIVE-084 | performance | GET /api/offerings/:uni p95 over 10 calls <= 1500 ms | NFR-002; NFR-003 | p95 <= 1500 ms on this network (all 10 return 200) | p50=57 ms p95=153 ms max=153 ms non200=0 | PASS | 153 |
| E2E-LIVE-085 | performance | GET /api/routes p95 over 10 calls <= 1500 ms | NFR-002; NFR-003 | p95 <= 1500 ms on this network (all 10 return 200) | p50=78 ms p95=213 ms max=213 ms non200=0 | PASS | 213 |
| E2E-LIVE-086 | performance | GET /api/journey p95 over 10 calls <= 1500 ms | NFR-002; NFR-003 | p95 <= 1500 ms on this network (all 10 return 200) | p50=59 ms p95=352 ms max=352 ms non200=0 | PASS | 352 |
