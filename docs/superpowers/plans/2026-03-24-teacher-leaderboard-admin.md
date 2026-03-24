# Teacher Leaderboard Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 관리 화면에서 현재 선택 학년의 주간·월간·연간 매칭 리더보드를 조회하고, 학생 이름 수정과 기록 삭제를 한 번에 관리할 수 있게 만든다.

**Architecture:** 기존 학생용 매칭 리더보드 저장 구조 `matchingLeaderboards/{scopeKey}/entries/{studentKey}`는 유지한다. 교사 관리 기능은 동일한 현재 기간 key를 사용해 세 개의 리더보드를 병렬로 읽고, 이름 수정 시에는 `copy/merge + old delete`, 삭제 시에는 `week/month/year delete`를 수행한다. UI는 `TeacherWorkspace`에 새 리더보드 카드 섹션을 추가하고, 상태와 비즈니스 로직은 `useVocabularyLibrary`와 Firebase 데이터 계층으로 분리한다.

**Tech Stack:** React, Vite, Firebase Firestore, existing matching leaderboard helpers, existing teacher auth/profile flow

---

## File Structure

### Existing files to modify

- `src/components/TeacherWorkspace.jsx`
  - 교사 화면에 `리더보드 관리` 섹션, 기간 탭, 이름 수정/기록 삭제 액션, 확인창 흐름 추가
- `src/hooks/useVocabularyLibrary.js`
  - 교사용 리더보드 상태, 불러오기/이름수정/삭제 액션, 상태 메시지 관리 추가
- `src/lib/firebase.js`
  - 현재 주간/월간/연간 리더보드 조회, 교사용 이름 변경, 교사용 기록 삭제용 Firestore 함수 추가
- `src/utils/leaderboard.js`
  - 현재 period key 재사용, 이름 병합용 비교 헬퍼 추가
- `src/styles/global.css`
  - 교사용 리더보드 카드, 탭, 항목, 수정 폼, 위험 버튼 스타일 추가
- `firestore.rules`
  - 같은 학교의 로그인 교사만 해당 학교 리더보드 문서를 수정/삭제할 수 있도록 규칙 추가
- `src/constants/app.js`
  - 버전 `v1.4.2` 및 업데이트 기록 추가
- `package.json`
  - 버전 `1.4.2` 반영

### Optional helper file

- `src/utils/leaderboardAdmin.js`
  - 필요하면 rename merge 우선순위와 period batch 결과 요약을 분리
  - 현재 `src/utils/leaderboard.js`가 짧으므로, 헬퍼가 2개 이하라면 기존 파일 유지가 더 낫다

---

### Task 1: Lock Leaderboard Admin Data Rules

**Files:**
- Modify: `src/utils/leaderboard.js`
- Modify: `src/lib/firebase.js`

- [ ] **Step 1: Extend leaderboard utility helpers**

기존 period key 계산 파일에 교사용 병합 판단 헬퍼를 추가한다.

```js
export function pickBetterLeaderboardEntry(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (right.score !== left.score) {
    return right.score > left.score ? right : left;
  }
  if ((right.elapsedSeconds ?? Infinity) !== (left.elapsedSeconds ?? Infinity)) {
    return (right.elapsedSeconds ?? Infinity) < (left.elapsedSeconds ?? Infinity)
      ? right
      : left;
  }
  return right.updatedAt ?? right.createdAt ? right : left;
}
```

- [ ] **Step 2: Add teacher leaderboard read helper**

`src/lib/firebase.js`에 현재 학교 + 현재 학년 + 현재 기간 3종을 한 번에 조회하는 교사 전용 helper를 추가한다. 반환 구조는 학생 완료 화면과 호환되게 period keyed object로 둔다.

```js
export async function fetchTeacherMatchingLeaderboards({
  schoolId,
  grade,
  now = new Date(),
  limitCount = 20,
}) {
  return fetchMatchingLeaderboards({ schoolId, grade, now, limitCount });
}
```

- [ ] **Step 3: Add teacher rename operation**

`src/lib/firebase.js`에 rename batch helper를 추가한다. 각 period(`week/month/year`)에 대해:
- old doc 조회
- new doc 조회
- 둘 다 있으면 `pickBetterLeaderboardEntry`로 최종 payload 선택
- new doc upsert
- old doc delete

```js
export async function renameTeacherMatchingLeaderboardStudent({
  schoolId,
  grade,
  oldStudentName,
  newStudentName,
  now = new Date(),
}) {
  // for week/month/year:
  //   scopeKey 생성
  //   old/new doc refs 조회
  //   없으면 skip
  //   있으면 merge 후 new doc set, old doc delete
}
```

- [ ] **Step 4: Add teacher delete operation**

