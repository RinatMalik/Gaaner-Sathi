# Sound and timing

Everything is synthesised with the Web Audio API: no samples, no libraries. The engine is
the prototype's (`reference/gaaner-sathi.html`; search for the names in bold), ported to
`src/audio/` and compared with it call for call. The microphone, takes and MIDI keyboards
were added by the app; each section says why it is built the way it is.

## One clock

- **tick()** runs every 25 ms and schedules everything due in the next 160 ms on
  `AudioContext.currentTime`.
- One step is one matra. Tempo is in **matras per minute** (30–240). Seconds per beat =
  `60 / liveTempo(pass)`.
- For each matra it schedules, in this order: rhythm hits (`scheduleRhythm`), guide-melody
  notes (`reed`), and a display entry pushed to `S.queue`.
- **frame()** (requestAnimationFrame) pops queue entries whose time has passed, adjusted by
  `outputLatency + baseLatency`, and moves the highlight, the Practice view's lines (the line
  being sung, its beat, and a playhead through the beat from the same clock) and the taal
  figure.
- The tanpura (`scheduleTanpura`) runs on the same tick but keeps its own free rhythm; it is
  not tied to the taal.

Because melody, rhythm and highlight all come from the same scheduled times, they cannot
drift apart. The microphone (pitch feedback, takes) joins the same clock.

## Transport

- Play from any line; optional loop from line A to line B; rounds counted from 0.
- **What plays** (Rinat, 2026-10-12): the deck's Play plays the Lines to practise; a line
  number on the sheet and the editor's "play from here" play from that line to the end of the
  song, once; a section button plays its section (looping it when "loop" is ticked); a rewaz
  item and a take played with the guide play their own lines. None of them changes the Lines
  to practise.
- **Pause** (Rinat, 2026-10-12): the deck's Play button pauses while playing, and a Stop
  button sits beside it. Paused, the sound stops (the session ends, as on Stop) and the beat
  stays marked; Play goes on from that beat, in the same round (`start(…, { at: { s, pass }
  })`): at once, with no count-in, a note held across that beat sounding again for the rest of
  its length (`resumeCarry`), the tempo trainer and a set number of rounds carrying on where
  they were. Paused in the count-in, Play starts again. A rewaz waits while paused; Stop (or
  changing the Lines to practise) ends a pause. A take ends at the pause; the practice log
  counts the time played, without the pause. The space bar plays and pauses.
- **Count-in:** when on, one full cycle plus any pickup, always starting at sam. The display
  counts down the beats left.
- `startOn` puts the song's first beat on any taal beat (pickups). The taal position of every
  beat is `(songBeat + startOn − 1) mod cycle`, in a song in one taal.
- A note held across the loop start is re-sounded at the loop start (`S.carry`), and loop
  rounds clip notes at the loop end.
- Not looping: the transport stops at the first beat after the song, plays a final stroke if
  that beat is sam, and ends 1.3 s later.
- **A gentle ending** (`endFade`, 0.25 s; Rinat, 2026-10-11): when the song, or the last of a
  set number of rounds (a line played on its own, a rewaz item), ends by itself, the last
  note lets go with a time constant of `endFade / 3` instead of 0.04 s, and the session's
  output and reverb send fade the same way over the last `endFade` before the end, so a
  drone or a ringing stroke is not cut off. A stop pressed by hand stays quick. A note
  followed by silence (`x`: the next share of a beat is a rest, `silenceAt`) lets go the same
  gentle way (Rinat, 2026-10-11). The comparisons with the prototype set `endFade` to 0, its
  own short ending, which turns both off.
- **Guide on repeats** (`guideOn`): every round, first round only, or every other round
  (call and response; the panel says "your turn, sing it alone").
- **Tempo trainer** (`liveTempo`): when looping, round n plays at
  `min(rampMax, tempo + rampStep × n)`. The song's saved tempo is not changed.
- **Section tempos:** the source's `tempoAt(s)` gives each song beat its section's tempo
  (from its heading, NOTATION.md → Sections), else the song's. The count-in takes the first
  section beat's, and the tempo trainer adds to each section's own
  (`max(base, min(rampMax, base + rampStep × n))`). A rewaz item's tempo still plays every
  beat. Without section tempos nothing changes.
