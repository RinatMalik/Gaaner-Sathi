# Gaaner Sathi (গানের সাথী): project kickoff

You are taking over a working prototype and turning it into a published web app, and later a mobile app. Read this whole prompt, then `docs/NOTATION.md`, `docs/ENGINE.md` and `docs/DATA.md` when you need their detail. The app is called **Gaaner Sathi** (গানের সাথী, "singing companion"). The prototype is `reference/gaaner-sathi.html` (one self-contained file, about 2,300 lines). Its test suites run with `reference/tests/run-all.sh` and are all green today (69 tests, 12 validated exercises). Run them before you change anything.

## 1. Why this exists

Rinat sings Bengali songs and practises from handwritten swaralipi (Bengali akarmatrik notation) in diaries he has kept since his teens. He used to practise on a Casio CT-X3000 set to a harmonium tone, with its rhythm running, reading which keys to press from the diary. Keeping track of the keys pulled his attention away from singing. He wants to focus on his voice. He also prefers hearing the actual melody notes as a pitch guide over a full backing track, because the notes tell his voice what to match.

The prototype solves that. Type the notation once, and it plays the melody on harmonium with tabla, dholak or drums and a drone. Everything runs on one clock, so the rhythm can never drift from the melody. It highlights the beat you are on, with the lyric underneath.

**The goal:** a published web app first (installable, works offline), then iOS and Android apps. The best practice companion for singers who learn from swaralipi.

## 2. How to work with Rinat

- **Build proactively.** For substantial work, go ahead and build. Rinat does not want plans to approve first; he likes seeing finished, working steps. Stop and ask only for:
  - anything irreversible;
  - anything that costs money or creates accounts (domains, hosting, app stores, paid APIs, sample libraries);
  - the decisions marked **Ask Rinat** below.
- **Prefer low-maintenance, set-and-forget choices.** Static hosting, no server to run for v1, automatic deploys from the main branch, few dependencies.
- **Fit the co-working framework** this prompt is pasted alongside. Keep a short, always-loaded context (goal, current phase, decisions, next step) and keep specs in `docs/` to read on demand. Record each real decision as a short ADR.
- **UK English** in the interface ("practise" as the verb, "colour"). Bengali text must be correct; when unsure, ask Rinat rather than guess.
- **Nobody on the build side can hear the app.** Verify every audio change by measurement: offline renders in headless Chromium for loudness, autocorrelation for tuning, decay curves, timing logic as pure tests. Then ask Rinat for specific listening feedback ("is the tanpura too buzzy or too plucked?").
- **At each milestone, tell Rinat what changed, what you tested, and what he should try.** Give him a preview link he can open on his phone.

## 3. What the prototype already does (reach parity before adding)

**Notation**
- Bengali akarmatrik or Sa Re Ga letters.
- Komal and tivra notes, three octaves (marked with রেফ, `.`, হসন্ত or `'`).
- Holds, rests, uneven subdivisions.
- Several notes in one beat: written together without a space. Fixed today: the আকার no longer splits a beat.
- Bars, lyric lines (several verses), headings, pickups (`startOn`).

**Editor**
- Live preview: tap a beat to select it.
- ↑/↓ octave fix (Alt+↑/↓), Join and Split beats.
- Palette that inserts notes, holds, bars and lyric lines.
- Checker with Show and Fix buttons: bar lengths against the taal, likely octave slips, unreadable characters.

**Playback**
- Six taals: Dadra, Keherwa, Rupak, Jhaptal, Ektal, Teentaal.
- Rhythm styles: tabla theka, dholak, drum kit, click.
- Speed Half, Normal or Double; fills every 4th cycle.
- Percussion layers. Tabla and dholak: manjira, kartal, ghungroo, shaker, tambourine. Drums: shaker, tambourine, claps, cowbell, congas, ride.
- Harmonium guide at 1, 2 or 3 reeds (bass, male, female), loudness-matched. Guide level Full, Soft or Off.
- Drone: tanpura (Karplus-Strong with a jawari bridge; 1st string Pa, Ma or Ni) or a harmonium Sa–Pa drone.
- Sa set to any key and octave, with the matching CT-X3000 key shown.

