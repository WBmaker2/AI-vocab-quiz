# Matching Completion And Concurrency Plan

## Problem

- The matching game can reach a state where all cards are gone but the completion screen does not open.
- Correct-match fade animations should run independently when multiple matches happen in quick succession.

## Root Cause

1. Completion was being decided inside a timeout callback using a local variable updated from `setGameState`, which is not reliable for completion detection.
2. Correct-match animation state originally assumed one active matched pair, which is not enough when several correct pairs are solved back-to-back.

## Fix Direction

1. Track multiple active matched pairs at once with independent timeout entries.
2. Decide completion from the actual board state after removals, not from a mutable local variable inside the timeout callback.
3. Keep matched cards individually animated for 2 seconds while leaving the rest of the board interactive.

## Acceptance Checks

- The game reaches the completion screen after the final matched pair fully disappears.
- If three correct pairs are solved in quick succession, each pair still gets its own full 2-second fade animation.
- The remaining unmatched cards stay clickable during those fade animations.
- `npm run build` passes after the change.
