# Update Info Modal Design

## Goal

Add a small `update info` button beside the visible app version in the header. When clicked, it should open a modal that shows the app's update history for all actual released versions recorded by the app, starting with `v1.0.0`, in a simple summary format.

## Why

- The app already exposes a visible version number in the header.
- Users need a simple way to understand what changed between versions without leaving the site.
- Version display and update history should stay in sync so the current label never drifts from the actual change log shown in the modal.

## Scope

In scope:

- Add a small `update info` button next to the current version label.
- Open a modal from that button.
- Show all actual released version entries recorded in the app history array, starting at `v1.0.0` and ending at the current version.
- Render each version entry as a simple summary:
  - version number
  - optional date
  - one to three short summary lines
- Keep the current visual style of the app.
- Make the modal usable on desktop, portrait phones, and landscape tablets.
- Centralize version label and update-history content in one shared source.

Out of scope:

- Fetching release notes from Firebase or any remote source.
- Rich filtering, searching, or grouping of version entries.
- A separate route or page for release notes.

## User Experience

### Header

- Keep the existing eyebrow text and version label.
- Place a small `update info` button immediately to the right of the version label.
- The button should feel secondary and compact so it does not compete with the main title.

### Modal

- Open centered over a dimmed backdrop.
- Title: `업데이트 기록`
- Subtitle can briefly explain that the list shows major app changes by version.
- Show the newest version first for faster scanning.
- Each version card should include:
  - version label such as `v1.2.14`
  - optional small date text
  - one to three short summary bullets or lines
- The current version entry should be visually highlighted.
- The modal should close via:
  - close button
  - backdrop click
  - `Esc` key
- Keyboard dismissal should be provided by the close button and `Esc` while focus remains inside the dialog.
- Backdrop dismissal is a pointer click interaction and should not require keyboard focus outside the dialog.

### Responsiveness

- On desktop: centered modal with comfortable width.
- On mobile: narrower modal with internal scrolling.
- Long history should scroll inside the modal body, not push the page layout.

## Data Model

Store version data in one shared constant module so the visible version label and modal use the same source.

Recommended shape:

```js
export const APP_UPDATES = [
  {
    version: "v1.2.14",
    date: "2026-03-21",
    summary: [
      "학교 선택 후 선생님이 1명인 경우 자동 선택",
      "공개 단원을 바로 불러오도록 학생 흐름 개선",
    ],
  },
  ...
];

export const APP_VERSION = APP_UPDATES[0].version;
```

Rules:

- `APP_UPDATES[0]` is the source of truth for the current release.
- `APP_VERSION` should be derived from `APP_UPDATES[0].version`, not manually duplicated elsewhere.
- The website UI treats `src/constants/app.js` as the canonical release-history source.
- `package.json` version is release metadata for tooling and should be kept aligned during implementation, but the UI must not read from `package.json`.
- New updates are added at the front of the array.
- Only actual shipped versions belong in the array. Missing semver numbers should not be represented by empty placeholder entries.
- Existing historical versions should be backfilled into the array once during implementation using a manually curated history from:
  - prior visible app versions already shipped in this repo
  - completed task records in `docs/`
  - matching git commit subjects when a summary needs confirmation
- After that initial backfill, `APP_UPDATES` becomes the authoritative history for all future releases.
- Summary lines should stay short and user-facing.

## Implementation Plan

### Files to touch

- `src/constants/app.js`
  - expand from a single version string to version metadata plus history
- `src/App.jsx`
  - render the new `update info` button
  - manage modal open/close state
- `src/styles/global.css`
  - add compact button styling
  - add modal, backdrop, list, and responsive styles

### Component approach

Use a small dedicated presentational component for clarity:

- `src/components/UpdateHistoryModal.jsx`
  - receives `open`, `currentVersion`, `updates`, and `onClose`
  - owns only rendering and close interactions

This keeps `App.jsx` small and avoids mixing modal markup into the main header.

## Accessibility

- Use a real `button` for the trigger.
- Give the modal a visible title and proper dialog semantics.
- Trap focus is optional for this pass, but initial focus and `Esc` close should work if feasible within current project patterns.
- The close button should be keyboard-usable, and keyboard focus should stay inside the dialog while it is open.
- Ensure version text and summaries have strong contrast.

## Content Strategy

- Use simple Korean summaries for user-facing update notes.
- Keep wording compact and classroom-friendly.
- Do not show internal engineering detail unless it affects classroom use.

## Verification

- Confirm the header shows the `update info` button next to the current version.
- Confirm clicking the button opens a modal with all actual history entries from `v1.0.0` through the current version.
- Confirm the current version entry is highlighted.
- Confirm backdrop click, close button, and `Esc` close the modal.
- Confirm the modal scrolls cleanly on small screens.
- Confirm the displayed header version and the top history entry stay identical.

## Risks

- Historical summaries still require one-time manual curation because the repo does not yet have a pre-existing changelog file.
- `package.json` can drift from the UI history if future edits update only one location. The implementation should treat `APP_UPDATES` as the UI source of truth and update `package.json` in the same release step.
