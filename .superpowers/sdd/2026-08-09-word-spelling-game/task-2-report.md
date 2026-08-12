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

The commit hash is recorded here after the implementation is committed.
