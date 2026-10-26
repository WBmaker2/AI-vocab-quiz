# 기술 부채 정리·보안·접근성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 학교 검색의 전체 컬렉션 읽기를 인덱스 조회로 바꾸고, 배포 보안 헤더와 선택적 App Check를 추가하며, 접근성 자동 검사와 ESLint 경고 0개를 달성한다.

**Architecture:** Firestore `schools` 디렉터리에 prefix 범위 쿼리를 적용하고, 기존 공개 세트 기반 조회는 결과가 없을 때만 fallback으로 남긴다. Vercel/Firebase Hosting에 공통 보안 헤더를 추가하고 App Check는 환경 변수가 있을 때만 초기화한다. Playwright 스모크에 axe 검사를 넣고, 남은 ESLint 경고는 죽은 import·불명확한 return·잘못된 `useEffectEvent` 사용을 정리해 없앤다.

**Tech Stack:** React 19, Vite 7, Firebase 12, Firestore, Playwright, axe-core, ESLint 9, Node test runner

**Spec:** 이 문서가 spec을 겸한다. 브리핑에서 선택한 4번(기술 부채 정리: 검색 인덱스·보안·접근성)만 구현한다.

## Global Constraints

- 이번 작업은 **기술 부채 정리**만 다룬다.
- **구현하지 않음:** 수업/학급 코드, 학급 명단·번호, 내 기록 홈, 복구 QR, 딥링크, SRS/오늘의 복습, 관리자 콘솔.
- Firestore rules는 이번에 변경하지 않는다. `npm run test:rules`는 기존 규칙 기준선을 확인하는 용도로 실행하며, 변경이 필요하면 별도 계획으로 분리한다.
- 익명 리더보드 쓰기 제한은 학급/학생 식별자 도입 이후로 미룬다. 이번에는 App Check 연결 지점과 보안 헤더까지만 다룬다.
- 사용자에게 보이는 변경은 `src/constants/app.js`와 `docs/changes/`에 기록한다.
- 커밋은 사용자가 명시적으로 요청할 때만 한다.

## 파일 구조

### 새로 만들 파일

- `src/utils/schoolSearch.js` — 학교 검색 정규화와 prefix 범위 계산
- `src/utils/schoolSearch.test.js` — 검색 범위 단위 테스트
- `src/utils/appCheck.js` — App Check 환경 변수 해석
- `src/utils/appCheck.test.js` — App Check 설정 단위 테스트
- `src/lib/firebaseAppCheck.js` — App Check 지연 초기화
- `src/lib/firebaseAppCheck.test.js` — App Check 초기화 단위 테스트
- `tests/security-headers.test.js` — Vercel/Firebase 보안 헤더 계약 테스트
- `vercel.json` — Vercel 보안 헤더
- `docs/changes/2026-10-27-technical-debt-hardening.md` — 릴리스 기록

### 수정할 파일

- `src/lib/firebaseSchools.js` — `schools` prefix 검색 + fallback + 인기 학교 캐시
- `src/lib/firebaseCore.js` — `firebaseApp` export
- `src/main.jsx` — App Check 초기화 호출
- `.env.example` — App Check 환경 변수
- `firebase.json` — Firebase Hosting 보안 헤더
- `src/App.jsx` — skip link, `main-content` id
- `src/styles/global.css` — skip link 스타일, `--ink-soft` 정의
- `scripts/playwright_smoke.js` — axe 검사
- `package.json`, `package-lock.json` — `@axe-core/playwright`, lint `--max-warnings=0`
- `src/lib/firebase.js`, `src/utils/bingo.js`, `src/utils/bingoSetup.js`, `src/lib/firebaseBingo.js`, `src/lib/firebaseBingoCalls.js`, `src/lib/firebaseBingoSetup.js`, `src/lib/firebaseLeaderboardPeriods.js`, `src/lib/firebaseMissReports.js`, `src/utils/studentResultSave.js`, `src/utils/xlsxImport.test.js` — 죽은 import/변수 정리
- `src/components/ListeningQuiz.jsx`, `src/components/SpeakingQuiz.jsx`, `src/components/WordDictationGame.jsx`, `src/components/WordFishingGame.jsx`, `src/components/WordSpellingGame.jsx`, `src/components/WordTypingGame.jsx`, `src/components/GameLeaderboardPanel.jsx`, `src/components/StudentBingoBoard.jsx`, `src/components/TeacherBingoHost.jsx`, `src/components/speaking/useSpeakingGrading.js` — hooks 경고 정리
- `src/hooks/student/useStudentSetLoader.js`, `src/hooks/teacher/useTeacherLeaderboards.js`, `src/hooks/teacher/useTeacherSetManager.js`, `src/hooks/useSpeechRecognition.js`, `src/hooks/useSpeechSynthesis.js`, `src/hooks/useVocabularyLibrary.js` — 의존성/return 경고 정리
- `docs/OPERATIONS.md`, `docs/improvement-ideas.md`, `README.md` — 검증·보안·상태 갱신
- `src/constants/app.js` — v1.19.1 릴리스 항목

