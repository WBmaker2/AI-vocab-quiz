## Teacher Profile Edit and File Reset Plan

### Goal
- Clear the file input name after the Excel import flow finishes.
- Let a signed-in teacher edit the saved school name and teacher name from the management screen.

### Design
- Add a file input ref in the teacher workspace and clear both the local file state and the DOM input value after import or grade reset.
- Reuse the existing onboarding/profile save flow for profile editing so validation and school lookup stay consistent.
- Add an edit panel in teacher mode for school/teacher name updates.
- After saving a new profile, sync existing teacher vocabulary-set metadata so saved sets keep matching the updated profile.

### Verification
- Run `npm run build`.
- Review the diff for teacher profile save flow and file input reset behavior.
