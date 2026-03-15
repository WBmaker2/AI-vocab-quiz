# Matching Result Follow-up Plan

## Goal

- Make the matching-game result screen read naturally for students.
- Remove teacher-only actions from the student result flow.
- Let students return directly to unit selection for another matching round.

## Changes

1. Show the final score as `숫자 + 점`.
2. Remove `단어 세트 수정` from the matching result screen.
3. Add a `게임 단원 선택` button that returns to the home screen with the matching unit picker already open.

## Acceptance Checks

- The score is rendered like `2349점`.
- The result screen no longer shows a teacher-only action.
- The new `게임 단원 선택` button returns to student mode and opens the matching unit selector.
- `npm run build` passes after the change.