---

## Task 1: 학교 검색 인덱스

**Files:**
- Create: `src/utils/schoolSearch.js`
- Create: `src/utils/schoolSearch.test.js`
- Modify: `src/lib/firebaseSchools.js`

**Interfaces:**
- Produces: `normalizeSchoolSearchName(value): string`
- Produces: `createSchoolSearchRange(normalized): { start: string, end: string } | null`
- Consumes: `firestore` collection `schools` with fields `name`, `normalizedName`, `createdAt`

- [x] **Step 1: 실패하는 단위 테스트 작성**

`src/utils/schoolSearch.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createSchoolSearchRange,
  normalizeSchoolSearchName,
} from "./schoolSearch.js";

test("normalizeSchoolSearchName trims, collapses spaces, and lowercases", () => {
  assert.equal(normalizeSchoolSearchName("  서울  초등학교 "), "서울 초등학교");
  assert.equal(normalizeSchoolSearchName("SEOUL Elementary"), "seoul elementary");
  assert.equal(normalizeSchoolSearchName(null), "");
});

test("createSchoolSearchRange returns a prefix range", () => {
  assert.deepEqual(createSchoolSearchRange("서울"), {
    start: "서울",
    end: "서울\uf8ff",
  });
  assert.equal(createSchoolSearchRange(""), null);
  assert.equal(createSchoolSearchRange("   "), null);
});
```

