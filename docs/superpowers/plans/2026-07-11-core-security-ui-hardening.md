# Core Security and UI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the validated authorization, privacy, data-loss, stale-request, dependency, and accessibility gaps while preserving the classroom workflows and the name-only student experience.

**Architecture:** Keep the existing React/Vite/Firebase shape, but move trust decisions into Firestore rules, use an unguessable device-held capability for private student profiles, and make asynchronous state transitions generation-aware. Introduce small pure utilities for security-sensitive identifiers, autosave state, import planning, and request freshness so behavior can be covered by Node tests before React/Firebase integration. Preserve public school leaderboards, but only accept internally consistent game results.

**Tech Stack:** React 19, Vite 7, Firebase Auth/Firestore, Firestore Rules emulator, Node test runner, Playwright, CSS.

## Global Constraints

- Keep the student UI name-only. Do not add a PIN, password, login, recovery-code, or token field.
- Personal growth records are private to the browser/device that created them. Use a cryptographically random 32-character lowercase hexadecimal capability token stored only in `localStorage` under `studentProfileCapabilities.v2`.
- Student profile document IDs must be `<schoolId>__<grade>__<normalizedName>__<token>`. Firestore collection listing stays denied. Existing deterministic profile IDs are intentionally not migrated and become inaccessible to students after the rule change; document the one-time history reset.
- Public leaderboards remain readable. Anonymous score writes are accepted only when all fields are bounded and mathematically consistent with the corresponding game.
- Existing active teachers continue working. New teacher profiles start pending (`isActive: false`); only privileged Firebase administration may activate them. Teachers may not change their own activation status or school binding.
- A pending teacher must see a clear approval-wait state and must not see or use set-management, import, bingo, or leaderboard administration controls.
- Never let an older async response, save completion, or import step overwrite a newer user choice or edit.
- Excel import must validate the complete file before any Firestore write and then commit profile publisher changes and vocabulary-set changes atomically.
- Maximum import size is 5 MiB and maximum parsed data rows is 5,000. Reject larger inputs with a Korean user-facing message.
- Preserve existing unrelated work and the existing Korean classroom terminology.
- Follow test-driven development for Tasks 1-6: add a failing focused test first, capture RED evidence, implement, then capture GREEN evidence. Run the full `npm test` suite once before each task commit.
- Each task must be one independently reviewable commit. Do not push or deploy as part of these tasks.
- Update release documentation before any future deployment. The release version for this bundle is `1.11.0` dated `2026-07-11`.

---

## Task 1: Enforce Teacher Approval and School-Bound Authorization

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore.rules.test.js`
- Modify: `src/lib/firebase.js`
- Modify: `src/lib/firebase.test.js`
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/components/TeacherWorkspace.jsx`
- Modify: `src/components/teacher/teacherWorkspaceView.js`
- Modify: `src/components/teacher/teacherWorkspaceView.test.js`
- Modify: `src/styles/global.css`
- Modify: `docs/firebase-setup.md`

- [ ] Add failing rule tests proving a signed-in user cannot create an active teacher profile, cannot activate a pending profile, cannot change their bound school, and cannot write vocabulary sets while pending.
- [ ] Add positive rule tests proving a pending profile can update allowed self-service fields without changing `isActive`/school binding and an existing active teacher can manage only vocabulary sets for their bound school.
- [ ] Make teacher document creation require `isActive == false`, a non-empty school ID/name, the authenticated UID, and a bounded display name. On owner updates, require `isActive`, `schoolId`, and `schoolName` to remain unchanged.
- [ ] Tighten `vocabularySets` create/update/delete so the authenticated teacher is active, owns the set, is bound to its school, and cannot move an existing set between schools or owners.
- [ ] Change `upsertTeacherProfile()` so new profiles are pending and updates never send a client-selected activation value. Return `isActive` from teacher profile reads.
- [ ] Propagate pending state through `useVocabularyLibrary` and render a focused Korean approval-wait card in `TeacherWorkspace` instead of management tabs.
- [ ] Document how the project owner activates a teacher through the Firebase console/Admin SDK and how to identify pending requests.
- [ ] Run focused tests: `node --test src/lib/firebase.test.js src/components/teacher/teacherWorkspaceView.test.js` and `npm run test:rules`.
- [ ] Run `npm test`, commit as `fix: require teacher approval for school access`, and write the implementation report.

## Task 2: Make Student Growth Records Device-Private and Bound Leaderboard Scores

**Files:**
- Create: `src/utils/studentProfileCapability.js`
- Create: `src/utils/studentProfileCapability.test.js`
- Modify: `src/utils/studentProgress.js`
- Modify: `src/utils/studentResultSave.test.js`
- Modify: `src/lib/firebase.js`
- Modify: `src/lib/firebase.test.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore.rules.test.js`
- Modify: `package.json`
- Modify: `docs/firebase-architecture.md`

