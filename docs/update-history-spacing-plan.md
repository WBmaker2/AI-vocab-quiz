## Update History Spacing Plan

### Goal
- Add visible spacing between the version label and date text in the update history modal.

### Design
- Keep the existing single-line layout.
- Make the version/date meta row an inline flex container with a small `gap` so the spacing is reliable across fonts and screen widths.
- Bump the visible app version for this UI polish change.

### Verification
- Run `npm run build`.
- Confirm the update history modal shows a readable gap between version and date.
