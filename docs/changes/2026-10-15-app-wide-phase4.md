# 4순위 완료: 검증 환경 복구

- 스모크: `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hvc-browsers npx playwright install chromium`으로 headless 셸 설치 후 `npm run test:smoke` 통과 확인.
- 규칙 테스트: Java가 없어 에뮬레이터가 돌지 않던 문제 → `/opt/homebrew/opt/openjdk@21/bin`을 PATH에 추가하고 `XDG_CONFIG_HOME=/private/tmp/hvc-fb-config`으로 실행해 `npm run test:rules` 82개 전부 통과.
- CI(`ci.yml`)는 audit·unit·build·smoke·rules 게이트를 그대로 유지. 로컬 재실행 명령은 이 문서 기준으로 하면 된다.
