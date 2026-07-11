# Deployment Policy

## Canonical Deployment Target

This project uses **Vercel** as the default and preferred deployment platform.

- Deploy changes to Vercel after code updates.
- Treat the Vercel deployment as the primary live environment.
- Do not add alternate deployment-specific routing or asset path workarounds unless requirements change explicitly.

## Git Workflow

For normal project updates, use this order:

1. Make the code change
2. Add the user-visible update to `src/constants/app.js`
3. Add or update the dated note in `docs/changes/`
4. Run `npm test`, `npm run test:rules`, `npm run build`, `npm run test:smoke`, and `npm audit --omit=dev`
5. Commit the change to Git
6. Push to the remote repository
7. Deploy to Vercel

## Mandatory Release Record

Every meaningful app improvement must be recorded before deployment:

- The small in-app `업데이트 내역` button reads `APP_UPDATES` from
  `src/constants/app.js`.
- The first entry is the visible current version and must include the actual
  improvement date.
- Cross-cutting releases also need a durable dated note in `docs/changes/`
  so a future project session can recover architecture, migration, and
  verification decisions.

Do not deploy a meaningful behavior change if these records are missing.

## Required CI Gates

- `unit-build-smoke`: production dependency audit, unit tests, one build,
  Chromium installation, and browser smoke.
- `firestore-rules`: Firestore emulator rules tests in a separate required
  job.

## Vercel-First Rule

When implementing or refactoring:

- Prefer Vercel-compatible static deployment behavior
- Do not add host-specific redirects, alternate static output folders, or legacy multi-target deployment workarounds for new changes
- If deployment assumptions conflict, choose the Vercel-friendly option

## Change in Policy

Only change this policy if the project owner explicitly decides to switch away from Vercel or support multiple deployment targets.
