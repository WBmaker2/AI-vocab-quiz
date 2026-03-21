# Update Info Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small `update info` button beside the header version label and open a modal that shows the app's full release history from `v1.0.0` through the current shipped version.

**Architecture:** Keep the UI release history in a single source inside `src/constants/app.js`, derive the visible header version from the newest history entry, and render a dedicated modal component from `App.jsx`. Use existing global styling patterns so the modal feels native to the current app and remains responsive on desktop and mobile.

**Tech Stack:** React 19, Vite, plain CSS via `src/styles/global.css`, Playwright MCP smoke checks, npm build verification

---

## File Map

- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/app.js`
  - Expand from a single version constant into canonical release-history data plus derived current version.
- Create: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/components/UpdateHistoryModal.jsx`
  - Render the modal, backdrop, close button, and version-history list.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/App.jsx`
  - Add the `update info` button, manage modal open/close state, and pass history into the modal.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/styles/global.css`
  - Add compact trigger-button styles and modal layout/scroll/responsive styling.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/scripts/playwright_smoke.js`
  - Extend the existing smoke script so the update-history modal flow is covered automatically.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/package.json`
  - Keep package version aligned with the newest history entry for release discipline.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/package-lock.json`
  - Keep lockfile version aligned with `package.json`.
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/docs/superpowers/specs/2026-03-21-update-info-modal-design.md`
  - Only if implementation reveals a small spec clarification is needed.

## Task 1: Curate Canonical Release History

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/app.js`
- Reference: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/docs/`
- Reference: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/package.json`

- [ ] **Step 1: Gather shipped version evidence**

Run:

```bash
git log --oneline --decorate -n 30
rg -n "v1\\.|APP_VERSION|version" docs src package.json
```

Expected:
- A usable list of prior visible versions and feature milestones from commits and docs.

- [ ] **Step 2: Draft the history array**

Add a structure in `src/constants/app.js` like:

```js
export const APP_UPDATES = [
  {
    version: "v1.2.14",
    date: "2026-03-21",
    summary: [
      "학교 선택 후 선생님이 1명인 경우 자동 선택",
      "학생이 공개 단원을 바로 이어서 고를 수 있도록 흐름 개선",
    ],
  },
];

export const APP_VERSION = APP_UPDATES[0].version;
```

Expected:
- History includes all actual shipped UI versions from `v1.0.0` onward.
- Each entry has one to three short Korean summary lines.

- [ ] **Step 3: Align package version**

Set:

```json
"version": "1.2.14"
```

Expected:
- `package.json` and `package-lock.json` match the top history entry's version number without the `v` prefix.

## Task 2: Build the Update History Modal Component

**Files:**
- Create: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/components/UpdateHistoryModal.jsx`

- [ ] **Step 1: Write the modal component skeleton**

Create:

```jsx
export function UpdateHistoryModal({ open, currentVersion, updates, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="update-modal-backdrop" onClick={onClose}>
      <section
        className="update-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="update-modal-header">
          <div>
            <p className="mode-label">Update Info</p>
            <h2 id="update-history-title">업데이트 기록</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}
```

Expected:
- Clean presentational component that owns rendering plus close interactions for backdrop clicks, the close button, and the `Esc` key.

- [ ] **Step 2: Render the release list**

Add a list body shaped like:

```jsx
<div className="update-modal-body">
  {updates.map((entry) => (
    <article
      key={entry.version}
      className={
        entry.version === currentVersion
          ? "update-entry update-entry-current"
          : "update-entry"
      }
    >
      <div className="update-entry-meta">
        <strong>{entry.version}</strong>
        {entry.date ? <span>{entry.date}</span> : null}
      </div>
      <ul>
        {entry.summary.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  ))}
</div>
```

Expected:
- Newest entry first, current version clearly emphasized.

## Task 3: Wire the Trigger Into the Header

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/App.jsx`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/app.js`

- [ ] **Step 1: Import the modal and update data**

Add imports for:

```jsx
import { UpdateHistoryModal } from "./components/UpdateHistoryModal.jsx";
import { APP_UPDATES, APP_VERSION } from "./constants/app.js";
```

