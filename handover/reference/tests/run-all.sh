#!/usr/bin/env bash
# Runs every suite against the reference prototype. Needs Node 18+. Exits non-zero if anything fails.
cd "$(dirname "$0")"
node extract.js || exit 1
status=0
for t in parser checker join-split rhythm tanpura; do
  out=$(node "$t.test.js"); code=$?
  pass=$(grep -c '^PASS' <<<"$out"); fail=$(grep -c '^FAIL' <<<"$out")
  printf '%-11s %3s passed, %s failed\n' "$t" "$pass" "$fail"
  [ $code -ne 0 ] || [ "$fail" -ne 0 ] && { grep '^FAIL' <<<"$out"; status=1; }
done
out=$(node exercises.gen.js); code=$?
printf '%-11s %3s valid,  %s failed\n' "exercises" "$(grep -c '^OK' <<<"$out")" "$(grep -c '^FAIL' <<<"$out")"
[ $code -ne 0 ] && status=1
exit $status
