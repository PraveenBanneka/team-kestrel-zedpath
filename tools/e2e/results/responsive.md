# E2E: responsive layout (local)

- server: local (http://localhost:8899, wrangler dev)
- ran: 2026-10-11T19:26:02.860Z
- viewports: 320x640, 360x800, 390x844, 412x915, 768x1024, 1280x800
- screens: Welcome, Create account, Paths, Courses, Course detail, My list, Journey (steps + open), Groups, Me; Sinhala at 320x640
- totals: 33 cases, 31 pass, 2 fail

## Failures

- **RSP-026** Sinhala at 320x640: Courses does not overflow: sw=336 iw=320; past right edge: button "උත්සාහ කළ හැකි 16" [234..336]; span "උත්සාහ කළ හැකි 16" [240..330]; span.count.num "16" [300..330]. The Safe/Likely/Reach tab strip (.seg, display grid, 273px wide) holds tabs of 112+94+102 = 308px, so the Reach tab sticks out to x=336; a horizontal scrollbar appears and pushes the nav up 15px. See responsive-si-courses-320.png
- **RSP-033** Sinhala bottom-nav labels readable at 320x640: labels fill each 53-55px slot edge to edge with 0px gap: "ගමන් මඟ" ends at x=178 and "කණ්ඩායම්" starts at x=178, so they read as one word; "මගේ ලැයිස්තුව" wraps to 2 lines (28px vs 14px). Not clipped (scrollWidth = clientWidth) but visually merged. See responsive-si-courses-320.png

## Cases

| ID | Area | Title | Trace | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| RSP-001 | No h-scroll | No horizontal scroll at 320x640 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 305 vs innerWidth 320) | PASS |
| RSP-002 | No h-scroll | No horizontal scroll at 360x800 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 360 vs innerWidth 360) | PASS |
| RSP-003 | No h-scroll | No horizontal scroll at 390x844 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 390 vs innerWidth 390) | PASS |
| RSP-004 | No h-scroll | No horizontal scroll at 412x915 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 412 vs innerWidth 412) | PASS |
| RSP-005 | No h-scroll | No horizontal scroll at 768x1024 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 768 vs innerWidth 768) | PASS |
| RSP-006 | No h-scroll | No horizontal scroll at 1280x800 (10 screens, English) | NFR-025 | scrollWidth <= innerWidth and no element past the right edge on every screen | all 10 screens OK (max scrollWidth 1280 vs innerWidth 1280) | PASS |
| RSP-007 | App bar | Create account: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.screen-title "Create your account" top >= 136px vs bar bottom 60px | PASS |
| RSP-008 | App bar | Paths: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1 "62 courses within your reach" top >= 118px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-009 | App bar | Courses: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.screen-title "62 courses within reach" top >= 72px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-010 | App bar | Course detail (023G): app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1 "Architecture" top >= 130px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-011 | App bar | My list: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.screen-title "My list" top >= 72px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-012 | App bar | Journey (steps): app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.screen-title "Your journey" top >= 72px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-013 | App bar | Groups: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.screen-title "Don't decide alone" top >= 72px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-014 | App bar | Me: app bar opaque, first heading not covered (6 viewports) | NFR-025 | bar background alpha 1; heading top >= bar bottom at scroll 0; bar still on top after scrolling to the end | sticky, bg rgb(244, 246, 251) alpha 1; h1.num "Z 1.4200" top >= 116px vs bar bottom 60px; bar owns its centre pixel when scrolled | PASS |
| RSP-015 | Bottom nav | Paths: bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.footer-note "Bands compare your Z-score wit"; min gap to nav 32px across viewports | PASS |
| RSP-016 | Bottom nav | Courses: bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item button.hidden-bar "166 courses hidden See why"; min gap to nav 32px across viewports | PASS |
| RSP-017 | Bottom nav | Course detail (023G): bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.footer-note "Some courses are not taught in"; min gap to nav 32px across viewports | PASS |
| RSP-018 | Bottom nav | My list: bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.helper "Paste them into the UGC online"; min gap to nav 32px across viewports | PASS |
| RSP-019 | Bottom nav | Journey (steps): bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.footer-note "Your Journey is saved to your "; min gap to nav 32px across viewports | PASS |
| RSP-020 | Bottom nav | Journey (open notices): bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.footer-note "Checked against official sourc"; min gap to nav 32px across viewports | PASS |
| RSP-021 | Bottom nav | Groups: bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item p.footer-note "Seniors with the verified badg"; min gap to nav 32px across viewports | PASS |
| RSP-022 | Bottom nav | Me: bottom nav visible, last item reachable above it (6 viewports) | NFR-025 | nav inside viewport; after scrolling to the end the lowest content element bottom <= nav top | last item button.btn.text "Log out and clear this phone"; min gap to nav 32px across viewports | PASS |
| RSP-023 | Buttons | Button labels not clipped (all 10 screens x 6 viewports) | NFR-025 | scrollWidth <= clientWidth for buttons, chips, tabs, nav links and their label spans | 0 clipped across 60 screen/viewport runs | PASS |
| RSP-024 | Buttons | Button text stays inside its button box (all screens x 6 viewports) | NFR-025 | no child box of a button extends past the button edges | 0 spills across 60 runs | PASS |
| RSP-025 | Sinhala 320 | Sinhala at 320x640: Paths does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-026 | Sinhala 320 | Sinhala at 320x640: Courses does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=336 iw=320; past right edge: button "උත්සාහ කළ හැකි 16" [234..336]; span "උත්සාහ කළ හැකි 16" [240..330]; span.count.num "16" [300..330]. The Safe/Likely/Reach tab strip (.seg, display grid, 273px wide) holds tabs of 112+94+102 = 308px, so the Reach tab sticks out to x=336; a horizontal scrollbar appears and pushes the nav up 15px. See responsive-si-courses-320.png | FAIL |
| RSP-027 | Sinhala 320 | Sinhala at 320x640: Course detail (023G) does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-028 | Sinhala 320 | Sinhala at 320x640: My list does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-029 | Sinhala 320 | Sinhala at 320x640: Journey (steps) does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-030 | Sinhala 320 | Sinhala at 320x640: Groups does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-031 | Sinhala 320 | Sinhala at 320x640: Me does not overflow | NFR-025 | lang=si; no horizontal scroll; no element past the right edge; no clipped button labels | sw=305 iw=320, 0 wide, 0 clipped, last item above nav=true | PASS |
| RSP-032 | Sinhala | Sinhala Courses band tabs fit at 360 and 390 | NFR-025 | no horizontal scroll | 360x800: sw=345 iw=360, 0 wide; 390x844: sw=375 iw=390, 0 wide | PASS |
| RSP-033 | Sinhala 320 | Sinhala bottom-nav labels readable at 320x640 | NFR-025 | each label has visible space from its neighbour | labels fill each 53-55px slot edge to edge with 0px gap: "ගමන් මඟ" ends at x=178 and "කණ්ඩායම්" starts at x=178, so they read as one word; "මගේ ලැයිස්තුව" wraps to 2 lines (28px vs 14px). Not clipped (scrollWidth = clientWidth) but visually merged. See responsive-si-courses-320.png | FAIL |

