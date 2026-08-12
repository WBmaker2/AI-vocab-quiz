# Task 2 Implementation Report

## Status

Implemented Task 2, "공통 활동 정의와 리더보드 동률 규칙 추가".

The existing Task 1 spelling utility files were not modified. Existing matching,
fishing, and typing comparison behavior remains on its previous code paths.

## Changes

- Registered `spelling` between `fishing` and `typing` in
  `ACTIVITY_LEADERBOARD_DEFINITIONS` with the exact label `철자 완성` and
  collection `spellingLeaderboards`.
- Added spelling metric detection using `revealedCount` or `totalAttempts`.
- Added spelling tie ranking in this order: score descending, correct count
  descending, total attempts ascending, elapsed time ascending, and updated time
  descending.
- Added teacher leaderboard spelling detail output: `정답`, `공개`, and `시도`.
- Added activity-definition, tie-ranking, teacher-definition, and teacher-detail
  tests.
- Added `src/utils/activityLeaderboard.test.js` to the `npm test` script.

## Verification

Focused command:

```text
node --test src/utils/activityLeaderboard.test.js src/utils/teacherLeaderboards.test.js src/components/teacher/teacherLeaderboardView.test.js
```

Result: 10 passed, 0 failed.

Existing test command:

```text
npm test
```

Result: 149 passed, 0 failed, 72 skipped. The skipped Firestore rule tests
require `FIRESTORE_EMULATOR_HOST`; this is the repository's existing test
behavior when the emulator is not running.

Additional check: `git diff --check` passed.

## Self-review

- The activity definition order matches the requested student-result and teacher-tab order.
- Spelling records use a dedicated comparator and do not enter the existing matching or typing comparators.
- The existing matching, fishing, and typing branches were left unchanged.
- No Task 1 spelling utility files, Firebase persistence paths, or later-task game UI files were changed.

## Concerns

- Firestore emulator-backed tests were not executed because `FIRESTORE_EMULATOR_HOST` was not configured; they were reported as skipped by the existing suite.
- This task only registers the shared definition and comparison/display rules. Spelling leaderboard persistence and Firebase routing remain outside the Task 2 brief.

## Commit

- `952aefa` `feat: register spelling leaderboard activity`
- The report hash update is committed separately so the implementation commit is not amended.

## Fix Round 1

### Finding Addressed

Expanded `src/utils/activityLeaderboard.test.js` so spelling tie ranking is
verified independently at every requested comparison level:

- score descending
- correct count descending
- total attempts ascending
- elapsed time ascending
- updated time descending

Added a regression assertion for the existing matching score/time comparison
and typing score/accuracy comparison. The spelling field-based
`hasSpellingMetrics` behavior was not changed.

### Scope Boundary

`src/lib/firebase.js` was not modified. Firebase spelling dispatch remains a
Task 3 concern as specified by the review resolution.

### Changed Files

- `src/utils/activityLeaderboard.test.js`
- `.superpowers/sdd/2026-08-09-word-spelling-game/task-2-report.md`

### Verification

Focused command:

```text
node --test src/utils/activityLeaderboard.test.js src/utils/teacherLeaderboards.test.js src/components/teacher/teacherLeaderboardView.test.js
```

Output: 11 passed, 0 failed, 0 skipped.

Full command:

```text
npm test
```

Output: 150 passed, 0 failed, 72 skipped. The skipped tests require
`FIRESTORE_EMULATOR_HOST`; no test failures occurred.

Additional check: `git diff --check` passed before the fix commit.

### Fix Commit

- `628628d` `test: cover spelling leaderboard tie order`
- The report append is committed separately so the test commit is not amended.
