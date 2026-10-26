# AI-vocab-quiz

## Development

- `npm ci`
- Copy `.env.example` to `.env.local` and set the Firebase config values
- `npm run dev`

New teacher accounts start in approval-waiting state. A project administrator
must set `teachers/{uid}.isActive` to `true` from a trusted Firebase Console
or Admin SDK environment before the teacher can manage school data.

Student personal growth records are device-private. The browser stores an
unguessable local capability; clearing browser storage intentionally starts a
new personal record. Public leaderboard records remain shared.

## Build

- `npm run build`
- `npm run preview`

## Verification

- `npm test`
- `npm run lint`
- `npm run test:rules`
- `npm run test:activities`
- `npm run build`
- `npm run test:smoke`
- `npm audit --omit=dev`

Spreadsheet bulk import accepts modern `.xlsx` files only. Re-save legacy
`.xls` files as `.xlsx` in Excel before uploading. Files are limited to
5 MiB and 5,000 data rows.

## Deployment

The current operating baseline is [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

- **Vercel production** is the primary live environment: `https://talking-vacab-quiz.vercel.app`
- Firebase Hosting remains a secondary path: `https://talking-vocab-quiz.web.app`
- Firestore rules are deployed separately from the frontend.
- Shared vocabulary storage uses Firebase so teachers and students can work across different devices

Before every deployment, add a concise entry to `src/constants/app.js` and a
dated note under `docs/changes/`.