## Screenshots

- screens/responsive-course-detail-390.png
- screens/responsive-courses-390.png
- screens/responsive-my-list-768.png
- screens/responsive-paths-1280.png
- screens/responsive-paths-320.png
- screens/responsive-si-courses-320.png
- screens/responsive-si-me-320.png
- screens/responsive-si-paths-320.png
- screens/responsive-welcome-320.png
- screens/responsive-welcome-390.png

## Notes

- Server: local wrangler dev http://localhost:8899, Chromium via agent-browser (headless). innerWidth includes a 15px classic scrollbar, so documentElement.clientWidth = innerWidth - 15 (scrollWidth is compared to innerWidth as the task asked).
- Account: one local account (resp_1791745829) created via sign-up with the ?demo=kasun prefill, About you completed, 1 course (023G Architecture, Moratuwa) added to My list; deleted at the end (DELETE /api/me -> 204, then GET /api/me -> 401).
- Method: for each screen the hash route is set and the viewport resized, then a measuring script checks scrollWidth, elements past the right edge (outside overflow containers), app-bar background alpha and heading position, scrolls to the end and compares the lowest content element with the nav top, and checks button label scrollWidth vs clientWidth. Elements inside closed <details> and .sr-only text are excluded (the first pass flagged them as false positives: a table inside a closed details on Course detail, and the sr-only band word on course rows).
- Observation (not a fail of the stated checks): at 768 and 1280 the floating bottom nav is translucent, so tiles and badges under it show through (responsive-paths-1280.png).
- Observation: the Courses list shows university names as "Sabaragamuwa University of", "Uva Wellassa University of", "Wayamba University of", "Rajarata University of" (name reordered or cut). Data/label issue, not layout.
- Harness note: three agent-browser clicks did not register until the target was scrolled into view first (a course row, the Sinhala language chip, "Create account"). Hit-testing after scrollIntoView showed the element on top, so this is most likely the tool, not the app; not counted as a fail.
- Environment note: at the start port 8899 did not answer for about 4 minutes (several workerd processes listening on 8899). A private server on 8911 was started meanwhile and stopped unused once 8899 answered. All results are from 8899.