- [x] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test src/utils/schoolSearch.test.js`
Expected: FAIL — `Cannot find module './schoolSearch.js'`

- [x] **Step 3: 최소 구현 작성**

`src/utils/schoolSearch.js`:

```js
export function normalizeSchoolSearchName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function createSchoolSearchRange(normalized) {
  const start = String(normalized ?? "").trim();

  if (!start) {
    return null;
  }

  return {
    start,
    end: `${start}\uf8ff`,
  };
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `node --test src/utils/schoolSearch.test.js`
Expected: PASS

- [x] **Step 5: `firebaseSchools.js` 검색 경로 교체**

`src/lib/firebaseSchools.js`에서:

1. import에 `orderBy`, `limit` 추가.
2. `normalizeSchoolName`을 `normalizeSchoolSearchName`의 re-export로 교체.
3. `searchSchoolsByName`은 `schools` prefix 쿼리를 먼저 실행.
4. 결과가 0개일 때만 기존 `listPublishedSchools` 기반 fallback 실행.
5. `listPublishedSchools`에 `sessionStorage` 5분 캐시 추가.
6. `export async  function`의 이중 공백 제거.

핵심 코드:

```js
import { normalizeSchoolSearchName, createSchoolSearchRange } from "../utils/schoolSearch.js";

export const normalizeSchoolName = normalizeSchoolSearchName;

const PUBLISHED_SCHOOL_CACHE_KEY = "publishedSchools.v1";
const PUBLISHED_SCHOOL_CACHE_TTL_MS = 5 * 60 * 1000;

export async function searchSchoolsByName(queryText) {
  const normalized = normalizeSchoolSearchName(queryText);
  const range = createSchoolSearchRange(normalized);

  if (!range) {
    return [];
  }

  const { db: firestore } = ensureFirebase();
  const snapshot = await getDocs(
    query(
      collection(firestore, "schools"),
      where("normalizedName", ">=", range.start),
      where("normalizedName", "<", range.end),
      orderBy("normalizedName"),
      limit(8),
    ),
  );

  const schools = snapshot.docs
    .map((item) => ({
      id: item.id,
      name: String(item.data().name ?? "").trim(),
      normalizedName: String(item.data().normalizedName ?? "").trim(),
    }))
    .filter((school) => school.name && school.normalizedName);

  if (schools.length > 0) {
    return schools.slice(0, 8).map(({ id, name }) => ({ id, name }));
  }

  return searchPublishedSchoolsFallback(normalized);
}
```

`searchPublishedSchoolsFallback(normalized)`는 기존 `listPublishedSchools()` 결과를 `startsWith`로 필터링하는 함수로 분리한다.

`listPublishedSchools` 캐시:

```js
function readPublishedSchoolsCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PUBLISHED_SCHOOL_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (Date.now() - Number(parsed.savedAt ?? 0) > PUBLISHED_SCHOOL_CACHE_TTL_MS) {
      return null;
    }

    return Array.isArray(parsed.schools) ? parsed.schools : null;
  } catch {
    return null;
  }
}

function writePublishedSchoolsCache(schools) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PUBLISHED_SCHOOL_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), schools }),
    );
  } catch {
    // Cache failures must not block school search.
  }
}
```

- [x] **Step 6: 검증**

Run: `node --test src/utils/schoolSearch.test.js`
Run: `npm test`
Expected: 새 테스트 포함 전체 통과

---

## Task 2: 보안 헤더와 선택적 App Check

**Files:**
- Create: `vercel.json`
- Create: `src/utils/appCheck.js`
- Create: `src/utils/appCheck.test.js`
- Create: `src/lib/firebaseAppCheck.js`
- Create: `src/lib/firebaseAppCheck.test.js`
- Create: `tests/security-headers.test.js`
- Modify: `firebase.json`, `src/lib/firebaseCore.js`, `src/main.jsx`, `.env.example`, `vite.config.js`

**Interfaces:**
- Produces: `readAppCheckConfig(env): { siteKey: string, debugToken: string, enabled: boolean }`
- Produces: `initializeFirebaseAppCheck(options?): Promise<boolean>`

- [x] **Step 1: 보안 헤더 계약 테스트 작성**

`tests/security-headers.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const REQUIRED_HEADERS = [
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "cross-origin-opener-policy",
  "strict-transport-security",
];

function normalizeHeaders(entries) {
  return Object.fromEntries(
    entries.map(({ key, value }) => [key.toLowerCase(), value]),
  );
}

test("vercel.json sets required security headers", async () => {
  const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
  const headers = normalizeHeaders(config.headers?.[0]?.headers ?? []);
  for (const name of REQUIRED_HEADERS) {
    assert.ok(headers[name], `missing ${name}`);
  }
  assert.match(headers["permissions-policy"], /microphone=\(self\)/);
  assert.match(headers["cross-origin-opener-policy"], /same-origin-allow-popups/);
});

test("firebase.json sets required hosting headers", async () => {
  const config = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
  const headers = normalizeHeaders(config.hosting?.headers?.[0]?.headers ?? []);
  for (const name of REQUIRED_HEADERS) {
    assert.ok(headers[name], `missing ${name}`);
  }
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `node --test tests/security-headers.test.js`
Expected: FAIL — `vercel.json` 없음

- [x] **Step 3: 헤더 설정 추가**

`vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "microphone=(self), camera=(), geolocation=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

`firebase.json`의 `hosting`에 같은 `headers` 배열을 추가한다.

- [x] **Step 4: App Check 설정 테스트 작성**

`src/utils/appCheck.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readAppCheckConfig } from "./appCheck.js";

test("readAppCheckConfig is disabled without a site key", () => {
  assert.deepEqual(readAppCheckConfig({}), {
    siteKey: "",
    debugToken: "",
    enabled: false,
  });
});

test("readAppCheckConfig trims values and enables with a site key", () => {
  assert.deepEqual(
    readAppCheckConfig({
      VITE_FIREBASE_APP_CHECK_SITE_KEY: "  site-key  ",
      VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN: "  debug-token  ",
    }),
    {
      siteKey: "site-key",
      debugToken: "debug-token",
      enabled: true,
    },
  );
});
```

- [x] **Step 5: App Check 구현**

`src/utils/appCheck.js`:

```js
export function readAppCheckConfig(env = {}) {
  const siteKey = String(env?.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? "").trim();
  const debugToken = String(env?.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? "").trim();

  return {
    siteKey,
    debugToken,
    enabled: Boolean(siteKey),
  };
}
```

`src/lib/firebaseAppCheck.js`:

```js
import { firebaseApp } from "./firebaseCore.js";
import { readAppCheckConfig } from "../utils/appCheck.js";

export async function initializeFirebaseAppCheck({
  app = firebaseApp,
  env = import.meta.env,
  isBrowser = typeof window !== "undefined",
  loadAppCheck = () => import("firebase/app-check"),
} = {}) {
  const config = readAppCheckConfig(env);

  if (!app || !isBrowser || !config.enabled) {
    return false;
  }

  if (config.debugToken && typeof self !== "undefined") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = config.debugToken;
  }

  const { initializeAppCheck, ReCaptchaV3Provider } = await loadAppCheck();
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(config.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return true;
}
```

`src/lib/firebaseCore.js`에 `export const firebaseApp = app;` 추가.
`src/main.jsx`에서 `void initializeFirebaseAppCheck();` 호출.
`.env.example`에 두 환경 변수와 설명 추가.

- [x] **Step 6: 검증**

Run: `node --test tests/security-headers.test.js src/utils/appCheck.test.js src/lib/firebaseAppCheck.test.js`
Expected: PASS

---

## Task 3: 접근성

**Files:**
- Modify: `src/App.jsx`, `src/styles/global.css`, `scripts/playwright_smoke.js`, `package.json`
- Test: `npm run test:smoke`

- [x] **Step 1: skip link와 main-content id 추가**

`src/App.jsx`의 `.app-shell` 바로 안쪽, 배경 div 앞에 추가:

```jsx
<a className="skip-link" href="#main-content">
  본문으로 건너뛰기
</a>
```

`viewContentRef`가 붙은 `.view-content` div에:

```jsx
id="main-content"
```

- [x] **Step 2: skip link 스타일과 `--ink-soft` 정의**

`src/styles/global.css`의 `:root`에 `--ink-soft: #4b6178;` 추가.

파일 상단에 skip link 스타일 추가:

```css
.skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 1000;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #102a43;
  color: #ffffff;
  font-weight: 800;
  text-decoration: none;
  transform: translateY(-160%);
  transition: transform 160ms ease;
}

.skip-link:focus-visible {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }
}
```

- [x] **Step 3: axe 의존성 추가**

Run: `npm install -D @axe-core/playwright`

- [x] **Step 4: 스모크에 axe 검사 추가**

`scripts/playwright_smoke.js` 상단에:

```js
import AxeBuilder from "@axe-core/playwright";
```

헬퍼 추가:

```js
async function assertNoA11yViolations(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const violations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  if (violations.length > 0) {
    const details = violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n");
    throw new Error(`Accessibility violations on ${label}:\n${details}`);
  }
}
```

호출 위치:
- `waitForSmokeReady(page)` 직후 홈 화면
- 교사 관리 화면 진입 후
- 필요하면 업데이트 모달이 열린 상태에서 dialog 범위로 1회

- [x] **Step 5: 검증 및 위반 수정**

Run: `npm run build`
Run: `npm run test:smoke`
Expected: PASS. 위반이 나오면 대비 색상, label, role을 실제 DOM에 맞게 수정하고 다시 실행한다.

---

## Task 4: ESLint 경고 0개

**Files:** (Global Constraints의 수정 파일 목록 참고)

- [x] **Step 1: 기준선 확인**

Run: `npm run lint`
Expected: 현재 135 warnings

- [x] **Step 2: 죽은 import/변수 제거**

- `src/lib/firebase.js`: 85-158행의 사용되지 않는 import 블록 제거. `validateSpellingLeaderboardResult`는 `export { validateSpellingLeaderboardResult } from "./spellingLeaderboard.js";`로 직접 re-export.
- `src/utils/bingo.js`: `getBoardCellIndexes`만 import하고 나머지 dead import 제거.
- `src/utils/bingoSetup.js`: `createBingoWordId`, `normalizeBingoWordKey` import 제거.
- `src/lib/firebaseBingo.js`: `Timestamp`, `canMarkBingoCell`, `createBingoWordId`, `selectNextBingoWord`, `db` 제거.
- `src/lib/firebaseBingoCalls.js`: `db`, `cleanMeaning` 제거.
- `src/lib/firebaseBingoSetup.js`: `db` 제거.
- `src/lib/firebaseLeaderboardPeriods.js`: `ensureFirebase` 제거.
- `src/lib/firebaseMissReports.js`: `deleteDoc` 제거.
- `src/utils/studentResultSave.js`: `createCombinedStudentResultStatus` 인자에서 `progressError` 제거.
- `src/utils/xlsxImport.test.js`: `onRemoteWrite`를 `_onRemoteWrite`로 변경.
- `src/components/ListeningQuiz.jsx`, `SpeakingQuiz.jsx`: 사용하지 않는 progression setter/import 제거.

- [x] **Step 3: consistent-return 수정**

early `return;`를 `return undefined;`로 바꾼다.
대상: `src/App.jsx`, `src/components/WordFishingGame.jsx`, `src/hooks/student/useStudentSetLoader.js`, `src/hooks/teacher/useTeacherLeaderboards.js`, `src/hooks/teacher/useTeacherSetManager.js`, `src/hooks/useSpeechRecognition.js`, `src/hooks/useVocabularyLibrary.js`.

- [x] **Step 4: hooks 의존성·useEffectEvent 정리**

- `ListeningQuiz`, `WordDictationGame`: effect event `announceQuestion`을 effect 안에서만 사용하고, 버튼 `onReplay`에는 일반 `handleReplayQuestion` 함수를 사용. deps에서 `announceQuestion` 제거, `resetProgression` 추가.
- `WordTypingGame`: `speakCurrentWord`는 일반 함수로 만들어 prop에 전달하고, effect에서는 `useEffectEvent` 래퍼 사용. `moveToNextQuestion`/`moveToNextReviewQuestion`은 event handler에서 호출하므로 일반 함수로 변경.
- `WordFishingGame`: `queueRound`/`resolveRound`를 일반 함수로 만들고, effect의 timeout에서 호출할 때만 `useEffectEvent` 래퍼 사용. `speak.cancel`을 지역 변수로 고정, `announceRoundWord` deps 제거.
- `WordSpellingGame`: keydown effect deps에 `moveToNextQuestion` 추가.
- `StudentBingoBoard`: `sourceBoard`와 `sourceTiles`를 `useMemo`로 감싼다.
- `TeacherBingoHost`: cleanup에서 `changeBadgeTimersRef.current`를 지역 변수로 복사.
- `GameLeaderboardPanel`: deps에 `definition.label` 추가.
- `useSpeakingGrading`: `useEffectEvent`로 transcript/error 처리 함수를 감싸고 effect deps를 recognition 입력값으로 제한.
- `useSpeechRecognition`: deps에 `config.vocabulary` 추가, 중복 `setMicrophoneState("missing")` 제거.
- `useSpeechSynthesis`: deps에 `setRatePreset` 추가.
- `useStudentSetLoader`: deps에 `schoolSearchGate` 추가.
- `useTeacherSetManager`: `queueAutoSave`, `recordTeacherSetEdit`, `refreshCatalog`를 `useEffectEvent`로 감싸 effect에서 호출하고, auto-save deps에 `dirty` 추가.

- [x] **Step 5: lint 게이트 강화**

`package.json`:

```json
"lint": "eslint . --max-warnings=0",
"lint:fix": "eslint . --fix"
```

- [x] **Step 6: 검증**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

Run: `npm test`
Expected: 전체 통과

---

## Task 5: 검증과 릴리스 기록

- [x] **Step 1: 필수 검증**

```bash
npm test
npm run lint
npm run build
npm run test:activities
npm run test:smoke
npm audit --omit=dev
```

`npm run test:rules`는 이번에 `firestore.rules`를 변경하지 않았으므로 기존 규칙 기준선을 확인하는 용도로 실행했다. 결과: 85개 통과.

- [x] **Step 2: 릴리스 기록**

- `src/constants/app.js`의 `APP_UPDATES` 맨 위에 `v1.19.1` 항목 추가
- `package.json` version을 `1.19.1`로 변경
- `docs/changes/2026-10-27-technical-debt-hardening.md` 작성
- `docs/OPERATIONS.md`의 검증·보안·알려진 제약 갱신
- `docs/improvement-ideas.md`의 현재 버전과 상태 갱신
- `README.md` 검증 목록에 axe 포함 스모크 설명 추가

- [x] **Step 3: 최종 확인**

Run: `git status --short`
Run: `git diff --stat`

---

## Self-Review

- **검색 인덱스:** `schools` prefix 쿼리, fallback, 인기 학교 캐시, 단위 테스트 포함.
- **보안:** Vercel/Firebase 헤더, 헤더 계약 테스트, 선택적 App Check, 환경 변수 문서 포함.
- **접근성:** skip link, `--ink-soft`, axe 스모크 포함.
- **린트:** dead import/변수, consistent-return, hooks deps, useEffectEvent 오용 정리 포함.
- **범위 준수:** 수업 코드·학급 명단·내 기록·복구·딥링크·SRS·관리자 콘솔 없음.
- **검증:** Firestore rules 테스트 85개 통과. rules는 변경하지 않았다.