`src/lib/firebase.js`에 delete batch helper를 추가한다. 현재 period 3개 각각에서 같은 `studentNameNormalized` key 문서를 삭제하고, `deleted/skipped/failed` 결과를 요약 반환한다.

```js
export async function deleteTeacherMatchingLeaderboardStudent({
  schoolId,
  grade,
  studentName,
  now = new Date(),
}) {
  // iterate current period keys and delete matching docs if present
}
```

- [ ] **Step 5: Add data-layer sanity checks**

helper 초입에서 아래를 공통 검증한다.
- `schoolId`
- `grade`
- `oldStudentName/newStudentName` or `studentName`
- 공백 이름 금지
- 동일 이름 rename 금지

오류 메시지는 교사 UI에 그대로 보여줄 수 있게 한국어로 작성한다.

- [ ] **Step 6: Verify module compiles**

Run: `npm run build`  
Expected: build success, no syntax error in leaderboard helpers

---

### Task 2: Wire Teacher Leaderboard State Into Hook

**Files:**
- Modify: `src/hooks/useVocabularyLibrary.js`

- [ ] **Step 1: Add teacher leaderboard state**

아래 상태를 추가한다.

```js
const [teacherLeaderboards, setTeacherLeaderboards] = useState({});
const [teacherLeaderboardLoading, setTeacherLeaderboardLoading] = useState(false);
const [teacherLeaderboardError, setTeacherLeaderboardError] = useState("");
const [teacherLeaderboardStatus, setTeacherLeaderboardStatus] = useState("");
const [teacherLeaderboardTab, setTeacherLeaderboardTab] = useState("week");
const [teacherLeaderboardEditingName, setTeacherLeaderboardEditingName] = useState("");
const [teacherLeaderboardDraftName, setTeacherLeaderboardDraftName] = useState("");
const [teacherLeaderboardSaving, setTeacherLeaderboardSaving] = useState(false);
```

- [ ] **Step 2: Load current grade leaderboard when teacher context is ready**

`teacherProfile.schoolId`와 `teacherSelection.grade`가 유효할 때 현재 리더보드를 불러오는 effect를 추가한다.

```js
useEffect(() => {
  if (!teacherProfile?.schoolId || !teacherSelection.grade) return;
  refreshTeacherLeaderboards();
}, [teacherProfile?.schoolId, teacherSelection.grade]);
```

- [ ] **Step 3: Implement refresh action**

hook 내부에 `refreshTeacherLeaderboards`를 추가한다.

```js
async function refreshTeacherLeaderboards() {
  setTeacherLeaderboardLoading(true);
  setTeacherLeaderboardError("");
  try {
    const result = await fetchTeacherMatchingLeaderboards({
      schoolId: teacherProfile.schoolId,
      grade: teacherSelection.grade,
    });
    setTeacherLeaderboards(result);
  } catch (error) {
    setTeacherLeaderboardError(normalizeErrorMessage(error, "리더보드를 불러오지 못했습니다."));
  } finally {
    setTeacherLeaderboardLoading(false);
  }
}
```

- [ ] **Step 4: Implement rename flow action**

`renameTeacherLeaderboardStudent` 액션을 hook에 추가한다.

```js
async function renameTeacherLeaderboardStudentAction(oldName, newName) {
  if (!window.confirm(`'${oldName}' 이름을 '${newName}'(으)로 현재 주/월/연 리더보드에서 모두 수정할까요?`)) {
    return;
  }
  setTeacherLeaderboardSaving(true);
  try {
    const result = await renameTeacherMatchingLeaderboardStudent({...});
    setTeacherLeaderboardStatus(/* 수정/병합/건너뜀 요약 */);
    await refreshTeacherLeaderboards();
  } catch (error) {
    setTeacherLeaderboardError(normalizeErrorMessage(error, "학생 이름을 수정하지 못했습니다."));
  } finally {
    setTeacherLeaderboardSaving(false);
  }
}
```

- [ ] **Step 5: Implement delete flow action**

```js
async function deleteTeacherLeaderboardStudentAction(studentName) {
  if (!window.confirm(`'${studentName}' 기록을 현재 주/월/연 리더보드에서 모두 삭제할까요?`)) {
    return;
  }
  setTeacherLeaderboardSaving(true);
  try {
    const result = await deleteTeacherMatchingLeaderboardStudent({...});
    setTeacherLeaderboardStatus(/* 삭제 결과 요약 */);
    await refreshTeacherLeaderboards();
  } catch (error) {
    setTeacherLeaderboardError(normalizeErrorMessage(error, "학생 기록을 삭제하지 못했습니다."));
  } finally {
    setTeacherLeaderboardSaving(false);
  }
}
```

- [ ] **Step 6: Expose hook API to TeacherWorkspace**

