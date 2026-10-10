# Audio and timing engine (as implemented in the prototype)

Everything is synthesised with the Web Audio API. No samples, no libraries. Every number below is in
`reference/gaaner-sathi.html`; search for the names in bold.

## One clock

- **tick()** runs every 25 ms and schedules everything due in the next 160 ms on `AudioContext.currentTime`.
- One step is one matra. Tempo is in **matras per minute** (30–240). Seconds per beat = `60 / liveTempo(pass)`.
- For each matra it schedules, in this order: rhythm hits (`scheduleRhythm`), guide-melody notes (`reed`), and a display entry pushed to `S.queue`.
- **frame()** (requestAnimationFrame) pops queue entries whose time has passed, adjusted by `outputLatency + baseLatency`, and moves the highlight, the "now singing" panel and the taal strip.
- The tanpura (`scheduleTanpura`) runs on the same tick but keeps its own free rhythm; it is not tied to the taal.

Because melody, rhythm and highlight all come from the same scheduled times, they cannot drift apart.

## Transport

- Play from any line; optional loop from line A to line B; rounds counted from 0.
- **Count-in:** when on, one full cycle plus any pickup, always starting at sam. The display counts down the beats left.
- `startOn` puts the song's first beat on any taal beat (pickups). The taal position of every beat is `(songBeat + startOn − 1) mod cycle`.
- A note held across the loop start is re-sounded at the loop start (`S.carry`), and loop rounds clip notes at the loop end.
- Not looping: the transport stops at the first beat after the song, plays a final stroke if that beat is sam, and ends 1.3 s later.
- **Guide on repeats** (`guideOn`): every round, first round only, or every other round (call and response; the panel says "your turn, sing it alone").
- **Tempo trainer** (`liveTempo`): when looping, round n plays at `min(rampMax, tempo + rampStep × n)`. The song's saved tempo is not changed.
- Screen wake lock is requested while playing.

## Taals

| id | Name | Vibhags | Marks | Theka |
|---|---|---|---|---|
| dadra | Dadra · দাদরা | 3+3 | X 0 | Dha Dhin Na · Dha Tin Na |
| keherwa | Keherwa · কাহারবা | 4+4 | X 0 | Dha Ge Na Ti · Na Ke Dhin Na |
| rupak | Rupak · রূপক | 3+2+2 | 0 1 2 | Tin Tin Na · Dhi Na · Dhi Na |
| jhaptal | Jhaptal · ঝাঁপতাল | 2+3+2+3 | X 2 0 3 | Dhi Na · Dhi Dhi Na · Tin Na · Dhi Dhi Na |
| ektal | Ektal · একতাল | 2×6 | X 0 2 0 3 4 | Dhin Dhin · DhaGe TiRaKiTa · Tu Na · Kat Ta · DhaGe TiRaKiTa · Dhi Na |
| teentaal | Teentaal · ত্রিতাল | 4×4 | X 2 0 3 | Dha Dhin Dhin Dha ×2 · Dha Tin Tin Ta · Ta Dhin Dhin Dha |

## Rhythm engine

Every style becomes one cycle of hits `{pos, lane, vel}` with `pos` in matras from sam (`baseHits`).
`rhythmTable(style, taal, speed, layers)` caches the per-matra slots.