**Practice**
- Play from any line; loop line A to line B.
- Count-in of one cycle.
- Guide on repeats: every round, first only, or every other round (call and response).
- Tempo trainer: faster each round, up to a set ceiling.
- Big "now singing" panel with the next four beats and a live taal strip.
- Space bar plays and stops; screen wake lock while playing.

**Songs and files**
- Each song is its own record.
- Export one song or a full backup as JSON; import JSON or `.txt`.
- 12 built-in original exercises and alankars, plus a Sa Re Ga typing example.

**Look and feel (keep this identity)**
- A rosewood harmonium "deck" with a brass play button.
- The song shown on a ruled diary sheet with a red margin line: notes in ink, lyrics in red ink, like Rinat's diaries.
- Fonts: Tiro Bangla for notes and display, Hind Siliguri for the interface.
- Light and dark themes; usable at 360 px wide.

**Specific to claude.ai, to remove:** `window.claude.use('db')` (song storage) and `window.claude.use('downloads')` (file saves). See `docs/DATA.md`.

## 4. Constraints


- **Privacy.**
  - Local-first, no account needed.
  - Nothing leaves the device unless the user chooses to export or sync.
  - Microphone audio is processed on the device and never uploaded.
- **Accessibility.** Fully usable by keyboard, visible focus, `prefers-reduced-motion` respected, sufficient contrast in both themes, labelled controls.
- **Performance.** No audio glitches on a mid-range Android phone. The parser and checker run on every keystroke and must stay fast on 500-beat songs.

## 5. Target architecture (defaults; change them with an ADR if you have a better reason)

- **Stack:** TypeScript, Vite, React. Vitest for unit tests, Playwright for end-to-end tests and offline audio renders.
- **Pure core with no DOM**, so it runs in Node, the browser and a Worker:
  - `notation`: parser, edit operations, checker;
  - `taal`: taals, rhythm tables, layers, fills;
  - `exercises`: the generator and its data.
- **Audio:** an engine with the lookahead scheduler and the instruments (synth now, samples later), behind one interface so instruments can be swapped.
- **Storage:** IndexedDB (Dexie or idb), the same song JSON as the export format, saves debounced on edit, and a migration layer.
- **App:** the UI, with i18n ready from day one (English first; a Bengali interface later).
- **PWA:** offline and installable; the service worker caches the app (and later the sample packs).
- **Hosting:** static (Cloudflare Pages or Netlify), deploys from main, a preview deploy per branch.
- **Mobile, later:** Capacitor wrapping the same web build.

## 6. Roadmap and done criteria

### Phase 0: foundation and port
- Repo, CI, hot and cold docs, ADR-001 (stack).
- Port the core to TypeScript, moving the reference suites across one-for-one first, then adding cases.
- Port the rhythm tables and the tanpura string model with their tests.
- Build the audio engine and the UI to parity, using a side-by-side checklist built from section 3.
- **Done when:**
  - every reference test passes against the new core;
  - the exercises check clean;
  - each feature in section 3 works in the new app;
  - a preview deploy is live.

### Phase 1: publish the web app
- PWA offline and installable, IndexedDB storage, import and export.
- A first-run screen that opens on an exercise, so the app never looks empty.
- A privacy note; error reporting that sends no song content.
- Do roadmap item 2.5 (per-song sound settings) here, because it changes the data model and is cheapest before real users have data.
- Rinat moves his songs across: "Back up all my songs" in the prototype, then Import in the new app.
- **Done when:**
  - a public URL is live;
  - Lighthouse PWA and accessibility checks pass;
  - it works offline;
  - Rinat has practised a full song on his phone and laptop.

### Phase 2: the practice features Rinat asked for, in this order

