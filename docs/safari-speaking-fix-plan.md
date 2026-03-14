# Safari Speaking Mode Fix Plan

## Problem

- In Safari, the speaking screen can show `not-allowed` even when the site permission panel already shows microphone access as allowed.
- The current app treats every `not-allowed` error as a microphone permission denial.
- That causes a false error message and blocks teachers from understanding that the browser STT service itself may be unavailable.

## Root Cause Hypothesis

1. The hook considers speech recognition "supported" whenever `SpeechRecognition` or `webkitSpeechRecognition` exists.
2. Safari may expose `webkitSpeechRecognition` but still fail to start recognition for reasons other than a denied microphone permission.
3. The hook does not verify microphone access separately before calling `recognition.start()`.
4. The speaking UI maps raw browser errors directly to user guidance, so Safari service failures are mislabeled as permission failures.

## Implementation Plan

1. Add browser detection and microphone preflight checks to the speech-recognition hook.
2. Distinguish microphone permission, missing input device, and STT service failures with normalized app error codes.
3. Update the speaking UI to show Safari-specific recovery guidance when mic permission is granted but browser STT still fails.
4. Bump the visible app version for this behavior change and verify with a production build.

## Acceptance Checks

- If microphone access is actually denied, the speaking screen should still show a permission-specific message.
- If microphone permission is granted but Safari STT fails to start, the screen should no longer claim the microphone is blocked.
- The speaking UI should instead explain that Safari STT support is limited and recommend Chrome or Edge when needed.
- `npm run build` should pass after the change.
