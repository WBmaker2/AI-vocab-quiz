# Import Audio Version Plan

## Goal

- Ask for a confirmation when Excel bulk import starts so teachers can choose whether every lesson in the selected grade should be saved as student-visible.
- Stop the listening quiz from replaying the same word repeatedly unless the user presses `다시 듣기`.
- Show a small `v1.0.0` label beside the top eyebrow text and keep versioning easy to update.

## Findings

- Excel import already loops through every parsed lesson, but it starts immediately and uses the current publish state without an explicit confirmation step.
- The listening quiz auto-play is tied to a render effect with no guard that remembers whether the current question has already been announced.
- The header has no dedicated version source, so the UI version and project version can drift.

## Implementation

- Add a browser confirm in `TeacherWorkspace` before calling the Excel import handler.
- Extend the import handler to accept an explicit publish override and apply it to every saved lesson in the selected grade.
- Add a per-question `useRef` guard in `ListeningQuiz` so automatic speech runs only once for each question id, while manual replay still works from the button.
- Add an app version constant and render it next to the eyebrow text.
- Bump the project version to `1.0.0` to match the visible label.

## Verification

- `npm run build`
- Confirm the import button shows a confirm prompt before bulk save starts.
- Confirm the listening quiz only auto-reads once per question and replays only on button press.
- Confirm the version label is visible beside the eyebrow line.
