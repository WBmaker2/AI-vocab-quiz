# Teacher Publisher And Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 관리 화면에 학년별 출판사 선택과 다른 학교 공개 카드 복사 기능을 추가하고, 기존 엑셀/단원 저장 흐름을 유지한 채 Firestore 데이터 구조를 안전하게 확장한다.

**Architecture:** 출판사는 `teachers.gradePublishers`와 `vocabularySets.publisher`에 함께 저장한다. 교사 UI는 현재 학년 기준 draft 출판사를 유지하고, `현재 단원 저장`, `엑셀 일괄 저장`, `다른 학교 카드 복사` 액션 시에만 확정 저장한다. 복사 기능은 현재 학년 + 출판사 + 공개 세트만 조회해 `word + meaning` 기준 병합 복사한다.

**Tech Stack:** React, Firebase Auth, Firestore, existing Vite app, existing merge utility

---

## File Structure

### Modify

- `src/constants/vocabulary.js`
  - 고정 출판사 목록 추가
  - 기본 교사 selection 구조 확장 여부 정리
- `src/lib/firebase.js`
  - `teachers.gradePublishers` 지원
  - `vocabularySets.publisher` 지원
  - 출판사 기반 공개 세트 검색/복사용 조회 함수 추가
- `src/hooks/useVocabularyLibrary.js`
  - 학년별 출판사 draft/state 관리
  - 저장/불러오기/엑셀 업로드/복사 흐름에 출판사 연결
- `src/components/TeacherWorkspace.jsx`
  - 섹션 위치 변경
  - 출판사 선택 UI 추가
  - 다른 학교 단어카드 복사 UI 추가
- `firestore.rules`
  - `gradePublishers`, `publisher` 필드 허용
- `src/constants/app.js`
  - 버전 및 업데이트 기록 반영
- `package.json`
  - 버전 반영

### Create

- `src/utils/publisherCopy.js`
  - Firestore 검색 결과를 UI용 source 카드로 묶는 순수 유틸
  - source 복사 결과 요약 계산 유틸

### Verify

- `npm run build`
- 필요 시 로컬 preview 브라우저 smoke check

---

### Task 1: 출판사 상수와 Firestore 스키마 확장

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/vocabulary.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/lib/firebase.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/firestore.rules`

- [ ] **Step 1: 출판사 상수 추가**

`src/constants/vocabulary.js`에 아래 고정 목록을 추가한다.

```js
export const PUBLISHER_OPTIONS = [
  "동아출판 윤여범",
  "미래엔 강정진",
  "아이스크림미디어 박유미",
  "와이비엠 김혜리",
  "와이비엠 최희경",
  "천재교과서 함순애",
  "천재교과서 김태은",
  "천재교육 이동환",
  "동아출판 정은숙",
  "비상교육 우길주",
];
```

- [ ] **Step 2: teacher profile 입출력 구조 확장**

`src/lib/firebase.js`에서:

- `getTeacherProfile()` 반환값에 `gradePublishers`
- `upsertTeacherProfile()` payload 허용 필드에 `gradePublishers`
- `gradePublishers`가 없으면 `{}` 반환

- [ ] **Step 3: vocabulary set 입출력 구조 확장**

`src/lib/firebase.js`에서:

- `fetchTeacherVocabularySet()` 반환값에 `publisher`
- `saveTeacherVocabularySet()` payload에 `publisher`
- `listTeacherSetCatalog()`가 `publisher`도 유지하도록 정리

- [ ] **Step 4: Firestore rules 확장**

`firestore.rules`에서:

- `teachers` 허용 필드에 `gradePublishers`
- `vocabularySets` 허용 필드에 `publisher`
- 타입 검증 추가

- [ ] **Step 5: 검증**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants/vocabulary.js src/lib/firebase.js firestore.rules
git commit -m "feat: add publisher fields to teacher data"
```

---