- **Section taals (taal pherta):** the source's `taalAt(s)` gives each song beat its taal and
  offset (NOTATION.md → A taal per section): the rhythm table, the taal beat shown, sam's
  closing stroke and the fills follow it, fills counting cycles from where that taal began. A
  count-in is a cycle of the taal of the beat it leads to. Without `taalAt` the source's
  `taal` and `startOn` serve, as before. `tests/unit/pherta.test.ts` checks that a Kaharwa
  section of a Dadra song plays call for call as a song in Kaharwa plays the same line, and a
  song naming no taal exactly as without `taalAt`.
- **Rounds:** the transport can stop a loop after N rounds (rewaz routines).
- **Hooks:** `onBeat` reports every scheduled matra (pitch feedback, takes); `onNote(t, dur,
  midi)` hears each guide note as it is scheduled, and `localGuide = false` leaves the
  harmonium out (MIDI keyboards).
- The screen wake lock is requested while playing.

## Taals

| id | Name | Vibhags | Marks | Theka |
|---|---|---|---|---|
| dadra | Dadra · দাদরা | 3+3 | X 0 | Dha Dhin Na · Dha Tin Na |
| keherwa | Keherwa · কাহারবা | 4+4 | X 0 | Dha Ge Na Ti · Na Ke Dhin Na |
| rupak | Rupak · রূপক | 3+2+2 | 0 1 2 | Tin Tin Na · Dhi Na · Dhi Na |
| jhaptal | Jhaptal · ঝাঁপতাল | 2+3+2+3 | X 2 0 3 | Dhi Na · Dhi Dhi Na · Tin Na · Dhi Dhi Na |
| ektal | Ektal · একতাল | 2×6 | X 0 2 0 3 4 | Dhin Dhin · DhaGe TiRaKiTa · Tu Na · Kat Ta · DhaGe TiRaKiTa · Dhi Na |
| teentaal | Teentaal · ত্রিতাল | 4×4 | X 2 0 3 | Dha Dhin Dhin Dha ×2 · Dha Tin Tin Ta · Ta Dhin Dhin Dha |
| jhampak | Jhampak · ঝম্পক | 3+2 | X 2 | Dhin Dhin Na · Dhin Na |
| shashthi | Shashthi · ষষ্ঠী | 2+4 | X 2 | Dha Tet · DhaGe TeTe Dhin Na |
| rupakra | Rupakra · রূপকড়া | 3+2+3 | X 2 3 | Dhin Dhin DhaGe · Tin TaGe · Dhin Dhin TeTe |
| nabatal | Nabatal · নবতাল | 3+2+2+2 | X 2 3 4 | Dha Den Ta · TeTe KaTa · GaDi GheNe · DhaGe TeTe |
| ekadashi | Ekadashi · একাদশী | 3+2+2+4 | X 2 3 4 | Dha Den Ta · TeTe KaTa · GaDi GheNe · DhaGe TeTe TaGe TeTe |
| nabapanchatal | Nabapanchatal · নবপঞ্চতাল | 2+4+4+4+4 | X 2 3 4 5 | Dha Ge · Dha Ge Den Ta · Kat TaGe Den Ta · TeTe Dha Den Ta · TeTe KaTa GaDi GheNe |
| khemta | Khemta · খেমটা | 3+3+3+3 | X 2 0 3 | Dha Ti Te · Na Dhi Na · Ta Ti Te · Dha Dhi Na |
| deepchandi | Deepchandi · দীপচন্দী | 3+4+3+4 | X 2 0 3 | Dha Dhin – · Dha Dha Tin – · Ta Tin – · Dha Dha Dhin – |
| dhamar | Dhamar · ধামার | 3+2+2+3+4 | X 0 2 0 3 | Ka Dhi Ta · Dhi Ta · Dha – · Ga Di Na · Di Na Ta – |
| jhumra | Jhumra · ঝুমরা | 3+4+3+4 | X 2 0 3 | Dhin –Dha TiRaKiTa · Dhin Dhin DhaGe TiRaKiTa · Tin –Ta TiRaKiTa · Dhin Dhin DhaGe TiRaKiTa |
| teora | Teora · তেওরা | 3+2+2 | X 2 3 | Dha Dhi Na · Dhi Na · Dhi Na |
| kawali | Kawali · কাওয়ালি | 4+4 | X 0 | Dha Dhin DhaDha Dhin · Dha Tin DhaDha Dhin |
| garba | Garba · গরবা | 3+3 | X 0 | Dhin DhaTi Dha · Tin TaTi Ta |

