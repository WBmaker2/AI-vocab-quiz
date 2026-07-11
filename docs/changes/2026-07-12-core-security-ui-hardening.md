# 2026-07-12 Core Security and UI Hardening

## Release

- Version: `v1.11.0`
- Date: `2026-07-12`
- Target: Vercel production at `https://talking-vacab-quiz.vercel.app`
- Status in this branch: implemented and locally verified; not yet pushed or
  deployed

## Why This Release Exists

This release closes validated authorization, personal-record privacy,
out-of-order save, partial spreadsheet import, stale student request, and
activity-screen accessibility gaps. It also records the operational migration
steps required before production deployment.

## Teacher Authorization

- New `teachers/{uid}` documents are created with `isActive: false`.
- Teachers cannot activate themselves or change their bound school ID/name.
- Vocabulary-set writes require an active teacher and matching owner, school
  ID, and school name.
- Existing active teachers continue to work.
- Pending teachers see an approval-wait screen instead of management tabs.

### Production Action

After deploying the rules, review pending teacher documents in the Firebase
Console and set `isActive` to `true` only for verified teachers. Admin SDK
approval must run in a trusted environment, never in browser code.

## Student Personal Records

- The student UI remains name-only.
- The browser creates a random 32-character lowercase hexadecimal capability
  and stores it under `studentProfileCapabilities.v2`.
- The capability becomes part of the private profile document ID; collection
  listing remains denied.
- Clearing browser storage or moving to another device starts a new personal
  growth record.
- Legacy predictable personal profile IDs are not migrated.
- Public leaderboard history remains shared.

Leaderboard rules now reject mathematically impossible matching, fishing, and
typing results.

## Save and Import Reliability

- Automatic save, manual save, bingo pre-save, delete, grade reset, and import
  share a serialized mutation coordinator.
- Older save completions cannot overwrite newer edits or mark them clean.
- Student school/teacher/unit/set requests use generation gates; only the
  latest request can settle state.
- Vocabulary and matching set loads are mutually exclusive because they share
  game state.
- Changing the student selection invalidates the obsolete shared load lease,
  so a slow previous request cannot silently block the next load.
- Teacher set loads capture their selection and revision; a late response can
  no longer replace the items or loading state for a newer selection.
- Student profile badge arrays must contain unique allowed badge IDs, matching
  the client-side normalization contract.

Spreadsheet import changes:

- `.xlsx` only; legacy `.xls` must be re-saved in Excel.
- 5 MiB file limit and 5,000 data-row limit.
- Full validation before Firestore access.
- 499 units plus publisher metadata fit the 500-operation batch cap; 500 units
  are rejected before per-unit reads.
- Publisher metadata and every imported unit commit once in a single batch.
- The vulnerable `xlsx` package was replaced by `read-excel-file`.

## UI and Accessibility

- Home keeps the full introduction and browser-support note.
- Teacher and all activities use compact, view-specific headers.
- Navigation focuses and scrolls to the new work region.
- Loaded vocabulary shows a clear grade/unit/item readiness banner.
- Activity actions are grouped into basic study and games.
- Gradient buttons use dark text with measured contrast of at least 5.41:1.
- Visible focus rings, live status, busy semantics, 44px touch targets, and
  `prefers-reduced-motion` support were added.
- The small `업데이트 내역` button remains available in full and compact
  headers.

## Bundle and Dependencies

- Teacher and activity screens now load with `React.lazy`.
- Firebase handlers use explicit named imports.
- Spreadsheet parsing loads only when import starts.
- Vite emits separate React, Firebase, spreadsheet, vendor, and activity
  chunks.
- Baseline single app JavaScript was approximately 917 kB.
- New app-core chunk is approximately 167 kB; Firebase is approximately
  398 kB, React 192 kB, spreadsheet code 47 kB, and activity chunks 3-32 kB.
- Production dependency audit reports zero vulnerabilities after compatible
  Firebase/Vite/React updates and non-breaking audit fixes.

## Verification Gates

Before production deployment, require:

1. `npm test`
2. `npm run test:rules`
3. `npm run build`
4. `npm run test:smoke`
5. `npm audit --omit=dev`

CI runs browser smoke and Firestore rules as separate required jobs. The local
Chromium smoke could not launch inside the current macOS sandbox, so CI must
provide the browser execution evidence before deployment.