### Task 2: 교사 hook에 학년별 출판사 상태와 legacy fallback 연결

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/hooks/useVocabularyLibrary.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/vocabulary.js`

- [ ] **Step 1: 교사 selection/draft 구조 확장**

`useVocabularyLibrary`에 아래를 추가한다.

- 현재 학년 editor용 `teacherPublisherDraft`
- teacher profile의 `gradePublishers`
- 학년 변경 시 draft 재계산

- [ ] **Step 2: load precedence 구현**

규칙을 그대로 코드화한다.

- `gradePublishers[grade]`가 있으면 editor 값은 그 값
- 없고 현재 단원 세트의 `publisher`가 있으면 editor 값은 그 값
- 둘 다 없으면 빈 값
- fallback 값을 화면에만 보여주고 자동 저장하지 않음

- [ ] **Step 3: 저장 시점 일관화**

아래 액션에서만 출판사를 확정 저장하게 연결한다.

- `saveTeacherSet`
- `importWorkbook`
- 이후 추가될 `copyPublisherSourceToTeacher`

- [ ] **Step 4: 오류/상태 메시지 추가**

- 출판사 미선택 시 저장 차단
- 상태 메시지에 출판사 반영 여부 포함

- [ ] **Step 5: 검증**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useVocabularyLibrary.js src/constants/vocabulary.js
git commit -m "feat: manage grade-level publisher state"
```

---

### Task 3: 교사 화면 레이아웃 교체와 출판사 선택 UI

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/components/TeacherWorkspace.jsx`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/App.jsx`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/styles/global.css`

- [ ] **Step 1: 섹션 순서 변경**

`TeacherWorkspace`에서:

- 최종 순서를 아래처럼 고정한다.
  - `학교와 선생님 정보`
  - `요약 카드`
  - `엑셀로 단원 일괄 등록`
  - `다른 학교 단어카드 복사`
  - `학년과 단원 선택`
  - `단어 직접 입력`
  - `단어 목록`
- 이 단계에서는 먼저 기존 `엑셀`과 `학년/단원` 카드의 위치를 교체하고, `다른 학교 단어카드 복사` 카드가 들어갈 자리도 확보한다.

- [ ] **Step 2: 출판사 드롭다운 UI 추가**

`학년과 단원 선택` 섹션에 아래 필드를 추가한다.

- 라벨: `출판사`
- UI: `<select>` with `PUBLISHER_OPTIONS`
- 현재 학년 draft 값 바인딩

- [ ] **Step 3: 현재 단원 저장 섹션 안내 문구 정리**

아래 문구를 반영한다.

- 현재 학년의 출판사를 먼저 고르도록 안내
- 저장 시 현재 학년 메타데이터와 단원에 함께 저장됨을 설명

- [ ] **Step 4: 스타일 조정**

- 새 필드가 기존 compact grid와 어울리도록 반응형 정리
- 섹션 이동 후 카드 간 여백 유지

- [ ] **Step 5: 검증**

`src/App.jsx`에서 아래 props를 `TeacherWorkspace`로 연결한다.

- 현재 학년 출판사 값
- 출판사 변경 핸들러
- 복사 섹션 상태와 검색/복사 콜백

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/TeacherWorkspace.jsx src/App.jsx src/styles/global.css
git commit -m "feat: add teacher publisher selector"
```

---

### Task 4: 다른 학교 단어카드 복사 조회 계층 만들기

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/lib/firebase.js`
- Create: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/utils/publisherCopy.js`

- [ ] **Step 1: source 검색 함수 추가**

`firebase.js`에 아래 함수를 추가한다.

```js
searchPublishedPublisherSources({
  grade,
  publisher,
  excludedSchoolId,
});
```

동작:

- `published == true`
- `grade == current grade`
- `publisher == selected publisher`
- 조회 후 `excludedSchoolId`와 같은 학교는 클라이언트에서 제외

- [ ] **Step 2: 결과 그룹화 유틸 추가**

`src/utils/publisherCopy.js`에:

- `groupPublisherSourcesByTeacherAndSchool(entries)`
- source 카드에 `schoolName`, `teacherName`, `units`, `itemCount` 계산

- [ ] **Step 3: source 상세 로드 함수 추가**

선택된 source의 동일 학년 공개 단원 전체를 가져오는 함수 추가:

```js
fetchPublishedPublisherSourceUnits({
  ownerUid,
  grade,
  publisher,
});
```

- [ ] **Step 4: 검증**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.js src/utils/publisherCopy.js
git commit -m "feat: add publisher source search helpers"
```

---

### Task 5: 다른 학교 카드 복사 UI와 병합 저장 연결

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/components/TeacherWorkspace.jsx`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/hooks/useVocabularyLibrary.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/lib/firebase.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/styles/global.css`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/utils/vocabularyMerge.js`

- [ ] **Step 1: hook에 검색/선택/복사 상태 추가**

`useVocabularyLibrary`에 아래 상태를 추가한다.

- 복사 섹션 열림 여부
- 검색 중 여부
- 검색 결과 목록
- 선택된 source
- 복사 실행 중 여부