1. **Pitch feedback from the microphone.** This is the biggest one. (It could not run in the prototype because claude.ai blocks the microphone.)
   - **Capture:** `getUserMedia` with echo cancellation, noise suppression and auto gain **off** (they distort pitch).
   - **Detection:** a pitch detector (YIN or McLeod/MPM; the `pitchy` library implements MPM; check its licence first) in an AudioWorklet. Frames long enough for low male notes, down to about 80 Hz. About 40 readings per second.
   - **Expected note:** compare each reading with the note the notation timeline expects at that moment, in cents from the song's Sa. Offer an "any octave" mode.
   - **Live display:** cents off on a ±50 scale, in tune within ±15 cents, and how steady each held note is.
   - **Scores:** per note and per line, combining pitch accuracy and onset timing.
   - **Latency:** calibrate round-trip latency (play a click, detect it, store the offset).
   - **Headphones:** recommend them, because the guide leaks into the microphone otherwise. Score the "your turn" rounds of call and response, which have no guide.
   - **Takes:** record a take (MediaRecorder), store it locally, play it back against the guide, and let the user delete it.
2. **Recorded instruments** instead of synthesis.
   - Sampled harmonium (per reed), tabla bols retuned to Sa, dholak, tanpura strings and the percussion layers.
   - Keep the synth as a fallback.
   - Lazy-load sample packs and cache them offline.
   - Track every licence in `assets/LICENCES.md`. Do not sample the Casio's built-in voices.
   - **Ask Rinat** where the recordings come from: real instruments he records, or CC0/CC-BY packs.
3. **Ornaments in the notation:** meend (glide), kan swar (grace note), andolan, murki, khatka.
   - Parser, renderer (an arc over the meend, a small superscript for kan) and playback (pitch glides on the guide).
   - **Ask Rinat** for diary photos showing how he marks these, and match his conventions.
4. **Daily riyaz routine and practice log.**
   - Chain exercises and songs, each with its own tempo, loops and guide mode, and run the session hands-free.
   - Log the date, duration, items, tempo reached and pitch scores.
   - History and streak views, with export.
5. **Per-song sound settings** (done in Phase 1, see above). Rhythm style, speed, layers, fills, reeds, drone type and tuning, and guide mode are saved with the song. Device settings are the fallback. These become optional fields in the export format.

**Smaller items, when they fit:**
- A stage view: a full-screen note and lyric you can read from a music stand.
- A Bengali interface.
- More taals (for example Deepchandi, Dhamar, Jhumra, Khemta).
- An on-screen keyboard showing the CT-X3000 key for each note, for when Rinat wants to play along.

### Phase 3: accounts and sync (only if Rinat wants it; ask before starting)
- Optional sign-in to sync songs and the practice log across devices: Supabase, or similar, with edits resolved by `updatedAt`.
- Still works fully without an account.

### Phase 4: mobile apps
- Capacitor builds for iOS and Android from the same code.
- Native microphone permission and audio session (play while the ringer switch is silent), background audio during a routine, store listings.
- **Ask Rinat** before creating developer accounts.

## 7. Decisions to ask Rinat about (with the default if he has no view)

1. **Lower octave in written notation:** should the editor write `.` before the note (current) or হসন্ত after it? Default: keep reading both, write `.`.
2. **Conjuncts from phonetic keyboards** such as Avro: is `ম্প` lower Ma + Pa (current) or plain Ma + Pa? Default: unchanged until he decides.
3. **Ornament conventions** from his diaries (needed for item 3).
4. **Recording source and budget** for real instrument samples.
5. **Domain.** The name is decided: **Gaaner Sathi**, always spelled that way in Latin letters, with গানের সাথী shown alongside in Bengali in the app and the store listings so people find it whichever script they search in. Ask Rinat before buying a domain. Default hosting: Cloudflare Pages. A suggestion to offer him: call the song library inside the app "খাতা" (khata, notebook), after his diaries.
6. **Accounts in v1?** Default: no; local-first with export.
7. **Free, paid or donations?** Only matters before the app stores.

## 8. Definition of done for every change

- Core tests are green, and new behaviour comes with new tests.
- The exercise library still checks clean.
- Audio changes come with a measurement test.
- It works offline, in both themes, at 360 px wide with no sideways scrolling.
- There is a short changelog entry and a "what to try" note for Rinat.

## 9. Start now

1. Run `reference/tests/run-all.sh` and confirm it is green.
2. Read `docs/`, set up the repo and the framework's context files, and write ADR-001.
3. Begin Phase 0 with the core port. Report back when the ported core passes the reference suites, with a preview deploy if the UI is far enough along.
