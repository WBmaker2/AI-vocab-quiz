## Teacher Profile Permission Fix Plan

### Goal
- Fix the permission error that appears when a teacher edits the saved school name.

### Root Cause
- The profile save flow was writing extra fields to `schools` documents during create.
- The same save flow also tried to update existing `schools` documents even though Firestore rules block school updates.
- The app no longer needs those school counter writes for any active feature.

### Fix
- Keep `schools` writes limited to the minimal create payload allowed by Firestore rules.
- Stop updating `schools` documents during teacher profile save.
- Continue updating the signed-in teacher profile and owned vocabulary-set metadata.

### Verification
- Run `npm run build`.
- Confirm teacher profile save code no longer writes forbidden school fields.
