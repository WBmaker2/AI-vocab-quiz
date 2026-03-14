# Celebration Audio Plan

## Goal

- Play a short celebration sound when a student gets one question correct in listening or speaking mode.
- Play a longer celebration sound when the student completes the full listening set or speaking set.

## Implementation Direction

1. Add a reusable `useCelebrationAudio` hook backed by the browser `AudioContext`.
2. Generate sounds in code instead of shipping audio files so deployment stays simple.
3. Expose two actions:
   - `playSuccess()`: short sound for one correct answer
   - `playCompletion()`: longer sound for quiz completion
4. Inject the hook once in `App` and pass it to both quiz components.
5. Guard playback with refs so sounds only fire once per question or once per completion state.

## Acceptance Checks

- Listening quiz plays the short sound exactly once when a correct choice is selected.
- Speaking quiz plays the short sound exactly once when a spoken answer is judged correct.
- Listening completion plays the long sound when the result screen is reached.
- Speaking completion plays the long sound when the result screen is reached.
- Production build passes after the change.
