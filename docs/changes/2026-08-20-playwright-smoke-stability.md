# Playwright 스모크 테스트 안정화

## 변경 목적

자동 스모크 테스트가 앱 화면이 준비되기 전에 다음 두 가지 환경 문제로 실패하는 상황을 줄입니다.

- macOS 또는 CI 환경의 Chromium 권한 제약으로 `Permission denied (1100)`이 발생하는 문제
- Firebase 등의 백그라운드 요청 때문에 `networkidle` 상태가 되지 않아 페이지 로딩이 시간 초과하는 문제

## 구현 내용

- `scripts/playwright_smoke.js`에 제한 환경용 Chromium launch 옵션을 분리했습니다.
- `CI=true` 또는 `PLAYWRIGHT_RESTRICTED_ENV=1`이면 제한 환경 옵션으로 처음부터 실행합니다.
- 일반 로컬 실행은 안전한 기본 실행을 먼저 시도하고, `Permission denied (1100)` 또는 Chromium의 `bootstrap_check_in` 권한 오류일 때만 제한 옵션으로 한 번 자동 재시도합니다.
- 제한 옵션은 스모크 테스트 브라우저에만 적용되며 실제 앱 코드와 배포 번들에는 포함되지 않습니다.
- `networkidle` 대신 `domcontentloaded`를 사용하고, 랜딩 제목·업데이트 내역 버튼·버전 표시가 실제로 보일 때까지 명시적으로 기다립니다.
- 페이지 JavaScript 오류, 로컬 정적 리소스 요청 실패, 로컬 HTTP 오류를 수집해 실패 원인을 출력합니다.
- 브라우저 실행이나 페이지 이동이 실패해도 정적 서버·브라우저·컨텍스트를 정리하도록 종료 처리를 보강했습니다.

## 실행 방법

일반 로컬 실행:

```bash
npm run test:smoke
```

제한 환경 옵션을 처음부터 강제하는 실행:

```bash
PLAYWRIGHT_RESTRICTED_ENV=1 npm run test:smoke
```

GitHub Actions에서는 `CI=true`가 자동으로 설정되어 제한 환경 모드가 적용됩니다.

## 검증 결과

- `node --check scripts/playwright_smoke.js`: 통과
- `git diff --check`: 통과
- `npm test`: `161 passed`, `79 skipped`, `0 failed`
  - 79개는 Firestore Emulator가 실행되지 않은 환경에서 기존 조건대로 건너뛰었습니다.
- `npm run build`: 통과
- `npm run test:smoke`: 통과
  - 이 macOS 실행 환경에서는 기본 Chromium 권한 오류 후 제한 모드로 자동 전환되었습니다.
- `PLAYWRIGHT_RESTRICTED_ENV=1 npm run test:smoke`: 통과

빌드와 스모크를 동시에 실행하면 빌드가 `dist`의 지연 로딩 청크를 교체하는 순간 404가 발생할 수 있습니다. 새 진단 로직이 해당 로컬 청크 실패를 정확히 표시했으며, 빌드 완료 후 스모크를 순차 실행하자 정상 통과했습니다. 따라서 CI와 로컬에서도 빌드와 스모크는 순서대로 실행합니다.

## 버전 기록

이번 변경은 사용자 기능이나 화면이 아닌 테스트 실행기 안정화 변경이므로 앱 화면 버전 `v1.13.1`은 유지합니다.