반환 객체에 아래를 포함한다.

```js
teacherLeaderboard: {
  boards: teacherLeaderboards,
  loading: teacherLeaderboardLoading,
  error: teacherLeaderboardError,
  status: teacherLeaderboardStatus,
  tab: teacherLeaderboardTab,
  setTab: setTeacherLeaderboardTab,
  editingName: teacherLeaderboardEditingName,
  setEditingName: setTeacherLeaderboardEditingName,
  draftName: teacherLeaderboardDraftName,
  setDraftName: setTeacherLeaderboardDraftName,
  saving: teacherLeaderboardSaving,
  renameStudent: renameTeacherLeaderboardStudentAction,
  deleteStudent: deleteTeacherLeaderboardStudentAction,
  refresh: refreshTeacherLeaderboards,
}
```

- [ ] **Step 7: Verify hook integration**

Run: `npm run build`  
Expected: build success, no unused import or undefined action errors

---

### Task 3: Build Teacher Leaderboard Admin UI

**Files:**
- Modify: `src/components/TeacherWorkspace.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Thread leaderboard state into component props**

`TeacherWorkspace`가 hook에서 넘겨준 `teacherLeaderboard` 객체를 사용하도록 destructuring을 추가한다.

- [ ] **Step 2: Add leaderboard admin card**

교사 화면에 새 섹션을 추가한다. 위치는 summary cards 아래, 엑셀/출판사 복사 위가 가장 자연스럽다.

```jsx
<article className="form-card">
  <div className="section-heading compact">
    <div>
      <p className="mode-label">Leaderboard Admin</p>
      <h3>리더보드 관리</h3>
    </div>
  </div>
  <p className="inline-hint">
    현재 선택한 {selection.grade}학년의 이 주/이 달/올해 리더보드 기록을 수정하거나 삭제할 수 있습니다.
  </p>
