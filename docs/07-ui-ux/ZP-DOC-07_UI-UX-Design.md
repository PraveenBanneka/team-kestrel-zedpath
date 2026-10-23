---
id: ZP-DOC-07
title: UI/UX Design
subtitle: Design principles, information architecture, design system, screen specifications and accessibility for the ZedPath app
version: 0.9
date: 23 October 2026
status: In review
classification: Public
owner: B.M.P Banneka, Product Owner
author: Team Kestrel (drafted with Claude, AI coding partner)
approver: B.M.P Banneka, Product Owner
reviewer: Claude (AI coding partner), consistency and traceability review
standard: Material Design 3; WCAG 2.2 level AA; ZP-DOC-00
revision: 0.9 | 11 Oct 2026 | Team Kestrel | First issue, written from the built app (CR-001 to CR-006 and the video-review fixes included); contrast measured from the colour tokens; submitted for approval
revision: 0.9 | 15 Oct 2026 | Team Kestrel | Revised in review for VR2 (14 October 2026: band names Very likely / Possible / Unlikely with a one-line meaning under the tabs, intro guide of seven slides, silhouette avatars, expired session returns to Log in) and CR-007 to CR-010 (15 October 2026: Try the demo button and demo note in Me, University facts card, Aptitude test card, NVQ ladder on route R042, Ask links only fill the box, failed log-out message, phone data cleared for the next student); journeys, routes, components, screens, patterns, usability evidence and traceability updated
revision: 0.9 | 21 Oct 2026 | Team Kestrel | Revised for VR3 (18 to 21 October 2026, product owner's review on a phone and a desktop): Compare "+" opens the picker above the table and new columns line up beside the row labels; multi-select tip shown as a highlighted box with steps; Compare takes up to three and says so; desktop layout from 1024 px (collapsible side menu with a glass menu button, logo in the corner, Paths dashboard, course page in two columns); install button says "this device"
revision: 0.9 | 23 Oct 2026 | Team Kestrel | My list: "+ Add a course" box below the last course opens the course picker; a green confirmation with a tick whenever courses are added (Courses, course page, My list)
revision: 0.9 | 23 Oct 2026 | Team Kestrel | CR-011: My list order notes become information (no "Fix the order"); "What you need to know" section with the UGC rules and handbook pages
---

# Introduction

## Purpose

This document specifies what a ZedPath user sees and how they move through the app: the principles behind the
design, the navigation structure, the design system (colour, type, shape, components), each main screen with its
states, the shared interaction patterns, the language and content rules, accessibility, and the performance budget
for low-end Android phones on 3G. It records the design **as built** on 11 October 2026, so a reviewer can check
every statement against the code.

## Scope

The student-facing web app (a Vite + React single-page app installed as a Progressive Web App, also wrapped as an
Android app) for Releases R1 and R2. The curator tools and the API are out of scope; they are covered by
ZP-DOC-05 and ZP-DOC-06.

## Intended audience

Designers, developers and testers of ZedPath, and anyone assessing the quality of the user experience (for
example, buildathon judges).

## Relationship to other documents

Table: Position of this document in the ZedPath document set

| Document | Relationship |
|---|---|
| ZP-DOC-02 User Stories | Parent. Personas P1 to P6 and the stories US-101 to US-708 drive the screens |
| ZP-DOC-03 SRS | Parent. NFR-001 to NFR-006 (performance) and NFR-020 to NFR-025 (usability, language, accessibility) are the targets here |
| ZP-DOC-04 Use Case Model | Parent. Each main flow maps to a screen sequence in Section 3 |
| ZP-DOC-05 Data Design | Sibling. Revision rows CR-001 to CR-006 record the data side of the same changes |
| ZP-DOC-06 Software Architecture | Sibling. Decides the SPA-on-static-assets delivery that the performance budget relies on |
| ZP-DOC-08 Test Plan | Child. Tests the accessibility checklist and the performance budget |
| `src/styles.css`, `src/App.tsx`, `src/screens/*.tsx` | Implementation. The design tokens and screens described here |
| Concept screens (Gate 1) | Reference: https://claude.ai/artifact/N8wGu87fiY8ksUbb82yU8f |

## Conventions

Colour and size values are the CSS custom properties ("tokens") in `src/styles.css`; components use tokens only,
never raw colours. Routes are written as hash routes (`#/paths`). "Light" and "dark" refer to the theme the phone's
system setting selects.

# Design principles

Table: Design principles and how the design applies them

| # | Principle | Source | Applied as |
|---|---|---|---|
| DP-1 | **Every number links to its source** | Trust rules (CLAUDE.md), US-204, US-602 | Cut-offs, rules and answers carry a source line or source chip that opens the UGC handbook page or the official notice |
| DP-2 | **Never "you will get in"** | Trust rules, US-603 | Chances are bands, shown since VR2 as *Very likely*, *Possible* and *Unlikely*, each with a one-line meaning, never a promise; Ask gives a verdict chip such as "It depends", never a guarantee |
| DP-3 | **Sample data is labelled as sample** | Trust rules, CR-005, CR-007 | Sample group conversations carry a "Sample" label and cannot be reported or replied to as real; demo mode shows a label above the form; a demo account says in *Me* that it is a demo with read-only groups, deleted after 24 hours |
| DP-4 | **No paid placement** | Trust rules | Order of courses and routes comes only from the student's results and official data |
| DP-5 | **Built for low-end Android on 3G** | NFR-001, NFR-006, interviews E1 to E6 | Static SPA, cached app shell, skeletons instead of spinners, one question per screen, no heavy images |
| DP-6 | **Trilingual from the first screen** | NFR-023, US-105 | Sinhala, Tamil and English chosen on the Welcome screen; official names and quotes stay in English as published, and the app says so |
| DP-7 | **Safe for minors** | CR-003, CR-005, CR-006 | Preset avatars (no photo upload), group rules accepted before taking part, phone numbers and emails refused in messages, report and block |
| DP-8 | **Nothing stored without asking** | Trust rules, US-109 | Each contact field states its purpose; consent is recorded; results-based checks for notices run on the phone |
| DP-9 | **One task per screen; validate after interaction** | Material Design 3; ui-ux-pro-max guidance | About you asks one question per screen; errors appear only after Next |

# Personas and key journeys

The personas are defined in ZP-DOC-02. The app is designed first for P1; the others shape specific screens.

Table: Personas and the screens designed for them

| Persona | Need in one line | Screens designed for them |
|---|---|---|
| P1 Kavindu, student with results | "What can I get into, and what do I do next?" | Onboarding, Paths, Courses, Course detail, My list, Journey, Ask |
| P2 Nimesha, before the exam | Estimate chances before results | About you (estimated Z-score), Paths |
| P3 Mr. Bandara, parent | Understand the options with the student | Compare, course detail sources, language choice |
| P4 Ms. Perera, teacher or counsellor | Guide many students consistently | Sourced course pages, Ask with citations |
| P5 Sahan, verified senior | Answer questions from juniors | Groups (senior badge; seniors land on Groups after login) |
| P6 Curator | Keep data correct | Out of scope (not in the student app) |

Table: Key journeys

| Journey | Steps (screens) | Stories |
|---|---|---|
| J1 First run | Welcome (language) → Intro (7 slides) → Sign up → Save recovery code → About you (5 steps) → Paths | US-105, US-106, US-107, US-109, US-101 |
| J0 Try first | Welcome → *Try the demo, no sign-up* → Paths with the sample student (private demo account, read-only groups) | US-112 |
| J2 Find my chances | Paths (band ring) → Courses (Safe / Likely / Reach tabs) → Course detail | US-201, US-202, US-203, US-204, US-209 |
| J3 Decide | Course detail or Courses (press and hold) → Compare (up to 3) → Add to My list | US-207, US-305, US-301 |
| J4 Build the application list | My list → reorder → order warning → Fix the order → Copy Uni-Codes | US-301, US-302, US-303 |
| J5 Stay on track | Journey: My steps (tick within window) and Open now (notices) → reminders | US-401, US-402, US-404, US-407, US-409 to US-411, US-503 |
| J6 Ask | Ask → suggestion chip or own question → answer card → action (open, add, compare, add to Journey) | US-601 to US-607 |
| J7 Don't decide alone | Groups → accept rules once → room → group info → exit | US-704, US-706, US-707, US-708 |

# Information architecture and navigation

## Structure

The app has a **focused account flow** without the navigation bar (Welcome, Intro, Sign up, Log in, Recover,
Recovery code, Complete your account, About you) and a **main app** with a top app bar and a five-tab bottom
navigation bar. Me opens from the avatar in the top app bar. Routing uses the URL hash so the phone's Back button
and deep links work. From 1024 px wide (laptops, desktops, projectors) the same five destinations move into a
**collapsible side menu** (see Desktop layout).

Table: Bottom navigation tabs

| Tab | Icon | Route | Badge |
|---|---|---|---|
| Paths | Map | `#/paths` | none |
| My list | Ordered list | `#/list` | none |
| Journey | Calendar | `#/journey` | count of open notices the student has not seen and is not ruled out for (can be turned off in Notification settings) |
| Groups | People | `#/groups` | none |
| Ask | Sparkles | `#/ask` | none |

## Desktop layout (1024 px and wider)

Added in VR3 (21 October 2026). The layout follows the width of the browser window, never the type of device: the
CSS rule `min-width: 1024px` switches it on, and a window made narrower gets the phone layout again. Below 1024 px
nothing changes: the desktop wrappers are `display: contents`, so phones keep the same order and look.

Table: Desktop layout: specification

| Aspect | Specification |
|---|---|
| Top app bar | Full width and white, with the menu button and the ZedPath logo in the top-left corner |
| Side menu | **Open** (232 px): icon and name side by side, badges at the end of the row. **Collapsed** (84 px): icons only; each name stays for screen readers and shows as a tooltip. Width changes animate (off under reduced motion) |
| Menu button | Glass style: frosted white over a light brand tint, a top highlight and a soft shadow; 44 × 44 px; a dark-mode version. `aria-expanded`, `aria-controls="main-nav"`, label "Collapse menu" or "Expand menu" in Sinhala, Tamil and English |
| Menu choice kept | Stored on the device (`zedpath.nav.v1`), open by default and when storage is blocked; a layout preference like the language: kept when student data is cleared, removed by "Clear this phone" (TC-139) |
| Content width | 1040 px; Paths 1240 px; course page and Compare 1440 px |
| Paths | Dashboard (the product owner's choice of three options): results banner across the top with the band ring on the right, a row of cards (special intake, hidden courses, My list), other paths three across |
| Course detail | Two columns: the band card and the actions stay on the left under the app bar while the details scroll on the right |
| Sticky bars | Selection bar, composer and Ask box sit 16 px from the bottom (there is no bottom bar) |

## Route table

Table: Hash routes, screens and purpose

| Route | Screen | Tab | Purpose |
|---|---|---|---|
| `#/` | Welcome | none | Choose language; start or log in |
| `#/intro` | Intro | none | Seven animated slides with app scenes, marked *Example*: paths hub, chances ring, source link, list warning, Ask, Journey, Groups |
| `#/signup`, `#/login`, `#/recover` | Account | none | Create an account, log in, reset with the recovery code |
| `#/saved-code`, `#/saved-code/new` | Recovery code | none | Show the one-time recovery code to save |
| `#/contact` | Complete your account | none | Accounts made before CR-003 add contact details; also edits them |
| `#/about` | About you | none | Stream, district, Z-score, subjects and grades, beyond grades |
| `#/paths` | Your paths (home) | Paths | Band ring, see courses, other routes, My list entry |
| `#/courses/safe` `/likely` `/reach` | Courses | Paths | Courses by band, search, press-and-hold multi-select |
| `#/hidden` | Hidden courses | Paths | Why each excluded course is out of reach |
| `#/course/<Uni-Code>` | Course detail | Paths | Needs vs you have, cut-off chart, syllabus, university facts, aptitude test, actions |
| `#/compare` | Compare | My list | Up to 3 courses side by side |
| `#/list` | My list | My list | Ordered preference list for the UGC application |
| `#/journey`, `#/journey/open`, `#/alerts` | Journey | Journey | My steps / Open now tabs |
| `#/routes/<group>`, `#/route/<id>` | Other routes | Paths | Private degrees, job exams, vocational, abroad |
| `#/groups` | Groups | Groups | Chat list: my groups, popular groups |
| `#/group/<id>`, `#/group/<id>/info` | Group room, Group info | Groups | WhatsApp-style room; description, rules, members, exit |
| `#/ask`, `#/ask/<question>` | Ask ZedPath | Ask | Cited answers; a deep link only fills the question box, never sends it (CR-010) |
| `#/me` | Me | none | Avatar, profile, language, notification settings, account, delete |

## Guards

Table: Navigation guards

| Condition | Result |
|---|---|
| Not onboarded | Welcome (or Intro) only |
| Onboarded but no account | Sign up |
| Account without contact details (pre CR-003) | Complete your account, before anything else |
| No profile (student) | About you |
| Senior without a student profile | Groups and Me only |
| Session expired or ended elsewhere (any 401 outside the sign-in routes) | Log in (VR2), instead of "Please log in" inside a screen |
| A different student logs in on this phone | The previous student's results, list, Journey and settings are cleared from the phone first; the language stays (CR-010) |

# Design system

## Colour roles

The palette pairs the Gate 1 deck navy with the logo's amber. Dark mode follows the system setting and redefines
every token. Gradients ("aurora") are used for hero moments only: the Welcome screen and the Paths summary card.

Table: Colour roles (light theme; dark theme redefines each)

| Role | Token | Light | Use |
|---|---|---|---|
| Primary | `--brand` / `--brand-500` | #24478C / #3461C9 | Filled buttons (gradient), links, selected states |
| On primary | `--on-brand` | #FFFFFF | Text on filled buttons |
| Accent | `--amber` | #FFC94A | Logo, hero highlight |
| Background | `--bg` | #F4F6FB | Page and app bar (solid) |
| Surface | `--surface`, `-2`, `-3` | #FFFFFF, #EEF2F9, #E4EAF5 | Cards, inputs, tonal buttons |
| Text | `--ink`, `-2`, `-3` | #0E1525, #4A5468, #7A8396 | Body, secondary, helper |
| Safe | `--safe` on `--safe-bg` | #0F9D63 on #DDF7EA | Safe band, shown as *Very likely* |
| Likely | `--likely` on `--likely-bg` | #2C63E8 on #E3EBFF | Likely band, shown as *Possible*; selected rows |
| Reach | `--reach` on `--reach-bg` | #B86E00 on #FFF0D2 | Reach band, shown as *Unlikely* |
| Out of range | `--out` on `--out-bg` | #C9303F on #FDE4E7 | Hidden or out-of-range |
| Not enough data | `--none` on `--none-bg` | #5B6476 on #ECEFF5 | No cut-off history |
| Error | `--danger` | #C9303F | Error text |

## Typography

Headings use **Outfit**, body text **Inter**; **Noto Sans Sinhala** and **Noto Sans Tamil** are in both font
stacks, so Sinhala and Tamil render with matching weight (NFR-024). Fonts load from Google Fonts with
`preconnect`; the system font is the fallback. Numbers use tabular figures; digits stay Western in all three
languages, as on results sheets.

Table: Type scale

| Style | Font | Size / line height | Weight | Use |
|---|---|---|---|---|
| Display | Outfit | 44 / 48 | 700 | Welcome |
| Screen title | Outfit | 28 / 34 | 600 | Screen headings |
| Title L | Outfit | 20 / 26 | 600 | Card titles |
| App bar title | Outfit | 19 / 24 | 600 | Top app bar |
| Lead | Inter | 20 / 28 | 400 | Intro text |
| Body | Inter | 16 / 24 | 400 | Default |
| Body M | Inter | 14 / 21 | 400 | Dense lists |
| Section label | Inter | 12 / 16, uppercase, tracked | 600 | Section headers |
| Helper / source | Inter | 12 to 13 / 17 to 18 | 400 | Hints, source lines |

## Spacing, shape and elevation

Table: Layout, shape and elevation tokens

| Aspect | Value |
|---|---|
| Content width | max 640 px, centred; 16 px side gutter; works from 360 px (NFR-025) |
| Spacing | 8 px base: gaps of 8, 10, 14, 16 px; 110 px bottom padding under the navigation bar |
| Corner radius | `--r-s` 10, `--r-m` 16, `--r-l` 22 (cards), `--r-xl` 28 (hero art); buttons and chips fully rounded |
| Elevation | `--shadow-1` (cards), `--shadow-2` (raised cards, floating bars), `--shadow-brand` (filled buttons) |
| Motion | `cubic-bezier(.2,.8,.2,1)`; press feedback scale .97; tab indicator spring; all disabled under reduced motion |
| Safe areas | `env(safe-area-inset-*)` on Welcome, navigation bar, composer and selection bar |

## Components

Table: Component catalogue

| Component | Specification | Where |
|---|---|---|
| Top app bar | Sticky, 60 px, **solid** `--bg` (scrolled text never shows through the title); Back or logo, title, avatar link to Me | All main screens |
| Navigation bar | Floating, fixed 12 px from the edges above the safe area; 5 equal items (icon 22 px + label); animated pill on the selected item; `aria-current="page"`; count badge on Journey | Main app |
| Card | `--surface`, radius 22, shadow-1, 16 px padding; `raised` and `aurora` variants | Everywhere |
| Band pill | Pill with text label (*Very likely*, *Possible*, *Unlikely*, *Out of range*, *Not enough data*; codes SAFE, LIKELY, REACH unchanged) in band colours; never colour alone | Courses, detail, Ask, My list |
| Band ring | 116 px donut of Very likely / Possible / Unlikely counts with a legend of numbers | Paths |
| Band meaning | One helper line under the *Courses* tabs giving the selected band's meaning (BR-037), hidden while searching | Courses |
| Fact list | Card of label and value pairs; each value with its caveats as helper lines and a small source link "UGC Statistics 2024, Table *t*, p.*n*" | Course detail (University facts) |
| Buttons | Filled (gradient, 48 px), tonal, white, text (44 px), block (56 px full width); pressed scale .97; disabled 40% opacity | Everywhere |
| Chips | 40 px pill, outline; selected = `aria-pressed`/`aria-checked` filled brand; small chips 34 px | Subjects, interests, Ask suggestions, source chips |
| Text fields | Label above (`.field`), helper below, error text after interaction | Account, About you |
| Lists | `list-card` with rows; My list rows have position number, main text, drag grip (44 × 52) and remove | Courses, My list, routes |
| Selection bar | Sticky above the navigation bar: count, Add to my list / Compare / Remove, Cancel; with more than 3 ticked, Compare is off and a note floats above the bar | Courses, My list |
| Tip box | Tinted box with a lightbulb icon, a bold lead and the steps | Courses, My list |
| Added confirmation | Green pop-up with a tick near the bottom of the screen (white on #0B7A4B, about 5.2:1), announced by a live region, gone after about 2.5 s: "Added 3 courses to My list.", plus how many were already there or a full list | Courses, course page, My list |
| Menu button | Glass 44 px button with the menu icon: opens and collapses the side menu | Top app bar, 1024 px and wider |
| Composer | Sticky above the navigation bar: rounded input (48 px) and round 48 px send button | Ask, Group room |
| Chat bubbles | Question right (brand gradient), answer left; group messages with avatar, name, senior badge | Ask, Groups |
| Avatars | 12 preset plain head-and-shoulders silhouettes, each in its own colour family (own artwork, no licence or credit; VR2), or initials on a steady colour; decorative (`aria-hidden`) | Top bar, Me, Groups |
| Skeleton | Grey placeholder blocks while loading | Lists, Compare, Groups, Journey |
| Alert | `info`, `warn`, `error`, `gold` boxes with `role="status"` or `role="alert"` | Order warnings, errors |

# Screen specifications

States use these meanings. **Loading**: data not yet arrived. **Empty**: nothing to show yet. **Error**: a
request failed. **Offline**: the phone has no connection; the cached app shell still opens (service worker),
API calls are never served from cache.

## Welcome, Intro and About you (onboarding)

Table: Welcome, Intro and About you (onboarding): specification

| Aspect | Specification |
|---|---|
| Purpose | Choose a language, understand what ZedPath does, give results once (US-101, US-105) |
| Content | Welcome: aurora background, logo, lead line, three language tiles (සිංහල, தமிழ், English), Start and Log in, and a tonal **Try the demo, no sign-up** button (CR-007), team line. Intro (VR2): seven slides, each an animated scene of the real app marked *Example*: (1) every path you can reach, as a hub; (2) your real chances, a ring of Very likely / Possible / Unlikely; (3) every fact has a source, a cut-off with its handbook page; (4) order your list, the warning when a Very likely course sits above one wanted more; (5) Ask in your language, a sports-medal question answered "It depends" with handbook p.166; (6) never miss a date, Journey steps and *Open now*; (7) ask students who have been there, a group with a senior. Swipe, Back, Skip and 24 px dots; fits 320 px in all three languages. About you: five steps, one per screen: stream, district, Z-score, subjects and grades (searchable), beyond grades (achievements and interests) |
| States | Error: shown under the field only after Next (`role="alert"`). Demo mode: a label above the form says the data is a sample. Try the demo: the button reads "Opening the demo…" while busy; an error (for example "The demo is busy") appears under it (`role="alert"`) |
| Interactions | Language applies at once to the whole app; steps slide left or right; Back keeps answers |

## Account (sign up, log in, recover, recovery code, complete your account)

Table: Account (sign up, log in, recover, recovery code, complete your account): specification

| Aspect | Specification |
|---|---|
| Purpose | A compulsory account with contact details and consent (US-106, US-107, US-109; CR-003) |
| Content | Username, password; full name, email, Sri Lankan mobile, date of birth, each with its purpose; consent box. Recovery code shown once with copy and "I saved it" |
| States | Error messages from the server (`role="alert"`); offline is never treated as "no account"; an expired session opens Log in (VR2) |
| Interactions | After sign-up the student goes straight to About you; a senior goes to Groups; after *Try the demo* the visitor goes straight to Paths. Demo mode never prefills a password (CR-010) |

## Paths (home)

Table: Paths (home): specification

| Aspect | Specification |
|---|---|
| Purpose | One view of every path the results reach (US-201, US-203, US-501) |
| Content | Aurora summary card with the band ring and "See courses"; hidden-courses bar with count and "See why"; My list entry; other-route tiles (private, job exams, vocational, abroad) with counts and "Open now" pills |
| States | Loading: ring and tiles disabled; Error: message from the API; Empty route group: tile disabled |
| Desktop | Dashboard (see Desktop layout); the install button reads "Install ZedPath on this device" |

## Courses

Table: Courses: specification

| Aspect | Specification |
|---|---|
| Purpose | Browse courses by band (US-203, US-209, US-305) |
| Content | Tabs **Very likely / Possible / Unlikely** (`role="tab"`; codes SAFE / LIKELY / REACH) with the selected band's one-line meaning under them (VR2); the tabs wrap instead of widening the page in Sinhala and Tamil; search across all bands (names, short forms, Uni-Codes); rows with course, institution and band pill; Compare link |
| States | Loading skeleton; empty search result message |
| Interactions | Tap opens the course; **press and hold** starts selection; one selection spans all three tabs; selection bar with the count as a badge: Add to my list, Compare (up to 3: with more ticked, Compare is off and a line above the bar says why, VR3); a highlighted tip box (lightbulb icon, bold lead, steps) explains selecting several |

## Course detail

Table: Course detail: specification

| Aspect | Specification |
|---|---|
| Purpose | Everything about one course, sourced (US-204, US-206, US-208, US-210, US-211) |
| Content | Band pill and explanation; **needs vs you have** (each entry rule against the student's subjects); cut-off chart for the student's district with the value on every point; intake, duration, aptitude test; "What you'll study" syllabus by year with its source page; source lines. **University facts** card (CR-008): heading, the line "From the UGC report *Sri Lanka University Statistics 2024*", then up to five facts for the course's institution: students admitted (2023/24, whole university), undergraduates studying here (2024), permanent hostel places (end of 2024) with "Enough for *p*% of undergraduates", graduates in 2024; each fact shows its caveats ("2024 figures are provisional", "Some faculties did not submit figures, so this is a lower count") and its source link to the table and page. **Aptitude test** card (CR-009), only for the 24 offerings with a test: what the test is; "Last intake (2025/2026)" or "This intake" with applications opened or closed, and the test held or due, each with its date; for a past intake, "Dates for the next intake are announced by the university"; a link "Official notice: *university*"; for a joint practical test, the line that it can be sat at any one of the listed universities, with each notice |
| States | Facts card hidden when the report has no figure for the institution; a value the report did not receive is never shown as zero; aptitude card hidden for a course without a test |
| Interactions | Add to My list or "On your list (#n)"; Compare; Follow (adds the course to the Journey) |
| Desktop | Two columns (see Desktop layout) |

## Compare

Table: Compare: specification

| Aspect | Specification |
|---|---|
| Purpose | Up to three courses side by side (US-207) |
| Content | Columns per course: chance, cut-off history, entry rules, duration, places, selection basis, aptitude test; "+" column to add another: it opens the course picker above the table and scrolls to it, and the new column lines up beside the row labels; the table leaves room at its end so no column is half-hidden under the labels (VR3) |
| States | Loading skeleton per column; nothing estimated here, every value comes from the course API |
| Interactions | Columns swipe sideways (scroll snap per course); "+" opens a picker (search your courses or pick from My list) |

## My list

Table: My list: specification

| Aspect | Specification |
|---|---|
| Purpose | The ordered preference list for the UGC form (US-301 to US-303, US-305) |
| Content | Numbered rows with band pills; how many eligible courses are still left out; order notes as information, never a re-order (BR-041, BR-042; CR-011 removed "Fix the order"); a **What you need to know** card at the bottom with six UGC rules, each citing its handbook page; Copy Uni-Codes; a dashed **+ Add a course** box below the last course opens the same course picker as Compare (your own courses, searchable), so courses can be added without leaving My list (23 October) |
| States | Empty: invitation to add courses from Paths; warnings use `role="status"` |
| Interactions | Drag by the grip, or focus the grip and use Arrow Up / Down; Fix the order previews and applies only after confirmation; press and hold or "Select" for selection, then **Compare in the order chosen** (max 3) or Remove |

## Journey

Table: Journey: specification

| Aspect | Specification |
|---|---|
| Purpose | The student's own checklist and dated deadlines (US-401 to US-411, US-503) |
| Content | Tabs **My steps** and **Open now**. My steps: progress bar, steps (results, list, compare, aptitude tests, deadlines, apply to the UGC with its handbook quote), followed courses and notices. Open now: official notices with closing dates, each showing whether the student meets the A/L and age rules (checked on the phone) |
| States | Loading skeleton; **locked step**: shows the official rule instead of a date while the UGC has not announced it; Empty: how to follow courses and notices |
| Interactions | Tick a step only inside its window (server-checked); "I applied" after a notice opens; reminders as phone notifications (Android app) or a calendar file |

## Ask ZedPath

Table: Ask ZedPath: specification

| Aspect | Specification |
|---|---|
| Purpose | Cited answers in the student's language (US-601 to US-607) |
| Content | Five **personalised suggestion chips** (chances, best achievement against the reach course, interests, common questions; `src/ask-suggest.ts`); answer card: **verdict chip** (Yes / No / It depends / Not in official sources), lead and bullets with "Show more", band pills checked against the student's results, next-step actions, **source chips** with page numbers, two follow-ups, Helpful / Report a wrong answer |
| States | Thinking: `role="status"`; Error: `role="alert"` with retry; AI unavailable: core browsing still works (NFR-040) |
| Interactions | Composer pinned above the navigation bar; question sent with the interface language |

## Groups, Group room and Group info

Table: Groups, Group room and Group info: specification

| Aspect | Specification |
|---|---|
| Purpose | "Don't decide alone": a group per target course and per A/L batch (US-704 to US-708) |
| Content | WhatsApp-style chat list (my groups, groups for courses on My list, popular groups); room with bubbles, avatars, names, senior badge; labelled sample conversations; group info: description, rules, members, Exit group |
| States | Loading skeleton; errors `role="alert"`; reconnecting `role="status"` (only after three failed tries is the connection reported lost) |
| Interactions | **Rules accepted once per account** at the first join (server-enforced); tap the group name for info; report and block; phone numbers and emails refused |

## Me

Table: Me: specification

| Aspect | Specification |
|---|---|
| Purpose | The student's own settings (US-102, US-108, US-110) |
| Content | Avatar picker (12 silhouettes, `radiogroup`-style selection), profile summary and edit, language, **notification settings** (7-day / 1-day reminders, 8 am / 6 pm, badge count; defaults = previous behaviour), contact details, log out, delete account. A demo account shows the note "Demo account with a sample student. Groups are read-only, and it is deleted 24 hours after you opened it" (CR-007) |
| Interactions | Delete asks for confirmation and removes every server row (cascade). A failed log-out shows "Could not log out: check your connection and try again. You are still logged in." (`role="alert"`, CR-010). *Log out and clear this phone* and *Delete everything on this phone* also switch demo mode off |

# Interaction patterns

Table: Shared interaction patterns

| Pattern | Behaviour | Why |
|---|---|---|
| Press and hold to select | About 450 ms hold starts selection, with a short vibration; moving more than 10 px cancels (it was a scroll); the click after a hold is swallowed; the long-press menu is suppressed (`src/hold.ts`). A visible "Select" button offers the same without holding | Familiar from messaging apps; reviewed in the walkthrough video |
| Selection order kept | My list Compare opens courses in the order they were picked | The student's priority is preserved |
| Optimistic updates | Journey ticks, follows and "I applied" show at once and are undone with a message if saving fails | Feels instant on 3G |
| Reconnect | Group rooms ping every 25 s and reconnect on their own (1, 2, 4 ... up to 15 s) (NFR-043) | No "Disconnected" on a flaky network |
| Locked steps | A step whose official date is not announced is shown locked with the rule; never an invented date | Trust (DP-1) |
| Validate after interaction | Errors appear after Next or Submit, not while typing | Less anxiety for first-time users |
| Deep links | `#/ask/<question>`, `#/course/<code>` and notification links open the right screen; Back works. *Revised (CR-010):* `#/ask/<question>` only fills the question box; nothing is sent until the student taps send | Sharing and reminders; a link must never spend the student's daily questions |
| Demo mode | `?demo=kasun` (off by default) prefills About you and the sign-up details, but never a password (CR-010), with the sample student for recordings; labelled as sample; cleared when the phone is cleared | Gate 3 video; real students always see empty forms |
| Try the demo | One tap on Welcome opens a private demo account with the sample student; groups can be read but not posted to; deleted after 24 hours (CR-007) | Judges and students see the app working without signing up |

# Content and language

Table: Content rules

| Rule | Specification |
|---|---|
| Tone | Plain, calm, second person; short sentences; no jargon; never promises admission ("Likely", not "you will get in") |
| Languages | English source strings with Sinhala and Tamil dictionaries (`src/i18n`); TypeScript refuses a missing key; a test checks placeholders, bold tags and script. Marked in-app as AI translation pending native review |
| Official text | Course and university names, handbook quotes and Gazette notices stay in English as published; Sinhala and Tamil screens say so |
| Numbers | Every cut-off, intake and date shows its source (handbook page or notice); digits stay Western; tabular figures |
| Sample data | Sample conversations and demo data are labelled "Sample"; sample messages cannot be reported |
| Band names | *Very likely*, *Possible* and *Unlikely* in every sentence and all three languages (VR2); never "Safe" or "Reach" in the interface |
| Statistics | University facts are quoted as printed, with the report's caveats; "Information not submitted" is shown as no number, never zero (CR-008) |
| Errors | Say what happened and what to do next, in the interface language |

# Accessibility checklist (WCAG 2.2 AA)

Contrast was measured from the colour tokens with the WCAG relative-luminance formula on 11 October 2026.

Table: Accessibility checklist and status

| Check | Criterion | Status |
|---|---|---|
| Body text contrast | 1.4.3 | Pass: ink on background 16.9:1; secondary text 7.6:1; white on primary 8.9:1; links 5.7:1 |
| Helper text contrast (`--ink-3` #7A8396) | 1.4.3 | **Gap**: 3.8:1 on white, 3.5:1 on background (needs 4.5:1 for 12 to 13 px text). Action: darken to about #646D80. Dark theme passes (5.5:1) |
| Band pill contrast (light) | 1.4.3 | **Gap**: Safe 3.1:1, Reach 3.5:1, Likely 4.3:1, Out 4.4:1 at 12 px bold; Not enough data passes (5.2:1). Action: darken the band ink colours. Dark theme passes (6.5 to 8.8:1) |
| Colour not the only cue | 1.4.1 | Pass: every band pill carries a text label |
| Touch targets | 2.5.8 (24 px min); NFR-022 (48 dp) | Pass for 2.5.8. Buttons 48 px, icon buttons 44 px, nav items 52 px, grips 44 × 52, intro dots 24 px (VR2). **Gap against NFR-022**: chips 40 px, small chips 34 px |
| Focus visible | 2.4.7, 2.4.11 | Pass: 3 px outline on `:focus-visible` everywhere |
| Keyboard | 2.1.1 | Pass: list reorder by Arrow keys on the grip; "Select" button alternative to press and hold |
| Names and roles | 4.1.2 | Icon buttons have `aria-label`; tabs use `role="tab"` and `aria-selected`; navigation uses `aria-current`; chips use `aria-pressed`/`aria-checked` |
| Status messages | 4.1.3 | `role="status"` for warnings and progress, `role="alert"` for errors |
| Decorative images | 1.1.1 | Avatars, logo and icons are `aria-hidden` (the name is shown beside them) |
| Reduced motion | 2.3.3 | All transitions and animations off under `prefers-reduced-motion` |
| Reflow | 1.4.10; NFR-025 | Pass: single column, max 640 px, from 360 px without horizontal scroll |
| Language | 3.1.1 | `lang` attribute is "en"; **gap**: not updated when Sinhala or Tamil is chosen. Action: set `document.documentElement.lang` |

The gaps are logged for the next design iteration; none blocks a flow.

# Performance budget for 3G

Table: Performance budget

| Measure | Budget | How the design meets it |
|---|---|---|
| First screen interactive (Fast 3G, mid-range Android) | 3 s (NFR-001) | Static SPA from Cloudflare static assets (no Worker on page loads, NFR-012); service worker caches the shell and hashed assets |
| Results shown after About you | 2 s (NFR-002) | One `POST /results` call; skeletons while waiting |
| Initial JavaScript | 200 KB compressed (NFR-006) | Single bundle; icons from one tree-shaken set; no images on the critical path except SVGs |
| API response | 500 ms p95 (NFR-003) | ETag revalidation on the API; API responses are never cached by the service worker, so data is always current |
| Fonts | Text visible at once | `preconnect` to the font host; `display=swap`, so system fonts show until the web fonts arrive |
| Ask | First answer within 4 s p95 (NFR-004) | "Thinking" status; the rest of the app does not depend on Ask (NFR-040) |

# Usability evidence

The design changed after evidence from users and the product owner's review videos. The data side of each change is
recorded in the ZP-DOC-05 revision rows; the story side in ZP-DOC-02.

Table: Changes driven by usability evidence

| Change | Evidence | What changed in the UI |
|---|---|---|
| CR-001 | Product owner's change request (5 Oct): the profile should follow the student between devices | Optional account, recovery code screen |
| CR-002 | Product owner's GO (11 Oct), building on the deadline and "ask a senior" needs in ZP-DOC-02 | Journey, Alerts, Groups; five-tab navigation |
| CR-003 | Product owner's decision (contact for reminders, consent law) | Compulsory account with four details, each with purpose and consent |
| CR-004 | Review: "AI replies are not formatted well" | Ask answer card: verdict chip, bullets, source chips, actions, feedback |
| CR-005 | Walkthrough video 2 (8 min 50 s): "groups should have rules", "WhatsApp-style groups" | Rules sheet, WhatsApp-style list and room, labelled samples; Ask box pinned to the bottom; cut-off values on chart points; Compare columns swipe with "+" |
| CR-006 | Product owner's decisions of 11 Oct after review | Rules accepted once, group info page, avatars, rooms that reconnect, My list selection with Compare, Journey ticks within window, Alerts moved into Journey as "Open now" |
| Other review fixes | Same review round | Solid top app bar (scrolled text showed through the title); "Sit the A/L again" removed; press-and-hold multi-select on Courses; test-notification button removed from Me |
| VR2 | Product owner's review and decisions of 14 Oct | Bands renamed *Very likely / Possible / Unlikely* (his choice of four options) with a one-line meaning under the tabs; intro guide rebuilt to seven slides with app scenes; avatars redrawn as plain silhouettes in 12 colours (same codes a01 to a12); expired session returns to Log in; intro scene styles scoped so they no longer narrowed the Courses and Groups lists; one selection across the Courses tabs |
| CR-007 | Product owner's decision (15 Oct): a demo without sign-up, a private copy per visitor | *Try the demo, no sign-up* on Welcome; demo note in Me |
| CR-008, CR-009 | Product owner's decisions (15 Oct) | University facts card and Aptitude test card on the course page; NVQ ladder text on the University of Vocational Technology route |
| CR-010 | Security audit run-1 (15 Oct) | Ask links only fill the box; no prefilled demo password; failed log-out reported; the next student on a phone starts clean |
| CR-011 | Product owner's check of how selection works (23 Oct): "students fill it using their preference only … we can't tell that it's wrong order" | Order notes reworded as information; "Fix the order" removed; What you need to know |
| VR4 | Product owner's screen recording, 23 Oct: "we need a rectangle with a plus below the last one", "a green thing with a tick mark that they have been added" | + Add a course box on My list; added confirmation |
| VR3 | Product owner's review, 18 to 21 Oct, on a phone and a 1870 px desktop: "the plus button not working", "the note should be more obvious", "can we only select up to 3?", "ZedPath should be on the corner", "looks emptier than it should be", "the left menu should be collapsible with a glassmorphic hamburger", "on your phone is not relevant on desktop" | Compare picker and columns fixed; tip box; Compare limit message; desktop layout with the logo in the corner, Paths dashboard, two-column course page and a collapsible side menu; install button says "this device" |

# Traceability

Table: Traceability from requirements to this document

| Requirement or story | Section of this document |
|---|---|
| NFR-001 to NFR-006, NFR-012 | Performance budget for 3G |
| NFR-020 | Personas and key journeys (J1 to J4) |
| NFR-021, NFR-022, NFR-025 | Accessibility checklist |
| NFR-023, NFR-024, US-105 | Typography; Content and language |
| NFR-040, NFR-043 | Ask ZedPath; Interaction patterns |
| US-101 to US-112 | Welcome, Intro and About you; Account; Me; Guards |
| US-201 to US-211 | Paths; Courses; Course detail; Compare |
| US-508 | Paths (other routes) |
| US-908, AC-601.3 | Interaction patterns (Deep links); Me |
| US-301 to US-305 | My list; Interaction patterns (press and hold) |
| US-401 to US-411, US-501 to US-503 | Journey; Paths (other routes) |
| BR-037 (band names) | Components (band pill, band meaning); Courses; Content and language |
| US-601 to US-607 | Ask ZedPath |
| US-704 to US-708 | Groups, Group room and Group info |
| Trust rules (CLAUDE.md) | Design principles DP-1 to DP-4; Content and language |
