# Matching Game Polish Plan

## Issues

1. The student-mode action groups feel visually cramped because the load button block and the activity buttons stack too tightly.
2. The matching game can freeze after a wrong answer because the mismatch reset timing is tied to the same effect that creates the mismatch state.
3. The matching board is using a dark presentation, but the product direction should stay bright and classroom-friendly.

## Fix Direction

1. Add vertical spacing between the vocabulary loading block and the activity action block in student mode.
2. Split mismatch detection and mismatch reset into separate effects so a wrong answer briefly highlights and then clears without stopping the game.
3. Redesign the matching board with a light card game look using pale backgrounds, stronger contrast, and bright selection feedback.

## Acceptance Checks

- Student-mode controls no longer appear visually stuck together.
- A wrong matching attempt briefly shows mismatch feedback and then allows immediate continued play.
- The matching board uses a bright, light theme instead of a dark theme.
- `npm run build` passes after the change.