</article>
```

- [ ] **Step 3: Add period tabs**

학생 완료 화면과 비슷한 탭 UI를 쓰되 교사용으로 간결하게 구성한다.

```jsx
<div className="leaderboard-tabs" role="tablist" aria-label="교사 리더보드 기간">
  {periodDefinitions.map(({ type, label }) => (
    <button
      key={type}
      className={tab === type ? "leaderboard-tab active" : "leaderboard-tab"}
      onClick={() => leaderboard.setTab(type)}
    >
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Render admin entries**

현재 탭의 항목을 `순위 / 이름 / 점수 / 시간 / 액션` 형태로 렌더링한다.

```jsx
{entries.map((entry, index) => (
  <div key={entry.studentNameNormalized} className="teacher-leaderboard-item">
    <div>
      <strong>{index + 1}위</strong>
      <p>{entry.studentName}</p>
      <span>{entry.score}점 · {formatTimer(entry.elapsedSeconds)}</span>
    </div>
    <div className="toolbar-row">
      <button className="ghost-button" onClick={() => startEditing(entry.studentName)}>
        이름 수정
      </button>
      <button className="ghost-button danger-button" onClick={() => leaderboard.deleteStudent(entry.studentName)}>
        기록 삭제
      </button>
    </div>
  </div>
))}
```

- [ ] **Step 5: Add inline rename editor**

특정 항목의 `이름 수정` 버튼을 누르면 그 항목 아래에 작은 입력 폼을 연다.

```jsx
{leaderboard.editingName === entry.studentName ? (
  <div className="teacher-leaderboard-edit-row">
    <input
      value={leaderboard.draftName}
      onChange={(event) => leaderboard.setDraftName(event.target.value)}
      placeholder="새 학생 이름"
    />
    <button onClick={() => leaderboard.renameStudent(entry.studentName, leaderboard.draftName)}>
      수정 저장
    </button>
    <button onClick={cancelRename}>취소</button>
  </div>
) : null}
```

- [ ] **Step 6: Add empty/loading/error states**

아래 상태를 분기한다.
- schoolId 없음: 안내만 표시
- loading: `리더보드를 불러오는 중입니다...`
- error: warning hint
- empty: `아직 관리할 리더보드 기록이 없습니다.`

- [ ] **Step 7: Add CSS for admin list**

`global.css`에 다음 블록을 추가한다.
- `.teacher-leaderboard-card`
- `.teacher-leaderboard-item`
- `.teacher-leaderboard-meta`
- `.teacher-leaderboard-edit-row`
- 모바일에서 버튼 세로 정렬 허용

- [ ] **Step 8: Verify teacher UI build**

Run: `npm run build`  
Expected: build success, no JSX syntax issues

---

### Task 4: Update Firestore Rules For Teacher Admin

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add teacher school match helper**

rules 상단에 현재 로그인 사용자의 teacher 문서를 읽어 schoolId를 비교하는 helper를 추가한다.

```rules
function teacherDoc(uid) {
  return get(/databases/$(database)/documents/teachers/$(uid));
}

function isTeacherForSchool(schoolId) {
  return isSignedIn()
    && teacherDoc(request.auth.uid).data.isActive == true
    && teacherDoc(request.auth.uid).data.schoolId == schoolId;
}
```

- [ ] **Step 2: Allow teacher update/delete for same-school leaderboard docs**

기존 student leaderboard write 규칙은 유지하되, `update/delete`에 교사 예외를 추가한다.

권장 구조:

```rules
allow update: if (
  /* existing student self-improving path */
) || (
  isMatchingLeaderboardWrite()
  && scopeKey == request.resource.data.scopeKey
  && studentKey == request.resource.data.studentNameNormalized
  && isTeacherForSchool(resource.data.schoolId)
  && resource.data.schoolId == request.resource.data.schoolId
  && resource.data.grade == request.resource.data.grade
  && resource.data.periodType == request.resource.data.periodType
  && resource.data.periodKey == request.resource.data.periodKey
);

allow delete: if isTeacherForSchool(resource.data.schoolId);
```

- [ ] **Step 3: Verify rules syntax**

Run: `npx firebase-tools firestore:rules:test --help`  
Expected: command available or skip with note if project uses deploy-only workflow

If local syntax test tool is not available, at minimum run:

Run: `npm run build`  
Expected: app build still passes after rules edit

---

### Task 5: Release Metadata And Documentation

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`

- [ ] **Step 1: Add release entry**

`APP_UPDATES` 맨 앞에 새 항목을 추가한다.

```js
{
  version: "v1.4.2",
  date: "2026-03-24",
  summary: [
    "교사 화면에서 현재 학년의 주간·월간·연간 리더보드를 직접 관리할 수 있습니다.",
    "학생 이름 오타는 한 번에 수정하고, 장난 기록은 현재 기간 전체에서 삭제할 수 있습니다.",
  ],
}
```

- [ ] **Step 2: Bump package metadata**

`package.json` version을 `1.4.2`로 맞춘다.

- [ ] **Step 3: Verify release metadata**

Run: `node -e "import('./src/constants/app.js').then(m => console.log(m.APP_VERSION))"`  
Expected: `v1.4.2`

---

### Task 6: Manual Verification And Diff Review

**Files:**
- Modify: none

- [ ] **Step 1: Static checks**

Run: `npm run build`  
Expected: PASS

Run: `git diff --check`  
Expected: no output

- [ ] **Step 2: Teacher UI smoke check**

Run: `npm run dev`  
Expected: local dev server starts

Manual flow:
- Google 로그인한 교사 계정으로 진입
- 학년 선택
- `리더보드 관리` 카드 표시 확인
- 주간/월간/연간 탭 전환 확인
- 이름 수정 시 확인창 표시 확인
- 기록 삭제 시 확인창 표시 확인

- [ ] **Step 3: Data behavior smoke check**

준비 데이터:
- 같은 학교/같은 학년에 최소 1개 leaderboard record
- 같은 이름 record가 week/month/year 각각 존재하는 상태

확인:
- `김홍년` -> `김홍년1` 수정 시 3개 period가 모두 갱신되는지
- 새 이름에 기존 기록이 있으면 점수 높은 쪽만 남는지
- 삭제 시 3개 period에서 모두 사라지는지

- [ ] **Step 4: Firebase rules smoke check**

Production-like verification:
- 같은 학교 교사로 수정/삭제 성공
- 다른 학교 교사 계정이 있으면 해당 학교 리더보드 수정/삭제 실패

- [ ] **Step 5: Final review**

검토 포인트:
- rename 결과가 old/new double-write 없이 안정적으로 끝나는지
- `studentNameNormalized`가 문서 key와 항상 일치하는지
- 교사 권한이 자기 학교 범위를 넘지 않는지
- empty/error/status 메시지가 사용자에게 충분히 설명되는지

---

## Notes For Execution

- 현재 코드베이스에는 자동 테스트가 거의 없으므로, 이번 작업은 `작은 데이터 레이어 함수 + 빌드 검증 + 실제 교사 UI smoke test` 조합으로 가는 편이 현실적이다.
- rename은 Firestore transaction까지는 과하므로, 현재 요구 범위에서는 `read -> merge -> set -> delete` 순서로 구현해도 충분하다. 다만 중간 실패 시 status 메시지에 어느 period에서 실패했는지 남겨야 한다.
- 교사용 리더보드 관리 기능은 `현재 period만` 대상으로 두고, 과거 주/월 기록 편집 요구는 다음 spec으로 분리한다.
