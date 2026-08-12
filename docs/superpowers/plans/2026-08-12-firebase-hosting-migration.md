# Firebase Hosting 프론트엔드 마이그레이션 설계

## 1. 목표

Vercel에서 제공하던 프론트엔드를 같은 Firebase 프로젝트의 Firebase Hosting으로
이전할 수 있는 상태로 만들고, 운영 앱과 Firebase 인증 도우미가 같은 출처를
사용하도록 구성한다. 이를 통해 `vercel.app` 앱에서 `firebaseapp.com` 인증 팝업을
열 때 브라우저 저장소가 분리되어 발생할 수 있는 `missing initial state` 오류를
줄인다.

이번 작업의 범위는 배포 가능한 코드와 설정을 만드는 것까지이며, 실제 운영 DNS
전환과 Firebase Hosting 운영 배포는 별도 검증 단계로 둔다.

## 2. 추천 구조

```text
소스 코드
  -> npm run build:firebase
     -> Vite production build
        -> VITE_FIREBASE_AUTH_DOMAIN=talking-vocab-quiz.web.app
           -> dist/
              -> Firebase Hosting live
                 -> https://talking-vocab-quiz.web.app
                    -> /__/auth/handler도 같은 호스트에서 처리
```

- Firebase 프로젝트: `talking-vocab-quiz`
- Hosting 사이트: `talking-vocab-quiz.web.app`
- Firebase SDK의 production `authDomain`: `talking-vocab-quiz.web.app`
- Firestore 규칙과 데이터 구조: 변경하지 않음
- SPA 경로: 모든 미리 알 수 없는 경로를 `/index.html`로 rewrite
- 기존 Vercel 주소: Firebase 검증이 끝날 때까지 예비 주소로 유지

## 3. 변경 범위

### 파일

- `firebase.json`: Firestore 규칙과 Hosting 배포 대상, SPA rewrite, predeploy build를
  함께 선언한다.
- `.firebaserc`: Firebase CLI가 올바른 프로젝트를 선택하도록 프로젝트 alias를
  기록한다.
- `scripts/build-firebase.mjs`: Firebase Hosting 배포 시 same-origin authDomain을
  주입하고 기존 Vite build를 실행한다. 일반 `npm run build`와 로컬 개발 환경은
  기존 설정을 보존한다.
- `src/lib/firebase.js`: 인증 persistence 초기화를 기다린 뒤 Google popup 로그인을
  시작하고, local persistence가 불가능한 환경에서는 session persistence를
  시도한다.
- `.env.example`, `docs/firebase-setup.md`, `README.md`: Firebase Hosting 도메인과
  Google OAuth authorized domain/handler 설정을 설명한다.
- `package.json`, `package-lock.json`, `src/constants/app.js`: `v1.12.1` 버전과
  마이그레이션 업데이트 내역을 기록한다.

### 변경하지 않는 것

- Firestore collection, 문서 ID, 공개 단어 세트, 학생 로딩 API
- 교사 승인 규칙과 학생 쓰기 정책
- Vercel 설정과 기존 `npm run build`의 동작
- Google 계정·교사 프로필 데이터

## 4. 인증 초기화 설계

현재 `setPersistence`가 fire-and-forget으로 호출되어 로그인 버튼이 persistence
초기화보다 먼저 실행될 수 있고, 실패도 무시된다. 다음 순서로 보강한다.

1. Firebase Auth 생성 직후 local persistence를 시도한다.
2. local persistence가 거부되면 session persistence를 시도한다.
3. 두 저장 방식이 모두 거부되어도 앱 초기화는 중단하지 않되, 로그인 popup은
   persistence 초기화 promise가 끝난 뒤 시작한다.
4. 동일 출처 Hosting에서는 Firebase auth helper의 임시 상태가 앱 호스트와 함께
   유지되도록 한다.

저장소 접근을 완전히 차단하는 브라우저나 사생활 보호 모드는 코드만으로 보장할
수 없으므로, 해당 경우에는 사용자에게 브라우저 저장소/팝업 허용을 안내하는
후속 UX가 residual risk로 남는다.

## 5. 완료 조건

- `firebase.json`에 `hosting.public=dist`가 있고 SPA rewrite가 선언된다.
- `firebase deploy --only hosting` 실행 전 `npm run build:firebase`가 자동 실행된다.
- Firebase Hosting production build에서 `authDomain`이
  `talking-vocab-quiz.web.app`으로 주입된다.
- 일반 Vite build는 기존 `.env.local` 값을 사용한다.
- 인증 persistence 초기화가 로그인 호출보다 먼저 완료된다.
- `npm test`와 `npm run build`가 통과한다.
- `dist/index.html`과 Firebase Hosting 설정 JSON이 생성된다.
- UI 버전, `package.json`, `package-lock.json`이 `1.12.1`로 일치한다.
- 실제 Hosting 배포 후 로그인, 교사 프로필 조회, 5·6학년 7~12단원 단어 세트
  불러오기를 브라우저에서 확인한다.

## 6. 위험과 되돌리기

- Firebase Hosting 배포 전에는 Vercel을 유지하므로 기존 서비스 중단은 없다.
- Firebase Hosting에서 문제가 생기면 DNS/사용자 안내를 Vercel로 유지하고, Firebase
  Hosting release를 이전 버전으로 rollback한다.
- Google OAuth 설정에서 `talking-vocab-quiz.web.app`과
  `https://talking-vocab-quiz.web.app/__/auth/handler`를 승인하지 않으면 로그인은
  실패할 수 있다. 이 설정은 코드 배포와 별도로 Firebase/Google Console에서
  확인한다.
- Firebase Hosting preview URL은 실제 Firestore와 연결될 수 있으므로, 교사 데이터
  변경을 포함한 테스트는 운영 계정 대신 읽기 전용 흐름부터 수행한다.

## 7. 검증 순서

1. 정적 설정 검사와 `npm run build:firebase`
2. 기존 단위·규칙 테스트
3. Firebase Hosting preview 또는 live URL에서 학생 단어 세트 읽기
4. 일반 Chrome/Safari에서 교사 Google 로그인
5. 로그인 후 교사 프로필과 단어 세트 관리 확인
6. Vercel 예비 주소와 Firebase Hosting 결과 비교

## 8. 기록

- 설계 문서: `docs/superpowers/plans/2026-08-12-firebase-hosting-migration.md`
- 구현 버전: `v1.12.1`
- 구현 후 별도 승인된 다음 단계에서 Firebase Hosting production deploy를 완료했다.
- DNS 변경은 필요하지 않았고, Google Console의 추가 설정 변경은 자동 실행하지
  않았다. 공개 URL에서 same-origin auth handler가 HTTP 200으로 응답하는 것을
  확인했으며, 실제 Google 계정 선택 이후의 교사 데이터 흐름은 계정이 필요한
  후속 검증으로 남겼다.
