# Matching Animation Plan

## Goal

- Make correct matches feel more satisfying with a 1-second fade-out animation before replacement cards appear.
- Simplify wrong-answer feedback so only the mismatched cards flash and recover.
- Keep the matching screen fully student-facing in all states.

## Changes

1. Track a temporary `matchedPair` state when the selected cards form a correct pair.
2. Apply a fade-out animation class to the matched cards for 1 second.
3. After the animation, replace or remove those card slots and continue the game.
4. Remove the temporary wrong-answer text banner and keep only the orange mismatch flash.
5. Replace any leftover teacher-only empty-state action with a student-facing return path.

## Acceptance Checks

- Correctly matched left/right cards fade out over about 1 second before replacement.
- New cards appear only after the fade-out finishes.
- Wrong matches only flash the cards and then reset without extra text.
- The empty matching state does not expose teacher-only actions.
- `npm run build` passes after the change.
