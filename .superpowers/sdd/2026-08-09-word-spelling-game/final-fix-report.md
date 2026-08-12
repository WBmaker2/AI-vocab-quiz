# Spelling Completion Final Fix Report

## Status

All final-review findings are addressed in one focused fix wave. No matching,
fishing, or typing behavior was changed.

## Fixes

- The spelling leaderboard now requires the exact integer score:
  `100 * questionCount + 30 * correctCount - 30 * totalAttempts`.
  JavaScript validation and Firestore rules enforce the same invariant. The
  fixtures use the valid 3-question result of 210 points, and reject the
  bounded but impossible 200-point result.
- Used spelling-mask signatures now persist by normalized word between retries
  and restarts of the same normalized item sequence. They clear when that
  sequence changes and on component unmount. Item order and duplicates remain
  unchanged.
- One-letter words now expose no letter clue and render as an underscore. The
  existing 3-4, 5-7, 8-10, and 11+ clue policies are unchanged.
- Spelling-specific validator, payload builder, comparator, fetch/save logic,
  and teacher rename/delete operations now live in
  `src/lib/spellingLeaderboard.js` (453 lines). `src/lib/firebase.js` keeps
  the existing public spelling exports as thin wrappers.

## Verification

- `node --test src/utils/wordSpelling.test.js src/utils/activityLeaderboard.test.js src/lib/firebase.test.js`: 26 passed.
- `npm test`: 156 passed, 79 Firestore-emulator tests skipped by the direct test command.
- `npm run test:rules`: 79 passed with the Firestore emulator.
- `npm run build`: passed.
- `npm run test:smoke`: passed.
- `git diff --check`: passed.

## Scope Notes

No live or production verification was performed or claimed. Existing
untracked plan documents were left untouched.

## Fix Round: Final Review Follow-up

- P1: `createSpellingMask` now accepts the actual previous signature, while
  `createSpellingQuestions` records the last selected signature separately
  from the used-signature set. `WordSpellingGame` retains both maps across
  retries/restarts for the same normalized item sequence and clears them on
  item changes and unmount. The deterministic exhaustion regression confirms
  that consecutive masks do not repeat while another candidate exists.
- P2: `compareSpellingLeaderboardEntries` is exported as a numeric comparator,
  returns `0` for complete ties, and is used directly by `fetchPeriod` sorting.
  The picker remains in place for upsert and teacher rename behavior.

## Fix Round Verification

- `node --test src/utils/wordSpelling.test.js src/utils/activityLeaderboard.test.js src/lib/firebase.test.js`: 28 passed.
- `npm test`: 158 passed, 79 Firestore-emulator tests skipped by the direct test command.
- `npm run test:rules`: 79 passed with the Firestore emulator.
- `npm run build`: passed.
- `npm run test:smoke`: passed.
- `git diff --check`: passed.
- Fix commit: `850a9468491de56ce4ce0bbb43053b002b1f01de`.

No push, deployment, or live verification was performed.
