# 2026-08-12 Firebase Hosting 프론트엔드 마이그레이션

## 버전

- 버전: `v1.12.1`
- 날짜: `2026-08-12`
- Firebase Hosting 대상: `https://talking-vocab-quiz.web.app`
- 현재 Vercel 예비 주소: `https://talking-vacab-quiz.vercel.app`
- 상태: Firebase Hosting production deploy 완료

## 변경 내용

- Firebase 프로젝트 `talking-vocab-quiz`에 연결되는 `.firebaserc`를 추가했습니다.
- `dist`를 Firebase Hosting에 배포하고 SPA 경로를 `index.html`로 연결하도록
  `firebase.json`을 확장했습니다.
- Firebase Hosting build에서는 `talking-vocab-quiz.web.app`을 Firebase Auth의
  `authDomain`으로 자동 주입하도록 했습니다.
- Google 로그인 전에 Firebase Auth persistence 초기화를 기다리고, local 저장소가
  막힌 경우 session 저장소를 시도하도록 보강했습니다.
- Firebase Hosting 배포 전 확인해야 할 Google OAuth 승인 도메인과 auth handler
  주소를 문서화했습니다.

## 검증 계획

- `npm run build:firebase`로 production bundle 생성
- `npm test`와 `npm run test:rules` 실행
- Firebase Hosting preview에서 학생 단어 세트 읽기 확인
- Firebase Hosting에서 교사 Google 로그인과 교사 단어 세트 로딩 확인

이번 변경에서는 DNS 변경과 Google Console의 추가 설정 변경은 자동 실행하지
않았습니다. Hosting production deploy는 아래 운영 배포 단계에서 완료했습니다.

## 운영 배포 결과

- Firebase Hosting 배포 완료: `https://talking-vocab-quiz.web.app`
- 배포 버전: `v1.12.1`
- 배포된 앱 화면에서 버전, 게임 버튼 순서, 콘솔 오류, 실패 요청을 확인했습니다.
- `/__/auth/handler` 응답은 HTTP 200이었습니다.
- 교사 로그인 버튼을 누르면 다음 same-origin handler로 팝업이 열렸습니다.
  `https://talking-vocab-quiz.web.app/__/auth/handler`
- Google 계정 선택과 실제 Firestore 쓰기는 자동화 브라우저에서 실행하지 않았습니다.
