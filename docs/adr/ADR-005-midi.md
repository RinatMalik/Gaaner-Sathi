# ADR-005: Keyboards over MIDI

**Status:** accepted (Claude, 2026-10-11, building Rinat's picks: type a song by playing it,
play the guide on the keyboard's own sound, show which key to press). Rinat can veto.

## Context

Rinat practises with a Casio CT-X3000 and asked whether this would work only with that
keyboard. The app must stay light: no libraries, nothing to install.

## Decision

- **Web MIDI, built into the browser, for any keyboard.** A keyboard that shows up as a MIDI
  device (USB "to host", or a MIDI interface) works the same; nothing is Casio-specific.
  Chrome and Edge on a computer and Chrome on Android have Web MIDI; Firefox needs a site
  permission add-on; Safari and iPhones have none (the Connect button says so). Connecting is
  one button in the Sound settings; a keyboard allowed before reconnects by itself.
- **Typing:** while the editor is showing, each key pressed is a beat, written from the
  song's Sa (two octaves either side), into the beat boxes or at the caret. Keys pressed
  together (an octave) type the highest once. Holds and rests come from the palette.
- **The guide on the keyboard:** "Guide plays on: This device / The keyboard / Both". The
  transport tells the keyboard part of each guide note as it schedules it; notes go out on
  channel 1, timed on the performance clock from `getOutputTimestamp()`, so they sound with
  the tabla (output delay included). Just after the AudioContext starts, that reading is
  zeros and then drifts by about 30 ms over its first 20 ms of sound (measured in Edge), so
  notes wait for a settled reading (they are scheduled a tenth of a second ahead). The sound
  is the keyboard's own by default (whatever tone is selected on it); General MIDI reed organ
  or accordion can be asked for (bank 0, program 20 or 21). Stop sends all-notes-off at
  once and again after anything already queued (browsers cannot take back queued messages).
- **Which key to press:** a keyboard drawn on the Practice view (whole octaves around the
  song, each Sa marked) lights the key of each note as it plays and outlines the next, and
  names it ("D4 · White 2", counting keys as on the CT-X3000). It needs no MIDI.

## Consequences

- No new dependency; the MIDI code is a few hundred lines with its sums tested in Node.
- Not heard on a real keyboard yet: the CT-X3000's response to channel 1 (its selected tone)
  and to General MIDI program changes needs Rinat's ears. Channels and tone numbers specific
  to one brand are deliberately left out.
- Typing from the keyboard is note by note (step entry), not timed playing: the rhythm comes
  from the taal and the boxes.
