# Reference test suites

These pin down the prototype's behaviour. Port them one-for-one before you change behaviour.

    ./run-all.sh        # Node 18+; extracts the pure code from ../gaaner-sathi.html, then runs everything

| Suite | Covers |
|---|---|
| `parser.test.js` | Reading Bengali and Sa Re Ga notation, beat grouping, octave marks, source offsets, octave shifting |
| `checker.test.js` | Bar-length and octave-slip checks, including deliberate-leap exemptions |
| `join-split.test.js` | Joining and splitting beats in the text |
| `rhythm.test.js` | Speed mapping (half, double), fills, layers landing inside every taal |
| `tanpura.test.js` | Tanpura string tuning (under 3 cents, measured under 0.05) and decay |
| `exercises.gen.js` | Generates the 12 built-in exercises from compact Sa Re Ga specs, converts them to Bengali, and checks each one plays identically and passes the checker |

`extract.js` finds the code between the `/*PARSER-START*/`, `/*KS-START*/` markers and the rhythm section of the HTML. If you edit the prototype, keep those markers.
