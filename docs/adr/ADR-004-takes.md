# ADR-004: Takes — how the voice is recorded, kept and played back

**Status:** accepted (Claude, 2026-10-11, building Rinat's pick "record takes and play them
back against the guide"). Rinat can veto.

## Context

A take is only useful against the guide if the voice lands where it was sung: a few tens of
milliseconds off and the singer hears a timing mistake that was never made. The app already
has one clock (the AudioContext that schedules the guide, ADR-003) and a capture worklet
for pitch feedback. Sound files are large; localStorage holds a few megabytes of text.

## Decision

- **Capture:** the microphone (voice processing off, as for pitch feedback) into the same
  capture worklet, whose blocks are stamped with AudioContext frame numbers. A take keeps the
  frames from the run's first scheduled beat (count-in included) to a moment after it stops.
  Missing blocks become silence, so later samples keep their time. No MediaRecorder: its
  start time is not on the AudioContext clock and its encoders add an unknown delay.
- **Size:** the rate is halved as samples arrive (a 31-tap half-band filter, then every other
  sample) and kept as 16-bit numbers: 24 kHz, 48 kB a second, about 2.9 MB a minute, and the
  page never holds a long take at the full rate. A take is at most 15 minutes.
- **Storage:** IndexedDB (database `gaanersathi`): `takes` holds each take's details, indexed
  by song; `audio` holds its samples, so listing never loads sound. Takes stay in the browser
  like everything else; Download writes a WAV file the singer chooses to keep.
- **Playback against the guide:** the transport plays the take's lines with its rounds, the
  song's tempo then (or a rewaz item's), its count-in and tempo trainer, and the guide every
  round. The voice starts at the run's first scheduled beat, skipping `lag` seconds of the
  take: the delay from a beat to the voice reaching the app (sound out, the singer, sound in),
  as pitch feedback last found it, else the device's own figure. Both then leave through the
  same output, so they line up. It stops when the voice ends.
- A take of a song whose notation has changed since says so (a fingerprint of the text).
  Playing a take back is not practice, so it is not logged.

## Consequences

- The alignment is exact on the clock; how well it sounds depends on `lag`, which is only as
  good as the device's figure until pitch feedback has heard the singer once. Rinat's ears
  are the check.
- IndexedDB can be cleared with site data, like the songs; the browser may evict it under
  storage pressure unless the site is installed or persisted. The list says "Takes stay in
  this browser", and Download is the way to keep one.
- In a private window, or with site data off, recording is refused with a message.