The first six are the prototype's. The other thirteen were added on 2026-10-11 at Rinat's
request; the taal picker groups them as "Tagore's own taals" and "More taals". The prototype
reads their ids as Dadra.

- **Tagore's own six** have no khali, only talis. Their thekas follow gitabitan.net's page on
  the taals Rabindranath made (from Subinay Roy's *Rabindrasangit Sadhana*, among others):
  Subinay Roy's tabla thekas for Jhampak, Shashthi (the madhya-laya one; drut is
  Dha Ge · Dha Ge Dhin Na) and Rupakra, and the mridanga thekas for Nabatal and Ekadashi
  (Kangalicharan Sen) and Nabapanchatal (Subinay Roy), the only ones written down, played on
  the tabla with the bol map below.
- **Khemta** is the 12-matra form of the Bengali tabla books (talis on 1, 4 and 10, khali on
  7). Tagore's 6-matra Kashmiri Khemta (Dhig – Na · Dha Ti Na) is not included (Open
  question 5).
- **Dhamar** is divided as in Rabindrasangeet, 3+2+2+3+4 with khali on 4 and 8, with that
  theka (geetabitan.com, gitabitan.net). The classical 5+2+3+4 puts its bars on the same
  vibhag lines, so the checker accepts a song written either way.
- **Deepchandi** and **Jhumra** are the standard ones. "–" is a rest: a matra, or the first
  half of one, with no stroke. (`beatLabel` names a silent beat "·" and a bol that comes
  after the beat "–Dha"; the screen no longer shows bols, since 2026-10-15.)
- **Teora** is the Rabindrasangeet one, with talis only, as geetabitan.com gives it.
  **Kawali** follows onushilon.org (from *Tabla Bigyan*, Manas Dasgupta's *Taal-abhidhan* and
  Prafullakumar Das's *Rabindrasangit-gabeshana*); other thekas exist, such as
  Dha Dhin DhaDha Dhin · Na Tin NaNa TiTe. **Garba** (for Garba and Dandiya) has no single
  written theka: this is the 6-matra garba rhythm as tabla players give it (Dhin · DhaTi Dha |
  Tin · TaTi Ta); some play garba songs in an 8-matra Keherwa form instead.
- **Taal pherta** (তাল ফেরতা) is not a taal but a song that changes taal from one part to
  another (Kaharwa and Dadra, say): each section can name its own taal in its heading
  (NOTATION.md → A taal per section).
- Their **dholak and drum patterns** were made for this app on the prototype's plan (bass and
  kick on sam and the talis, the closed stroke and snare on khali and the backbeats), not
  taken from a source: they need Rinat's ears.

## Rhythm engine

Every style becomes one cycle of hits `{pos, lane, vel}` with `pos` in matras from sam
(`baseHits`). `rhythmTable(style, taal, speed, layers)` caches the per-matra slots.

- **Styles:** tabla (theka bols), dholak (`GROOVES.dholak`), drum kit (`GROOVES.kit`), click
  (accented on sam and vibhag starts), off.
- **Speed:** Double compresses the cycle pattern so it plays twice per taal cycle. Half
  stretches it over two cycles (the slot window is 2 × cycle, picked by cycle parity). Normal
  is 1:1.
- **Fills** (`fillHits`): replace the last vibhag of every 4th song cycle (cycle index mod 4
  = 3) and of the count-in. Tabla: Ti Ra Ki Ta runs ending Dha Ge. Kit: a descending tom run,
  then a crash on the next sam. Dholak: an alternating bass/treble run. Fills are not
  speed-mapped.