- [ ] Add unit tests for stable per-profile capability lookup, separate tokens for different school/grade/name scopes, exact 32-hex token validation, corrupt-storage recovery, unavailable-storage behavior, and dependency-injected deterministic generation.
- [ ] Implement capability storage under `studentProfileCapabilities.v2` using `crypto.getRandomValues`; never expose the token in rendered UI or logs.
- [ ] Change student profile references and IDs to append the capability token. Saving creates a token if missing; fetching returns no profile when this browser has no token for the requested student scope.
- [ ] Persist immutable `profileToken` and verify path fields/token consistency in Firestore rules. Keep `list` denied and allow `get`/create/update only for capability-shaped documents whose ID matches their immutable data.
- [ ] Add client payload validation and rule bounds: matching `1 <= solvedPairs <= 100`, integer elapsed time `0..7200`, and `0 <= score <= solvedPairs * 100`; fishing counts are integers, total rounds `1..10`, `score <= correctCount * 140`, and `correctCount + wrongCount + missCount <= 10`; typing uses `1 <= questionCount <= 500`, `correctCount <= questionCount`, `hintUsedCount <= questionCount`, `bestCombo <= correctCount`, integer accuracy `0..100` equal to the rounded client percentage tolerance (`abs(accuracy * questionCount - correctCount * 100) <= questionCount`), elapsed time `0..86400`, and `score <= correctCount * 140`.
- [ ] Keep teacher leaderboard edit/delete paths working only for active teachers bound to the school.
- [ ] Add emulator tests rejecting legacy predictable profile paths, token mutation, cross-scope field mutation, and impossible scores while accepting representative valid results for all three games.
- [ ] Document that existing personal growth history starts fresh once on the updated device-private model, while public leaderboard history remains.
- [ ] Add the new unit test to `npm test`; run it plus `src/utils/studentResultSave.test.js`, `src/lib/firebase.test.js`, and `npm run test:rules`.
- [ ] Run `npm test`, commit as `fix: protect device-scoped student records`, and write the implementation report.

## Task 3: Prevent Teacher Autosave from Losing Newer Edits

**Files:**
- Modify: `src/utils/teacherSetManager.js`
- Modify: `src/utils/teacherSetManager.test.js`
- Modify: `src/hooks/teacher/useTeacherSetManager.js`

- [ ] Add failing tests that model edit A beginning a save, edit B scheduling a newer save, save A resolving, and confirm save A cannot cancel B's timer or mark B clean.
- [ ] Add a small revision-based autosave state utility: every edit increments the revision; a scheduled save captures its revision; completion may mark clean only when its revision equals the latest revision.
- [ ] Keep separate refs for the current debounce timer and in-flight save revision. A callback may clear only the timer identity it owns.
- [ ] Ensure stale success/failure completions do not overwrite the status for a newer edit, and manual save still saves the latest snapshot.
- [ ] Preserve unmount timer cleanup without attempting to roll back an in-flight Firestore write.
- [ ] Run `node --test src/utils/teacherSetManager.test.js`, then `npm test`.
- [ ] Commit as `fix: make teacher autosave revision safe` and write the implementation report.

