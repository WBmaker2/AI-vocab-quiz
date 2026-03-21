## Remove Sample Vocabulary Button Plan

### Goal
- Remove the teacher-side `예시 단어 불러오기` button from the grade/unit action area.

### Scope
- Remove the button from the teacher workspace UI.
- Remove the now-unused prop wiring from the app shell.
- Remove the unused teacher helper export so the code stays clean.

### Verification
- Run `npm run build`.
- Confirm the teacher workspace compiles without the sample-load action.
