# Gaaner Sathi · গানের সাথী

A practice companion for singers who learn Bengali songs from swaralipi (akarmatrik
notation). Type the notation once, and Gaaner Sathi plays the melody on harmonium as a
pitch guide, with tabla, dholak or drums and a tanpura drone, all on one clock so the
rhythm never drifts from the melody. It highlights the beat you are on, with the lyric
underneath.

## Status

Phase 0 of the [roadmap](docs/ROADMAP.md): turning a working single-file prototype into
a TypeScript web app. Next comes a published web app that installs and works offline,
then iOS and Android apps.

## Try the prototype

Download [`reference/gaaner-sathi.html`](reference/gaaner-sathi.html) and open it in a
browser. It runs offline and keeps your songs in that browser.

## Find your way around

| Path | What it holds |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | The project's shared state: direction, working rules, current state, decisions, work log |
| [`docs/`](docs/) | Roadmap, parity checklist, notation, engine and data specs, decision records |
| [`reference/`](reference/) | The working prototype and its reference test suites |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed, and what to try |

## Tests

`bash reference/tests/run-all.sh` (Node 18+) runs the prototype's reference suites.
GitHub Actions runs them on every push to `main`.

## Licence

GPL-3.0. See [LICENSE](LICENSE).
