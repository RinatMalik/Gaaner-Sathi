# ADR-003: How pitch feedback listens, times and scores

- **Status:** Accepted 2026-10-10
- **Decided by:** Claude, building Rinat's first Phase 1 feature (PH1-02). Rinat can veto
  any part.
- **Revisit:** when the native app arrives (its audio stack decides the capture side),
  or if singers find the scores unfair or the delay wrong on their devices.

## Context

A singer wants to see, while singing, whether each note is in tune, and a score for each
line afterwards. Nobody on the build side can sing into the app, so every part must be
checked by measurement. The app must stay light (no runtime dependencies) and smooth on
a mid-range phone, where the audio thread also renders the harmonium, tabla and tanpura.
The kickoff planned a click-and-listen latency calibration through the speakers, but
headphones are recommended (otherwise the guide leaks into the microphone), and a
microphone cannot hear headphones.

## Decision

- **Detector:** the McLeod pitch method, written by hand (about 200 lines with its FFT),
  pure and tested on synthetic voices: within 0.03 cents on pure tones and 1.3 cents on
  sung-like tones from C2 to C6. No library (`pitchy` would have been the alternative).
- **Threads:** an AudioWorklet only copies microphone samples into blocks and posts them;
  the detector runs on the page, about 45 times a second at about 0.24 ms each. The audio
  thread never does the maths, so the instruments cannot glitch because of it.
- **One clock:** the microphone joins the guide's `AudioContext`. Each reading is stamped
  with the frame it came from, so readings and the notes they are compared with share the
  clock that schedules the guide. The transport reports every scheduled matra
  (`onBeat`), which gives the notes expected and when.
- **Delay:** a reading belongs to the note scheduled some time before it (sound out, the
  singer, sound back in). The app starts from the device's own figures, or the delay it
  found last time, and refines it from the singing: the delay at which the most readings
  land within half a semitone of their note. It moves only when another delay fits
  clearly better. This works with headphones, Bluetooth included, and needs no setup step.
- **Scores:** pitch only, on the steady part of each note (a late or scooped start does
  not count against it), as the median distance in cents: 100 within 10 cents, 0 from 60.
  Notes the singer did not sing are counted as such, not as wrong. Timing (early or late)
  is left out for now: the delay found from the singing includes the singer's own
  lateness, so it cannot tell the two apart.
- **Privacy:** audio is analysed as it arrives and never stored or sent. Takes
  (recordings) are a later option.

## Alternatives considered

- **Detecting on the audio thread (inside the worklet):** precise, but its cost lands on
  the thread that renders the instruments. Rejected.
- **An AnalyserNode polled from the page:** simplest, but windows are timed only roughly
  and can skip or repeat samples. Rejected for scoring.
- **YIN:** similar accuracy; MPM's key-maximum rule handles octave choices on voices well
  and needs no tuning of a threshold per voice.
- **Click-and-listen calibration:** fails with headphones. Kept as a possible extra if
  timing scores are ever wanted (it would measure the true round trip with speakers).

## Consequences

- Pitch feedback works in any browser with AudioWorklet and a microphone (Chrome, Edge,
  Firefox, Safari 14.1+), on https or localhost.
- The first few seconds of a first run on a new device may compare against the wrong
  note until the delay is found; later runs start from the remembered delay.
- `src/core/pitch` and `src/audio/dsp` stay free of the DOM, so the native app can reuse
  the detector and the scoring with their tests.
