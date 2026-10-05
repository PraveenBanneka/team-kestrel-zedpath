# Video lessons (read before scripting any ZedPath video)

Source: Praveen's lessons from building narrated app-guide videos on an earlier project (6+ review rounds),
handed over 2026-10-05. Generic rules are kept; the right column says how each applies to ZedPath.

## The bar
Presentable to a real client. The reviewer goes frame by frame. Machines judge motion and sound badly, so turn
them into things that can be read (transcripts, loudness numbers, contact sheets) and leave taste (voice warmth,
music, pacing) to Praveen. Ask with options when unsure; never guess on taste.

## Rules and how they apply here

| Rule | ZedPath adjustment |
|---|---|
| Verify every spoken claim against the code first (file:line fact sheet). Map every screen, gesture and alternative path. | Fact sheet in `video/FACTS.md`. Includes band rules (BR-030..036), counts the voice quotes, and every AI-assistant answer shown. |
| Show every action happening: typed letter by letter, lists narrowing, real scrolls, real taps. Never narrate a still. | District search is typed; the Z-score is typed; band tabs really switch; charts really draw. |
| When showing a picker, pick a different value than the one already shown. | Grades: choose a different grade than the default; tabs: move off the selected band. |
| Realistic, busy data; labels never clip. | One realistic student (Physical Science, Kurunegala, Z 1.4821, B/C/A). No real student's data. |
| Film in story order; later scenes show what earlier ones changed. | Profile entered once at the start; every later screen uses it. |
| Keep internal rules internal; explain user-facing safety in plain words. | Say "your details stay on this phone", not how banding margins work. |
| Prove refusals server-side before filming them. | Validation errors: check the API's 400 first. |
| Record the real app in a headless browser at a phone viewport with a CDP screencast; log every action with its DOM rect and timestamp. | 390 x 844 viewport, action log drives tap rings, boxes and voice sync. |
| Scroll targets into view before tapping; wait for the right signal after actions. | Hash-router SPA: wait for the target screen's own element, not a navigation. |
| Sample the LAST frame at or before t, never the nearest. | Same. |
| Kill every background recording run fully before re-filming. | Same. |
| Film a demo copy, never production; back up; net-zero; check every side effect. | ZedPath today stores nothing on the server and sends no notifications, so a local build is filmed (same code as live). Once accounts, reminders or push exist, film only on a staging copy with temp records and scoped clean-up. |
| Chain dependent steps with `&&`; never pipe a build into grep before a deploy; confirm the version id changed. | Same (also in the deploy runbook). |
| Bugs found while filming are fixed properly (tests, commit), not filmed around. | Fixes go through the normal GO-gated deploy. |
| Phone fills about 70% of the frame (about 732 x 1547 in 1080 x 1920; screen 700 wide). | Same. No fake notch. |
| No logo intro/outro; a short friendly end card. | End card: "You're all set!" plus a warm sign-off. |
| Highlight boxes: one category at a time, from the real DOM rect, clipped to the screen, never cutting text. | Same. |
| Tap rings from the real rect; a ring ends the instant the screen changes (no minimum lifetime). | Same. |
| Subtitles: no white strip; bold text with a soft glow; all words one colour; only the spoken word gets a pill. | Pill in brand blue or amber (theme), not the reference's salmon. |
| Calm pacing; anything the viewer must read needs voice time too. | Results screens get a beat of silence or extra words. |
| TTS per sentence, placed on the timeline; each action within 0.15 s of its cue word (asserted by the build). | Voice: edge-tts neural female voice (choice pending). |
| Whisper-check every sentence in ONE request; flags are leads, names go to the human's ears. | Groq Whisper. Known: US voices read "A/L" as "A slash L", so the script writes "A-L". Place names (Kurunegala) go to Praveen's ears. |
| Caption sync: trust the median offset. | Same. |
| UI tick sounds about 0.25 s before the cue word, never on its first consonant. | Same. |
| Measure loudness per second, clipping, silence, spectrogram. | Same. |
| QA loop each version: report (word match, sync, loudness, clipping, flash frames, freezes) + 1 fps contact sheets; read all; fix; send with "flags for your ears". | Same. Feedback as timestamp + note. |
| Render each frame from renderAt(t); parallel Chrome workers (6 on a 12-thread laptop). | Same (this laptop has 12 threads). |
| Phone copy under the transfer limit (about 30 MiB, CRF 23) plus a full-quality copy. | Same. |
| Don't call the AI by the provider's name. | The in-app assistant is never called "Gemini" on screen or in the voice (Praveen, 2026-10-05). |

## Preflight (tick before sending any version)
- [ ] every claim and gesture mapped from code
- [ ] side effects checked (none today); staging + net-zero plan once the app stores data
- [ ] realistic data, story order
- [ ] every action real motion, targets scrolled into view
- [ ] per-sentence TTS Whisper-checked
- [ ] every action within 0.15 s of its word
- [ ] phone about 70%, boxes from DOM, rings end on screen change, subtitles one colour
- [ ] 30+ stills reviewed before the full render
- [ ] QA report clean, every flag explained
- [ ] lessons from this round added below

## Round log
- 2026-10-05, voice samples: Ava, Emma and Jenny read "A/L" as "A slash L"; Sonia and Neerja say "A-L".
  Kurunegala transcribed four different ways (lead only; Praveen to judge by ear).
