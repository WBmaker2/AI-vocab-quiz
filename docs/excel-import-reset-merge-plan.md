## Excel Import Reset and Merge Plan

### Goal
- Add a teacher-side reset action for existing grade vocabulary imported through the Excel flow.
- Allow semester 1 and semester 2 Excel files to be imported in separate passes without breaking earlier units.
- Prevent duplicate workbook content from overwriting or duplicating existing vocabulary entries.

### Design
- Keep the teacher vocabulary-set model as one saved set per `grade + unit`.
- Add a grade-wide reset action that deletes all saved sets for the selected grade after confirmation.
- Change workbook import to merge per-unit items with the existing saved set for that unit.
- Treat `word + meaning` as the duplicate key, normalized by trim/lowercase.
- Keep existing entries when duplicates are found, and only append new entries.

### Verification
- Run `npm run build`.
- Smoke-check the teacher import UI text and buttons.
- Exercise import helpers with a local script to confirm:
  - duplicates are skipped,
  - new items append,
  - resetting a grade clears saved sets for that grade only.
