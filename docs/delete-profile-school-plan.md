## Teacher Profile Delete Plan

### Goal
- Add `선생님 정보 삭제` and `학교 정보 삭제` buttons to the teacher profile editor.
- Require an explicit confirmation dialog before destructive deletion runs.

### Data Scope
- Both actions are limited to the currently signed-in teacher.
- Both actions delete:
  - the current teacher profile document
  - all vocabulary sets owned by the current teacher
- Neither action deletes shared `schools` documents or data owned by other teachers.

### UX Difference
- `선생님 정보 삭제`
  - after deletion, return to onboarding with both school name and teacher name cleared
- `학교 정보 삭제`
  - after deletion, return to onboarding with school name cleared but teacher name preserved for quick re-registration

### Verification
- Run `npm run build`.
- Review Firestore rules and delete paths.
- Confirm the editor shows confirmation dialogs before deletion.
