# Task 3 Implementation Report

## Scope

Implemented spelling leaderboard persistence, reads, teacher rename/delete operations, and Firestore security rules.

Modified only the requested implementation and test files:

- `src/lib/firebase.js`
- `src/lib/firebase.test.js`
- `firestore.rules`
- `tests/firestore.rules.test.js`

## Implementation

- Added `validateSpellingLeaderboardResult` with bounded score, elapsed time, question, completion, accuracy, and attempt validation.
- Added explicit `spellingLeaderboards/{scopeKey}/entries/{studentKey}` payload, reference, upsert, fetch, and save helpers.
- Added spelling tie ordering: score descending, correct count descending, total attempts ascending, elapsed time ascending, then updated time descending.
- Added explicit spelling branches for teacher leaderboard fetch, student rename, and student deletion without changing matching, fishing, or typing branches.
- Added spelling Firestore document validation, student improvement rules, and same-school teacher maintenance permissions.

## Verification

- `node --test src/lib/firebase.test.js`: 12 passed.
- `npm run test:rules`: 76 passed with the Firestore emulator started successfully.
- `npm test`: 152 passed, 76 rules tests skipped because this direct run does not start the emulator; the dedicated `npm run test:rules` run verified all 76 rules tests.
- `node --check src/lib/firebase.js`: passed.
- `git diff --check`: passed.

## Review Notes

No unresolved concerns were found. Existing matching, fishing, and typing behavior remained unchanged in the focused review and regression suite.

## Fix Round 1

### Finding

The spelling leaderboard teacher delete rule previously checked only the resource school ownership. A same-school teacher could therefore address a spelling entry through a mismatched `scopeKey` or `studentKey` path.

### Fix

- Changed `isSpellingLeaderboardTeacherDelete` to require the request path `scopeKey` to equal `resource.data.scopeKey`.
- Changed the same helper to require the request path `studentKey` to equal `resource.data.studentNameNormalized`.
- Preserved the existing matching, fishing, and typing delete rules.
- Added emulator coverage for existing documents at mismatched student-key and scope-key paths, plus a valid same-school teacher delete.
- No Firebase unit test was added because this is a Firestore rules path-integrity contract covered directly by emulator tests.

### Verification

- `npm run test:rules`: PASS — Firestore emulator started successfully; 79 passed, 0 failed, 0 skipped.
- `node --test src/lib/firebase.test.js`: PASS — 12 passed, 0 failed.
- `npm test`: PASS — 152 passed, 0 failed, 79 skipped because the direct test script does not start the Firestore emulator.
- `git diff --check`: PASS.

### Commit

- Fix commit: `c7a425daefe4ba92ec44ca8f3be322c7032eb5bb`