- [ ] **Step 2: 검색 액션 추가**

현재 선택 학년과 선택 출판사 기준으로만 검색한다.

- 출판사 미선택이면 검색 차단
- 현재 학교는 제외
- 결과 없으면 안내 메시지 노출

- [ ] **Step 3: 복사 액션 추가**

선택된 source의 공개 단원들을 모두 읽고:

- 현재 교사의 같은 학년 단원들과 `word + meaning` 기준 병합
- 현재 `학생 공개` 체크 상태로 저장
- 현재 학년 출판사가 비어 있으면 복사한 출판사로 확정 저장
- 복사 완료 후 teacher catalog와 현재 학년 unit 목록을 새로고침
- 현재 선택 단원이 복사된 단원 중 하나면, 해당 단원 items와 published 상태도 함께 갱신
- 완료 메시지에 반영 단원 수, 새 단어 수, 중복 건너뜀 수를 포함

- [ ] **Step 4: UI 추가**

`엑셀로 단원 일괄 등록` 아래 새 카드:

- 제목: `다른 학교 단어카드 복사`
- 출판사 선택 드롭다운
- `검색` 버튼
- 검색 결과 카드 리스트
- 결과 선택 후 `우리 학교 카드로 복사` 버튼
- 이 카드가 `엑셀로 단원 일괄 등록`과 `학년과 단원 선택` 사이에 놓이도록 `TeacherWorkspace` 구조를 완성

- [ ] **Step 5: 완료 메시지와 실패 메시지 추가**

복사 완료 시:

- 반영 단원 수
- 새 단어 수
- 중복 건너뜀 수

실패 시:

- 기존 items 유지
- 오류 메시지 노출

- [ ] **Step 6: 검증**

Run: `npm run build`  
Expected: PASS

수동 확인:

- 검색 결과 카드에서 source 선택이 되는지
- `우리 학교 카드로 복사` 버튼이 선택 전에는 비활성화되는지
- 복사 후 현재 교사의 같은 학년 단원들이 실제로 늘어나는지
- 중복만 있는 경우에도 실패하지 않고 요약 메시지가 나오는지

- [ ] **Step 7: Commit**

```bash
git add src/components/TeacherWorkspace.jsx src/hooks/useVocabularyLibrary.js src/lib/firebase.js src/styles/global.css src/utils/vocabularyMerge.js
git commit -m "feat: add publisher-based set copy flow"
```

---

### Task 6: Regression pass, versioning, and release notes

**Files:**
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/src/constants/app.js`
- Modify: `/Volumes/DATA/Dev/Codex/talking-vacab-quiz/package.json`

- [ ] **Step 1: 버전 업데이트**

새 기능 반영 버전으로 미세 조정한다.

- `src/constants/app.js`
- `package.json`

- [ ] **Step 2: 업데이트 기록 추가**

`update info` 모달용 이력에 아래를 요약 추가한다.

- 학년별 출판사 선택
- 다른 학교 공개 카드 복사
- 교사 화면 섹션 재배치

- [ ] **Step 3: 전체 검증**

Run: `npm run build`  
Expected: PASS

Run: `git diff --check`  
Expected: no output

- [ ] **Step 4: 수동 smoke check**

확인 항목:

- 교사 화면에서 엑셀 섹션이 위에 보이는지
- 학년 변경 시 출판사 드롭다운 값이 바뀌는지
- 출판사 미선택이면 저장/검색이 막히는지
- 복사 검색 결과가 현재 학년만 기준인지
- 복사 결과에서 현재 학교가 제외되는지

- [ ] **Step 5: Commit**

```bash
git add src/constants/app.js package.json
git commit -m "chore: update release notes for publisher copy feature"
```

---

## Notes For Implementers

- 복사 기능은 공개 세트만 읽어야 한다. 비공개 세트를 검색 대상으로 포함하지 않는다.
- `다른 학교` 조건을 UI 문구와 실제 검색 결과 모두에서 지켜야 한다.
- 출판사 draft는 즉시 저장하지 않는다. 저장 시점은 `현재 단원 저장`, `엑셀 일괄 저장`, `복사 실행`뿐이다.
- legacy fallback에서 `gradePublishers[grade]`와 세트 `publisher`가 다르면 학년 메타데이터를 우선한다.
- 기존 데이터에 `publisher`가 없는 경우 일반 로드는 허용되지만, 출판사 기반 복사 검색에는 잡히지 않는다.