## Task 4: Make Excel Import Atomic, Bounded, and Free of the XLSX Vulnerability

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/utils/xlsxImport.js`
- Create or modify: `src/utils/xlsxImport.test.js`
- Modify: `src/hooks/teacher/useTeacherSetManager.js`
- Modify: `src/lib/firebase.js`
- Modify: `src/lib/firebase.test.js`
- Modify: `src/components/teacher/TeacherBulkTab.jsx`

- [ ] Replace `xlsx` with the maintained browser package `read-excel-file`; preserve first-sheet parsing and the existing accepted Korean/English header aliases.
- [ ] Add the parser test file to `npm test` and add RED tests for the 5 MiB file cap, 5,000-row cap, malformed rows, duplicate-unit merge behavior, and a fully validated import plan with no writes during parsing.
- [ ] Parse and validate the entire workbook before saving publisher information or vocabulary sets. Return a complete import plan grouped by unit.
- [ ] Add a dedicated Firestore batch helper that atomically updates the teacher publisher profile and all affected vocabulary-set documents. Reject plans that exceed Firestore's 500-operation batch limit before starting the write.
- [ ] Replace sequential per-unit saves with one batch call; on parse or validation failure, leave all remote state unchanged and show one actionable Korean error.
- [ ] Disable repeated import submission while parsing/saving and show a distinct busy label.
- [ ] Move `playwright` from runtime `dependencies` to `devDependencies` while editing the lockfile.
- [ ] Run `node --test src/utils/xlsxImport.test.js src/lib/firebase.test.js`, `npm test`, `npm run build`, and `npm audit --omit=dev`; the direct `xlsx` advisory must be gone.
- [ ] Commit as `fix: make spreadsheet imports atomic and bounded` and write the implementation report.

## Task 5: Ignore Stale Student-Set Loading Responses

**Files:**
- Modify: `src/utils/studentSetLoader.js`
- Modify: `src/utils/studentSetLoader.test.js`
- Modify: `src/hooks/student/useStudentSetLoader.js`
- Modify: `src/components/ModeSelector.jsx`

- [ ] Add failing tests for request-generation behavior: only the newest school search, teacher/unit lookup, vocabulary-set load, and matching-set load may commit success, error, or loading completion.
- [ ] Add a small request gate utility whose `begin()` returns a generation and whose `isCurrent()` guards every state commit.
- [ ] Give each independent async lane its own gate. Invalidate dependent lanes immediately when school, teacher, grade, or unit changes.
- [ ] Ensure stale `finally` blocks cannot clear a newer loading indicator and stale errors cannot replace the current status.
- [ ] Disable school search and set-load buttons while their corresponding request is active, with clear Korean progress labels.
- [ ] Convert school search to a form so Enter submits exactly once and does not trigger unrelated controls.
- [ ] Run `node --test src/utils/studentSetLoader.test.js`, then `npm test`.
- [ ] Commit as `fix: discard stale student loader responses` and write the implementation report.

## Task 6: Improve Activity Focus, Information Density, Contrast, and Motion Accessibility

**Files:**
- Modify: `src/utils/appChrome.js`
- Modify: `src/utils/appChrome.test.js`
- Modify: `src/App.jsx`
- Modify: `src/components/ModeSelector.jsx`
- Modify: `src/components/BrowserSupportNotice.jsx`
- Modify: `src/styles/global.css`
- Modify: `scripts/playwright_smoke.js`

- [ ] Add failing layout tests proving home keeps the full introduction while teacher and every student activity use compact chrome; global browser support content must not occupy a large card outside home.
- [ ] Give compact chrome view-appropriate labels instead of teacher-only copy, and keep all existing back/home/logout actions discoverable.
- [ ] On every view change, focus the new view's primary heading/container and scroll it into view without smooth motion when reduced motion is requested.
- [ ] Add a high-visibility `:focus-visible` treatment, `aria-live` status regions, correct form semantics, and disabled/busy announcements.
- [ ] Add a loaded-set readiness banner such as `<학년> <단원> · <개수>개 단어 준비 완료` and separate primary study activities from game activities without hiding any existing mode.
- [ ] Raise small-label and gradient-button contrast to WCAG AA by using dark navy text on light gradients and darker orange for labels. Preserve the established warm classroom palette.
- [ ] Add `prefers-reduced-motion: reduce` rules that disable decorative animation and nonessential transitions.
- [ ] Keep layouts usable at 360px, 768px, and desktop widths; no horizontal scrolling and touch targets remain at least 44px high.
- [ ] Extend Playwright smoke assertions for keyboard focus, Enter search semantics where Firebase is unavailable, update modal, and responsive no-overflow checks.
- [ ] Run `node --test src/utils/appChrome.test.js`, `npm test`, `npm run build`, and `npm run test:smoke` after ensuring Chromium is installed.
- [ ] Commit as `feat: focus and simplify classroom activity screens` and write the implementation report.

## Task 7: Finish Bundle Hygiene, CI Coverage, Documentation, and Release Metadata

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/GameLeaderboardPanel.jsx`
- Modify: `vite.config.js`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/constants/app.js`
- Modify: `README.md`
- Modify: `docs/project-handoff.md`
- Modify: `docs/firebase-architecture.md`
- Modify: `docs/deployment-policy.md`
- Create: `docs/changes/2026-07-11-core-security-ui-hardening.md`

- [ ] Lazy-load teacher workspace and each activity screen with `React.lazy`/`Suspense`, keeping the home selector immediately available and providing an accessible Korean loading fallback.
- [ ] Replace the Firebase namespace/dynamic property lookup in `GameLeaderboardPanel` with explicit named imports and a static activity adapter map.
- [ ] Add intentional Vite chunking for React, Firebase, spreadsheet parsing, and activity code; do not merely raise the chunk warning threshold.
- [ ] Update Firebase and Vite within compatible non-breaking ranges, keep Playwright in dev dependencies, and verify no new production advisory is introduced.
- [ ] Update CI to install Chromium, build once, start the preview server, run Playwright smoke, and always keep Firestore rules tests as a required job.
- [ ] Set package/app version to `1.11.0`, put the `2026-07-11` security/stability/accessibility release first in `APP_UPDATES`, and record the teacher approval and device-private profile migration notes.
- [ ] Update handoff, Firebase architecture, setup/deployment guidance, and a dated change document so future work records major improvements before deployment.
- [ ] Run `npm test`, `npm run test:rules`, `npm run build`, `npm run test:smoke`, and `npm audit --omit=dev`.
- [ ] Compare production bundle output with the baseline (main JS approximately 846 kB and spreadsheet chunk approximately 429 kB) and record the new chunk breakdown in the report.
- [ ] Commit as `chore: prepare security and accessibility release` and write the implementation report.

## Final Verification

- [ ] Run the complete verification matrix from Task 7 again from a clean working tree.
- [ ] Use a final review agent to inspect the entire branch from the pre-plan base through HEAD for security regressions, data loss, race conditions, UI regressions, and missing tests.
- [ ] Fix and re-review every Critical or Important finding.
- [ ] Do not push or deploy until the user explicitly requests the release step.