- **Styles:** tabla (theka bols), dholak (`GROOVES.dholak`), drum kit (`GROOVES.kit`), click (accented on sam and vibhag starts), off.
- **Speed:** Double compresses the cycle pattern so it plays twice per taal cycle. Half stretches it over two cycles (the slot window is 2 × cycle, picked by cycle parity). Normal is 1:1.
- **Fills** (`fillHits`): replace the last vibhag of every 4th song cycle (cycle index mod 4 = 3) and of the count-in. Tabla: Ti Ra Ki Ta runs ending Dha Ge. Kit: a descending tom run, then a crash on the next sam. Dholak: an alternating bass/treble run. Fills are not speed-mapped.
- **Layers** (`LAYERS`, `layerHits`): extra percussion built from the taal's vibhag structure, so each one fits every taal.
  - Tabla and dholak: manjira (open on vibhag starts, closed on every off-beat), kartal, ghungroo, shaker; dholak also gets tambourine.
  - Kit: shaker, tambourine (hits on the kit's backbeats), claps (on the backbeats), cowbell, congas (per-vibhag tumbao), ride (bell on sam).
  - Each style remembers its own layers.
- **Tabla synthesis:** dayan pitched to Sa folded into 250–500 Hz.
  - Dayan strokes: `na`, `tin`, `tun`, `te` (sets of partials with their own decays, plus a noise click).
  - Bayan: open `ge` glides 74 → 92 → 84 Hz; closed `ke` is a 700 Hz noise slap with a 130 Hz thump.
  - Bol map: Dha = na + ge, Dhin/Dhi = tin + ge, Na/Ta = na, Tin = tin, Ti/Te/Ra = te, Ge = ge, Ke/Ka/Ki/Kat = ke, Tu/Tun = tun.

## Harmonium (guide melody)

- **Waveform:** a periodic wave with 21 harmonics (`H = [0, 1, .74, .58, .47, .39, .31, .26, .21, .17, .14, .12, .1, .085, .072, .06, .05, .042, .035, .029, .024, .02]`).
- **Envelope:** 28 ms attack to the note level, settles to 82 % (τ 0.12 s), and releases with τ 0.04 s starting 25 ms before the note ends. Guide level is Full 0.9 or Soft 0.3.
- **Reed sets** (`REED_SETS`), as on a real harmonium: bass (an octave down), male (as written), female (an octave up). Each reed is a few cents off the others, which gives a slow beating.

  | Reeds | Reeds [ratio, cents, level, pan] | Gain | Lowpass | Low shelf |
  |---|---|---|---|---|
  | 1 | male [1, 0, 1, 0] | 0.72 | 3300 Hz | 0 dB |
  | 2 | male [1, −2, .78, −.12] + bass [.5, +2.5, .62, .12] | 1.0 | 3800 Hz | +2.5 dB |
  | 3 | bass [.5, 0, .55, −.2] + male [1, −2.5, .66, 0] + male [1, +3.5, .30, .08] + female [2, +4, .20, .22] | 0.89 | 4000 Hz | +2.5 dB |

  The gains were set by rendering each set offline and matching RMS loudness to the original voicing, so switching reeds does not jump in volume.
- **Melody chain:** lowpass (Q 0.5) → low shelf at 260 Hz → peaking 850 Hz +3 dB (Q 0.8) → out, with a 0.22 reverb send.

## Drones

- **Harmonium drone:** three reeds at Sa × 0.5, 0.7492 (lower Pa) and 1.0, through a 1300 Hz lowpass.
- **Tanpura** (`ksPluck`, between `/*KS-START*/` and `/*KS-END*/`):
  - **String model:** Karplus-Strong, a delay line with loop filter `(1−s)·x[n] + s·x[n−1]` (s = 0.05), a first-order allpass for the fractional delay (tuning is exact), loss for −60 dB on the fundamental at 8 s, and a DC blocker.
  - **Jawari (bridge buzz):** while the string is loud, its negative swing is softly limited at 25 % of the initial peak (slope 0.5 past the limit). That adds bright harmonics that fade as the note decays. On playback, a peaking filter (+6 dB, Q 2.5) sweeps 2600 → 900 Hz over 2.4 s.
  - **Strings:** 1st string lower Pa (× 0.7492), or Ma (× 0.6674) or Ni (× 0.9439); 2nd and 3rd at Sa (one detuned by +1.5 cents); 4th at kharaj Sa (× 0.5). Each is panned slightly differently.
  - **Pluck cycle:** gaps of 0.62, 0.36, 0.36 and 1.36 s (a 2.7 s cycle) with ±1.5 % human timing and ±6 % velocity.
  - **Measured:** pitch error under 0.05 cents from 98 to 294 Hz. Level about −16 dB at 1.5 s and −33 dB at 3.5 s relative to the attack. The bridge keeps about 2.4 × the high-frequency energy of a plain string at 2 s.

## Master

All sources → master gain 0.8 → compressor (threshold −14 dB, knee 10, ratio 3.5, attack 4 ms, release 200 ms) → output. Reverb is a synthetic stereo impulse response of 1.7 s (noise × (1 − t)^3.4) mixed at 0.55.

## How to verify sound without ears

Nobody on the build side can listen, so the prototype was checked by measurement. Keep doing this in CI:

- **Offline renders** (`OfflineAudioContext` in headless Chromium) for loudness (RMS and peak) per instrument and setting.
- **Autocorrelation pitch checks** for anything tuned.
- **Decay curves** for plucked or struck sounds.
- **Pure-logic tests** for every timing table.

Then ask Rinat to listen to specific things and give named feedback: thin, buzzy, nasal, too plucked, too loud against the voice.

**How the TypeScript port is checked** (2026-10-10):

- `tests/differential/audio.test.ts` (runs in CI) drives the prototype's engine and the port with a recording stand-in for Web Audio and the same random numbers. It requires identical call logs (every node, connection, parameter and timing) for 16 practice sessions, every percussion lane, the closing strokes and the live controls.
- `dev/render.html` (`npm run dev`, then open `/dev/render.html`) renders five sessions through both engines in the browser's own Web Audio and compares the audio sample by sample. The port differs from the prototype by no more than the prototype differs from itself between runs, because Chrome's mixing order varies. That is at most about 7 × 10⁻⁶, more than 100 dB below full scale.
- Measured there: full mixes −15 to −20 dB RMS with peaks around −2 dBFS; a click with a soft one-reed guide −30 dB RMS.

## Pitch feedback (added 2026-10-10)

The microphone, the detector and the scores (`src/audio/mic.ts`, `src/audio/dsp/mpm.ts`,
`src/core/pitch/track.ts`, `src/app/pitch.ts`).

- **Capture:** `getUserMedia` with echo cancellation, noise suppression and automatic gain
  off, into the same `AudioContext` as the guide, so readings are timed on the clock that
  schedules the notes. An AudioWorklet (loaded from a Blob URL) only collects samples in
  blocks of half a window; the detector runs on the page.
- **Detector:** the McLeod pitch method over a window of about 40 ms (2048 samples at 44.1
  and 48 kHz), hopping half a window (about 45 readings a second), 60–1500 Hz. The
  autocorrelation goes through a radix-2 FFT. A window under 0.002 RMS or with a clarity
  under 0.75 reads as no pitch.
- **Measured** (`tests/unit/pitch-dsp.test.ts`): pure tones C2–C6 within 0.03 cents and
  sung-like tones (24 harmonics, a vowel formant) within 1.3 cents, at 44.1 and 48 kHz; a
  weak fundamental does not jump an octave; 20 dB of room noise stays within 5 cents;
  silence, hiss and plain noise read as no pitch; 0.24 ms a window on the dev laptop.
- **Expected notes:** each scheduled matra (the transport's `onBeat`) gives the note pieces
  the guide plays in it; pieces of the same held note join up.
- **Delay:** a reading belongs to the note scheduled `lag` seconds earlier (sound out, the
  singer, sound back in). It starts from the device's figures (output, base and input
  latency), or the delay found last time, and is refined from the singing every 1.5 s
  (0.5 s until confirmed): the delay, 0–600 ms, at which most of the last 10 s of readings
  land within half a semitone of their note. It only moves when another delay fits clearly
  better (5 points), so long held notes leave it alone. This works with headphones, which a
  click-and-listen calibration cannot.
- **Scores:** each note on its steady part (from 100 ms or 30 % in, to 30 ms before its
  end): the median distance in cents gives 100 within 10 cents, then 2 points a cent, 0
  from 60. A note with voice in under half its readings is "not sung" (not scored, but
  counted in the share sung); one too short to judge is skipped. Lines and runs are the
  duration-weighted mean. Any octave counts unless the singer asks for the octave too.
  Rounds where the guide plays in "every other round" are for listening, so not scored.
- **End to end:** `tests/unit/pitch-track.test.ts` drives the real transport, synthesises a
  singer (150 ms behind, vibrato, a scoop into each note, noise) and runs the detector on
  it: in tune scores 100 with the delay found at 140 ms; 40 cents flat scores 43. In
  headless Edge with a WAV as the microphone (`--use-file-for-fake-audio-capture`): in tune
  100 on every line, 35 cents flat 50, the delay found within the first line.
- **Not yet:** timing (early or late) in the score. It needs the true round-trip delay,
  and the delay found from the singing includes the singer's own lateness.

## Known limitations

- Synthesised timbres are approximations. Rinat finds the harmonium "OK, could be fuller" (3 reeds is now the default).
- Looping a section that is not a whole number of cycles makes the taal jump at the loop point, because the taal position follows the song position. This is correct, but could surprise.
- Bluetooth output latency can be large. The highlight compensates using `outputLatency`; the sound itself is unaffected.
- iOS: Web Audio can be silenced by the ringer switch unless the audio session is set to playback (the Audio Session API, `navigator.audioSession.type = 'playback'`, in recent Safari; check current support, and fall back to a silent `<audio>` element). It also needs a user gesture to start.