- **Layers** (`LAYERS`, `layerHits`): extra percussion built from the taal's vibhag
  structure, so each one fits every taal.
  - Tabla and dholak: manjira (open on vibhag starts, closed on every off-beat), kartal,
    ghungroo, shaker; dholak also gets tambourine.
  - Kit: shaker, tambourine (hits on the kit's backbeats), claps (on the backbeats), cowbell,
    congas (per-vibhag tumbao), ride (bell on sam).
  - Each style remembers its own layers.
- **Tabla synthesis:** dayan pitched to Sa folded into 250–500 Hz.
  - Dayan strokes: `na`, `tin`, `tun`, `te` (sets of partials with their own decays, plus a
    noise click).
  - Bayan: open `ge` glides 74 → 92 → 84 Hz; closed `ke` is a 700 Hz noise slap with a 130 Hz
    thump.
  - Bol map: Dha = na + ge, Dhin/Dhi = tin + ge, Na/Ta = na, Tin = tin, Ti/Te/Ra = te,
    Ge = ge, Ke/Ka/Ki/Kat = ke, Tu/Tun = tun; for the mridanga bols of Tagore's taals,
    Den = tin + ge, Di = tin, Tet = te, Ga/Ghe = ge, Ne = na. A rest (–) plays nothing.

## Harmonium (the guide)

- **Waveform:** a periodic wave with 21 harmonics (`H = [0, 1, .74, .58, .47, .39, .31, .26,
  .21, .17, .14, .12, .1, .085, .072, .06, .05, .042, .035, .029, .024, .02]`).
- **Envelope:** 28 ms attack to the note level, settles to 82 % (τ 0.12 s), and releases with
  τ 0.04 s starting 25 ms before the note ends. Guide level is Full 0.9 or Soft 0.3.
- **Reed sets** (`REED_SETS`), as on a real harmonium: bass (an octave down), male (as
  written), female (an octave up). Each reed is a few cents off the others, which gives a
  slow beating.

  | Reeds | Reeds [ratio, cents, level, pan] | Gain | Lowpass | Low shelf |
  |---|---|---|---|---|
  | 1 | male [1, 0, 1, 0] | 0.72 | 3300 Hz | 0 dB |
  | 2 | male [1, −2, .78, −.12] + bass [.5, +2.5, .62, .12] | 1.0 | 3800 Hz | +2.5 dB |
  | 3 | bass [.5, 0, .55, −.2] + male [1, −2.5, .66, 0] + male [1, +3.5, .30, .08] + female [2, +4, .20, .22] | 0.89 | 4000 Hz | +2.5 dB |

  The gains were set by rendering each set offline and matching RMS loudness to the original
  voicing, so switching reeds does not jump in volume.
- **Melody chain:** lowpass (Q 0.5) → low shelf at 260 Hz → peaking 850 Hz +3 dB (Q 0.8) →
  out, with a 0.22 reverb send.

## Drones

- **Harmonium drone:** three reeds at Sa × 0.5, 0.7492 (lower Pa) and 1.0, through a 1300 Hz
  lowpass.
- **Tanpura** (`ksPluck`, between `/*KS-START*/` and `/*KS-END*/`):
  - **String model:** Karplus-Strong, a delay line with loop filter `(1−s)·x[n] + s·x[n−1]`
    (s = 0.05), a first-order allpass for the fractional delay (tuning is exact), loss for
    −60 dB on the fundamental at 8 s, and a DC blocker.
  - **Jawari (bridge buzz):** while the string is loud, its negative swing is softly limited
    at 25 % of the initial peak (slope 0.5 past the limit). That adds bright harmonics that
    fade as the note decays. On playback, a peaking filter (+6 dB, Q 2.5) sweeps 2600 → 900 Hz
    over 2.4 s.
  - **Strings:** 1st string lower Pa (× 0.7492), or Ma (× 0.6674) or Ni (× 0.9439); 2nd and
    3rd at Sa (one detuned by +1.5 cents); 4th at kharaj Sa (× 0.5). Each is panned slightly
    differently.
  - **Pluck cycle:** gaps of 0.62, 0.36, 0.36 and 1.36 s (a 2.7 s cycle) with ±1.5 % human
    timing and ±6 % velocity.
  - **Measured:** pitch error under 0.05 cents from 98 to 294 Hz. Level about −16 dB at 1.5 s
    and −33 dB at 3.5 s relative to the attack. The bridge keeps about 2.4 × the
    high-frequency energy of a plain string at 2 s.

## Master

All sources → master gain 0.8 → compressor (threshold −14 dB, knee 10, ratio 3.5, attack
4 ms, release 200 ms) → output. Reverb is a synthetic stereo impulse response of 1.7 s
(noise × (1 − t)^3.4) mixed at 0.55.

## Pitch feedback

`src/audio/mic.ts`, `src/audio/dsp/mpm.ts`, `src/core/pitch/track.ts`, `src/app/pitch.ts`.

- **Capture:** `getUserMedia` with echo cancellation, noise suppression and automatic gain
  off (they distort pitch), into the same `AudioContext` as the guide. "Check my pitch" turns
  feedback on; the microphone then listens only while a song plays (Rinat, 2026-10-12): it
  opens when playing starts (or goes on after a pause) and closes when it stops, pauses or
  ends. Scoring starts with the first beat scheduled; notes before the microphone was open
  have no readings and are left out. A pause cuts the expected notes there (`cut`), so the
  notes scheduled but never played are forgotten. The editor's quick listen to a line does not
  listen. There is no longer a tuner while nothing plays (the Voice tab's hold trainer shows a
  note's pitch). An AudioWorklet (loaded from a Blob URL) only copies samples
  into blocks of half a window, stamped with their frame; the detector runs on the page.
  *Why:* the audio thread also renders the instruments, so it never does the maths; an
  AnalyserNode polled from the page would time windows only roughly.
- **Detector:** the McLeod pitch method, hand-written (about 200 lines with its radix-2
  FFT; no library), over a window of about 40 ms (2048 samples at 44.1 and 48 kHz), hopping
  half a window (about 45 readings a second), 60–1500 Hz. A window under 0.002 RMS or with a
  clarity under 0.75 reads as no pitch. *Why MPM:* its key-maximum rule chooses octaves well
  on voices with no per-voice threshold (YIN is similar in accuracy).
- **Measured** (`tests/unit/pitch-dsp.test.ts`): pure tones C2–C6 within 0.03 cents and
  sung-like tones (24 harmonics, a vowel formant) within 1.3 cents, at 44.1 and 48 kHz; a
  weak fundamental does not jump an octave; 20 dB of room noise stays within 5 cents;
  silence, hiss and plain noise read as no pitch; 0.24 ms a window on the dev laptop.
- **Expected notes:** each scheduled matra (`onBeat`) gives the note pieces the guide plays
  in it; pieces of the same held note join up.
- **Delay:** a reading belongs to the note scheduled `lag` seconds earlier (sound out, the
  singer, sound back in). It starts from the device's figures (output, base and input
  latency), or the delay found last time, and is refined from the singing every 1.5 s (0.5 s
  until confirmed): the delay, 0–600 ms, at which most of the last 10 s of readings land
  within half a semitone of their note. It only moves when another delay fits clearly better
  (5 points), so long held notes leave it alone. *Why:* it works with headphones (Bluetooth
  included) and needs no setup; a click-and-listen calibration through the speakers cannot
  hear headphones. Under the lines it reads "Delay 260 ms · device 60 ms": the second figure
  is the device's own (output, base and input latency), the rest is how far behind the
  guide the voice comes, plus any latency the device does not report (Bluetooth headphones
  often add 150–250 ms that Windows does not). The scores and the lines are not hurt by it
  (each reading is moved back by it); what shows it is the voice drawn, which trails the
  playhead by about the delay less the output latency, and the gauge, which follows the
  voice (Rinat, 2026-10-19: "the delay is quite significant. why is that?").
- **Scores:** each note on its steady part (from 100 ms or 30 % in, to its last 10 %), so a
  late or scooped start, or moving early to the next note, does not count against it (the
  last 10 %: Rinat, 2026-10-15; it was the last 30 ms): the median distance in cents gives
  100 within 10 cents, then 2 points a cent, 0 from 60. A note with voice in under half its
  readings is "not sung" (not scored, but counted in the share sung); one too short to judge
  is skipped. Lines and runs are the duration-weighted mean. Any octave counts unless the
  singer asks for the octave too. Rounds where the guide plays in "every other round" are for
  listening, so not scored. The gauge (below) calls a note in tune within 15 cents.
- **Shown** (Rinat, 2026-10-15) on the Practice view's lines (`src/app/lines.ts`): each
  reading is placed on its beat (from the beats scheduled, moved back by the delay) and drawn
  on that line's pitch strip over the note bars, green within 15 cents of the note expected,
  amber within 35, red beyond, grey where no note is expected; with any octave counting it is
  drawn at the expected note's octave. Each beat sung gets a mark under its words; each line,
  when it finishes, its score in its number box, which is tinted from red (50 or less) through
  amber (75) to green (95 or more) by it; the run's average (`summary`) shows under the lines
  as each line finishes, tinted the same way, and is the run's score at the end. A line's
  drawing is wiped when a new round of it starts. *Why on the lines:* the eye is already on
  the line being sung, so the voice is drawn where the notes are, not in a separate box.
- **The gauge** (Rinat, 2026-10-19, in place of a line of text under the lines: "maybe
  showing the cents vertically"): while the pitch check is on, a column at the end of every
  line, filled in the line being sung (`gaugeHTML`, `gaugeY`). It shows the note sung (the
  nearest to the voice), a scale with the note expected across its middle (green within 15
  cents, amber within 35, red to 50, the marker held at the end beyond), a marker that slides
  up when sharp and down when flat, as on the strip, and the cents (`centsText`; not on a
  phone, where the column is 22 px). The marker is the median of the last ~100 ms of this
  note's readings (five; ~200 ms until 2026-10-19, which made it slow to answer), gliding
  60 ms to each new place, so a wobble does not shake it; with no note expected it shows "Rest", and
  outside a section the distance to the nearest note. It follows the voice, so it is a
  delay behind the lit beat.
- **Looking back** (Rinat, 2026-10-19: "the experience of inspecting my performance after
  finish singing is not great"): a tap or click on any line (not its number box, which plays
  from it) opens it to the size of the line being sung: the words big, the tall strip with
  its semitone lines, the voice drawn thick, and under each beat the cents of its mark's note
  (the worst note in the beat, as the mark; nothing for a note not sung), in the mark's
  colour. Again closes it; a button shown only when focused does the same from the keyboard.
  Opened lines stay open through a pause or stop and close when a new run starts. *Why a tap,
  not hover:* lines opening under a moving pointer would push the rest about, and a phone has
  no hover. After a run the text under the lines says so.
- **Not yet:** timing (early or late) in the score. It needs the true round-trip delay, and
  the delay found from the singing includes the singer's own lateness.
- **End to end:** `tests/unit/pitch-track.test.ts` drives the real transport, synthesises a
  singer (150 ms behind, vibrato, a scoop into each note, noise) and runs the detector on it:
  in tune scores 100 with the delay found at 140 ms; 40 cents flat scores 43. In headless
  Edge with a WAV as the microphone: in tune 100 on every line, 35 cents flat 50, the delay
  found within the first line.
- Works in any browser with AudioWorklet and a microphone (Chrome, Edge, Firefox, Safari
  14.1+), on https or localhost. The first seconds of a first run on a new device may compare
  against the wrong note until the delay is found.

## The Voice tab

`src/core/pitch/voice.ts` (pure), `src/app/voice.ts`. Both listen through the same microphone
path as pitch feedback.

- **Range finder:** a note counts as held when, over the last 0.5 s, at least 75 % of
  readings have a pitch and their core lies within a semitone (`steadyPitch`); the lowest and
  highest held notes are kept (a note only passed through is not). `suggestSa` puts a song's
  usual span (mandra Pa to taar Ga, −5 to +16 semitones from Sa) in the middle of the range,
  within the Sa the app plays (C3 to B5); for the open song it uses that song's own span
  (`songSpan`). "Use as my Sa" keeps it on the device (DATA.md → Settings, `mySa`).
- **Hold-a-note trainer:** its own transport on the same engine plays the note (`S - - -` at
  60 a minute, guide on the first round only) over the tanpura, then the drone alone while the
  voice is timed (`HoldTimer`): the hold starts at the first pitch and ends at a gap of more
  than 0.35 s (a breath). Any octave counts. Its pitch is the median from 0.3 s in; its
  wobble (the spread in cents) reads as very steady (≤ 8), steady (≤ 15), a little unsteady
  (≤ 30) or unsteady. The longest hold on each note is kept.

## Takes

`src/audio/recorder.ts`, `src/audio/dsp/pcm.ts`, `src/core/practice/take.ts`,
`src/app/takes.ts`; storage in DATA.md → Takes.

- **Capture:** while "Record me" is on, each play is recorded through the same capture
  worklet as pitch feedback (voice processing off), whose blocks carry AudioContext frame
  numbers. A take keeps the frames from the run's first scheduled beat (count-in included) to
  a moment after it stops; missing blocks become silence, so later samples keep their time.
  At most 15 minutes. *Why not MediaRecorder:* its start time is not on the AudioContext
  clock, and its encoders add an unknown delay; a take is only useful against the guide if
  the voice lands where it was sung.
- **Size:** the rate is halved as samples arrive (a 31-tap half-band filter, then every other
  sample: a 440 Hz tone keeps its level within 0.1 dB, 18 kHz drops by more than 40 dB) and
  kept as 16-bit numbers: 24 kHz, 48 kB a second, about 2.9 MB a minute.
- **Playback against the guide:** the transport plays the take's lines with its rounds, the
  song's tempo then (or a rewaz item's), its count-in and tempo trainer, and the guide every
  round. The voice starts at the run's first scheduled beat, skipping `lag` seconds of the
  take (the delay pitch feedback last found, else the device's own figure), and both leave
  through the same output, so they line up. It stops when the voice ends. "Just me" plays the
  voice alone. Playing a take back is not practice, so it is not logged.
- A take of a song whose notation has changed since says so (a fingerprint of the text).
- How well it lines up depends on `lag`, which is only as good as the device's figure until
  pitch feedback has heard the singer once.

## MIDI keyboards

`src/audio/midi.ts`, `src/app/keyboard.ts`.

- **Any keyboard, through Web MIDI**, built into the browser: one that shows up as a MIDI
  device (USB "to host", or a MIDI interface) works the same; nothing is brand-specific, and
  there is no library. Chrome and Edge on a computer and Chrome on Android have Web MIDI;
  Firefox needs a site-permission add-on; Safari and iPhones have none (the Connect button
  says so). Connecting is one button in the Practice settings; a keyboard allowed before
  reconnects by itself.
- **Typing:** while the editor is showing, each key pressed is a beat, written from the
  song's Sa (two octaves either side), into the beat boxes or at the caret. Keys pressed
  within 40 ms of each other (an octave) type the highest once. Holds and rests come from the
  note pad (Enter notes). It is step entry, not timed playing: the rhythm comes from the taal and the boxes.
- **The guide on the keyboard:** "Guide plays on: This device / The keyboard / Both". The
  transport tells the keyboard part of each guide note as it schedules it (`onNote`); notes
  go out on channel 1 at velocity 100 (Soft: 50), timed on the performance clock from
  `getOutputTimestamp()`, so they sound with the tabla, output delay included. Just after the
  AudioContext starts, that reading is zeros and then drifts by about 30 ms over its first
  20 ms of sound (measured in Edge), so notes wait for a settled reading (they are scheduled a
  tenth of a second ahead); with a stand-in keyboard, notes go out spaced exactly at the
  tempo (545 ms at 110 a minute, the first included). The sound is the keyboard's own by
  default (whatever tone is selected on it); General MIDI reed organ or accordion can be asked
  for (bank 0, program 20 or 21). Stop sends all-notes-off at once and again after anything
  already queued (browsers cannot take back queued messages).
- **Which key to press:** a keyboard drawn on the Practice view, in a section of its own
  while Show the keys is ticked (whole octaves around the song, with keys added on both sides
  to fill the width at a key's natural size, `keysToFill`; each Sa marked; light and dark keys
  in both colour schemes) lights the key of each note as it plays and outlines the next, and
  names it ("D4 · White 2", counting keys as on the CT-X3000). It needs no MIDI.
- Not heard on a real keyboard yet: the CT-X3000's response to channel 1 (its selected tone)
  and to General MIDI program changes needs Rinat's ears.

## Verifying sound without ears

Nobody on the build side can listen, so sound is checked by measurement, then Rinat is asked
about specific things (thin, buzzy, nasal, too plucked, too loud against the voice).

- **Offline renders** (`OfflineAudioContext` in the browser) for loudness (RMS and peak) per
  instrument and setting; **autocorrelation** for anything tuned; **decay curves** for
  plucked or struck sounds; **pure tests** for every timing table.
- **The port against the prototype:** `tests/differential/audio.test.ts` (in CI) drives the
  prototype's engine and the port with a recording stand-in for Web Audio and the same random
  numbers, and requires identical call logs (every node, connection, parameter and timing)
  for 16 practice sessions, every percussion lane, the closing strokes and the live controls.
  Planted bugs (an attack 1 ms longer, a tanpura gap 10 ms longer, a tom 1 Hz higher, two
  calls swapped) each fail it.
- **`dev/render.html`** (`npm run dev`, then `/dev/render.html`) renders five sessions through
  both engines in the browser's own Web Audio and compares them sample by sample: the port
  differs from the prototype by no more than the prototype differs from itself between runs
  (Chrome's mixing order varies), at most about 7 × 10⁻⁶, more than 100 dB below full scale.
  Full mixes measure −15 to −20 dB RMS with peaks around −2 dBFS; a click with a soft one-reed
  guide −30 dB RMS.
- The same page renders one cycle of each taal added on 2026-10-11 through the port alone (no
  guide or drone, 80 matras a minute). In headless Edge 155: tabla −18.4 to −21.9 dB RMS (the
  prototype's Dadra −19.4, Keherwa −20.9), dholak −20.3 to −22.6, drums −22.7 to −25.7, peaks
  −1.9 to −3.8 dBFS. The beats that start silent are exactly the rests: Deepchandi 3, 7, 10
  and 14, Dhamar 7 and 14, Jhumra 2 and 9. Light strokes (Te, TeTe, Ka) sit at −14 to −18 dB,
  as Keherwa's Ti (−18.2) and Ektal's TiRaKiTa (−15.6) do in the prototype. Dhamar's sam is a
  Ka on the closed bayan, 10.7 dB below its loudest Dha.
- **The ending,** on the same page: "S R G M | P D N S" in Keherwa at 120, stopped as the app
  stops it. The last note falls 20 dB in 175 ms (95 ms with the prototype's ending); a
  tanpura at the end falls 20 dB in 195 ms (65 ms). Falling 40 dB takes about 0.5 s either
  way: that is the reverb's own tail. In "S R G x | P D N S", Ga before the silence falls
  20 dB in 195 ms (95 ms before).
- Teora, Kawali and Garba (added later on 2026-10-11), the same way: tabla −19.0, −18.1 and
  −19.2 dB RMS, dholak −20.4, −18.4 and −19.2, drums −23.3, −21.0 and −21.3, peaks −1.9 to
  −4.5 dBFS; no silent beats; Kawali's doubled Dha sits within 1.6 dB of the loudest stroke.
  Kawali's dholak and drums are the loudest of all (about 2 dB above the rest), from their
  many strokes.

## Known limitations

- Synthesised timbres are approximations. Rinat finds the harmonium "OK, could be fuller"
  (3 reeds is now the default).
- Looping a section that is not a whole number of cycles makes the taal jump at the loop
  point, because the taal position follows the song position. Correct, but could surprise.
- Bluetooth output latency can be large. The highlight compensates using `outputLatency`; the
  sound itself is unaffected.
- iOS: Web Audio can be silenced by the ringer switch unless the audio session is set to
  playback (`navigator.audioSession.type = 'playback'` in recent Safari; check support, and
  fall back to a silent `<audio>` element). It also needs a user gesture to start, and may
  move the sound to the earpiece once the microphone is on.
