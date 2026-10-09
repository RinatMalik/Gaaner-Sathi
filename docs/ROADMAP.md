# Roadmap and done criteria

> Cold reference: open it when planning or closing a phase. The current phase and the
> next action live in `CONTEXT.md` → Current state. Merged from the handover kickoff
> (§6) on 2026-10-09; the original kickoff is in git history (commit `e0ea8d8`).

**The goal:** a published web app first (installable, works offline), then iOS and
Android apps. The best practice companion for singers who learn from swaralipi.

## Phase 0: foundation and port ◀ current

- Repo, CI, hot and cold docs, ADR-001 (stack).
- Port the core to TypeScript, moving the reference suites across one-for-one first,
  then adding cases.
- Port the rhythm tables and the tanpura string model with their tests.
- Build the audio engine and the UI to parity, using the side-by-side checklist in
  `docs/PARITY.md` (built from the prototype's feature list).

**Done when:**
- every reference test passes against the new core;
- the exercises check clean;
- each feature in `docs/PARITY.md` works in the new app;
- a deploy is live. *(The kickoff said "a preview deploy". This project uses `main`
  only, so this means the deploy from `main`. The host is still to be chosen; see
  `CONTEXT.md` → Open questions.)*

## Phase 1: publish the web app

- PWA: offline and installable; IndexedDB storage; import and export.
- A first-run screen that opens on an exercise, so the app never looks empty.
- A privacy note; error reporting that sends no song content.
- Do roadmap item 2.5 (per-song sound settings) here, because it changes the data
  model and is cheapest before real users have data.
- Rinat moves the songs across: open the prototype where the songs live (the claude.ai
  artifact), press **Back up all my songs**, then **Import** in the new app.

**Done when:**
- a public URL is live;
- Lighthouse PWA and accessibility checks pass;
- it works offline;
- Rinat has practised a full song on a phone and on a laptop.

## Phase 2: the practice features Rinat asked for, in this order

1. **Pitch feedback from the microphone.** The biggest one. (It could not run in the
   prototype because claude.ai blocks the microphone.)
   - **Capture:** `getUserMedia` with echo cancellation, noise suppression and auto
     gain **off** (they distort pitch).
   - **Detection:** a pitch detector (YIN or McLeod/MPM; the `pitchy` library
     implements MPM; check its licence first) in an AudioWorklet. Frames long enough
     for low male notes, down to about 80 Hz. About 40 readings per second.
   - **Expected note:** compare each reading with the note the notation timeline
     expects at that moment, in cents from the song's Sa. Offer an "any octave" mode.
   - **Live display:** cents off on a ±50 scale, in tune within ±15 cents, and how
     steady each held note is.
   - **Scores:** per note and per line, combining pitch accuracy and onset timing.
   - **Latency:** calibrate round-trip latency (play a click, detect it, store the
     offset).
   - **Headphones:** recommend them, because the guide leaks into the microphone
     otherwise. Score the "your turn" rounds of call and response, which have no guide.
   - **Takes:** record a take (MediaRecorder), store it locally, play it back against
     the guide, and let the user delete it.
2. **Recorded instruments** instead of synthesis.
   - Sampled harmonium (per reed), tabla bols retuned to Sa, dholak, tanpura strings
     and the percussion layers.
   - Keep the synth as a fallback.
   - Lazy-load sample packs and cache them offline.
   - Track every licence in `assets/LICENCES.md`. Do not sample the Casio's built-in
     voices.
   - **Ask Rinat** where the recordings come from: real instruments Rinat records, or
     CC0/CC-BY packs.
3. **Ornaments in the notation:** meend (glide), kan swar (grace note), andolan,
   murki, khatka.
   - Parser, renderer (an arc over the meend, a small superscript for kan) and
     playback (pitch glides on the guide).
   - **Ask Rinat** for diary photos showing how these are marked, and match those
     conventions.
4. **Daily riyaz routine and practice log.**
   - Chain exercises and songs, each with its own tempo, loops and guide mode, and run
     the session hands-free.
   - Log the date, duration, items, tempo reached and pitch scores.
   - History and streak views, with export.
5. **Per-song sound settings** (done in Phase 1, see above). Rhythm style, speed,
   layers, fills, reeds, drone type and tuning, and guide mode are saved with the
   song. Device settings are the fallback. These become optional fields in the export
   format.

**Smaller items, when they fit:**
- A stage view: a full-screen note and lyric you can read from a music stand.
- A Bengali interface.
- More taals (for example Deepchandi, Dhamar, Jhumra, Khemta).
- An on-screen keyboard showing the CT-X3000 key for each note, for playing along.

## Phase 3: accounts and sync (only if Rinat wants it; ask before starting)

- Optional sign-in to sync songs and the practice log across devices: Supabase, or
  similar, with edits resolved by `updatedAt`.
- Still works fully without an account.

## Phase 4: mobile apps

- Capacitor builds for iOS and Android from the same code.
- Native microphone permission and audio session (play while the ringer switch is
  silent), background audio during a routine, store listings.
- **Ask Rinat** before creating developer accounts.