- [ ] **Step 2: Add modal state**

Add:

```jsx
const [updateModalOpen, setUpdateModalOpen] = useState(false);
```

- [ ] **Step 3: Add the header trigger**

Render:

```jsx
<div className="hero-meta">
  <p className="eyebrow">Elementary English Classroom App</p>
  <span className="app-version">{APP_VERSION}</span>
  <button
    type="button"
    className="update-info-button"
    onClick={() => setUpdateModalOpen(true)}
  >
    update info
  </button>
</div>
```

Expected:
- Trigger appears beside the current version and stays visually secondary.

- [ ] **Step 4: Mount the modal**

Render near the end of `App`:

```jsx
<UpdateHistoryModal
  open={updateModalOpen}
  currentVersion={APP_VERSION}
  updates={APP_UPDATES}
  onClose={() => setUpdateModalOpen(false)}
/>
```

Expected:
- Clicking the trigger opens the modal with current history data.

- [ ] **Step 5: Add keyboard close inside the modal**

Implement an effect in `UpdateHistoryModal.jsx`:

```jsx
useEffect(() => {
  if (!open) return undefined;

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [open, onClose]);
```

Expected:
- `Esc` closes the modal cleanly.

## Task 4: Style the Modal and Trigger

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/styles/global.css`

- [ ] **Step 1: Add trigger styles**

Add focused compact styling for `.update-info-button` so it sits cleanly beside `.app-version`.

Expected:
- Small, readable button that does not overpower the hero header.

- [ ] **Step 2: Add modal layout styles**

Add styles for:

```css
.update-modal-backdrop {}
.update-modal {}
.update-modal-header {}
.update-modal-body {}
.update-entry {}
.update-entry-current {}
.update-entry-meta {}
```

Expected:
- Centered modal, dim backdrop, current version highlight, internal scroll.

- [ ] **Step 3: Add responsive rules**

Add breakpoints so:
- modal width shrinks on mobile
- body scroll stays inside modal
- header row wraps cleanly if needed

Expected:
- Works on desktop, portrait phones, and landscape tablets without layout breakage.

## Task 5: Verify Behavior

**Files:**
- Test target: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/App.jsx`
- Test target: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/components/UpdateHistoryModal.jsx`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/scripts/playwright_smoke.js`

- [ ] **Step 1: Run production build**

Run:

```bash
npm run build
```

Expected:
- Build succeeds with no new errors.

- [ ] **Step 2: Run local preview**

Run:

```bash
npm run preview -- --host 127.0.0.1 --port 4175
```

Expected:
- App is reachable locally for smoke checks.

- [ ] **Step 3: Smoke check modal flow in browser**

Verify:
- `update info` button is visible beside the header version
- clicking opens the modal
- history shows from `v1.0.0` through current version
- top entry matches the visible header version
- current version entry is highlighted
- backdrop click and close button work
- `Esc` closes the modal

- [ ] **Step 4: Extend the existing smoke script**

Add a lightweight modal-flow check in `scripts/playwright_smoke.js` that:
- opens the home screen
- clicks the `update info` button
- confirms the modal title and current version entry appear
- closes the modal successfully

Expected:
- The update-history modal is covered by the repo's existing smoke-test path.

- [ ] **Step 5: Run the smoke script**

Run:

```bash
npm run test:smoke
```

Expected:
- The smoke script passes with the new modal coverage.

- [ ] **Step 6: Verify responsive behavior in a narrow viewport**

Check with Playwright MCP or the smoke script using a narrow viewport such as `390x844`:
- the modal stays inside the viewport
- internal scrolling works
- the trigger remains usable

Expected:
- Phone-sized layout behaves correctly.

- [ ] **Step 7: Review diff for release-data drift**

Run:

```bash
git diff -- src/constants/app.js src/App.jsx src/components/UpdateHistoryModal.jsx src/styles/global.css package.json package-lock.json
```

Expected:
- Version display, history array, and package version stay aligned.

- [ ] **Step 8: Prepare commit only after explicit user approval**

Run:

```bash
git status --short
```

Expected:
- Confirm exactly which files changed.
- Ask the user before any `git add`, `git commit`, push, or deployment step.
