# Firebase Setup

## Environment variables

Copy these values from Firebase project settings into local `.env.local` and Vercel environment variables.

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

For Firebase Hosting production builds, `npm run build:firebase` automatically
uses the Hosting origin as `authDomain`. The default is
`talking-vocab-quiz.web.app`; set `FIREBASE_HOSTING_AUTH_DOMAIN` when a custom
Firebase Hosting domain is connected.

## Firebase Console steps

1. Create a Firebase project.
2. Add a Web App.
3. Enable Authentication.
4. Enable the Google provider in Authentication.
5. Create a Firestore database in production mode.
6. Apply the Firestore rules from `/firestore.rules`.

## Firebase Hosting

The repository is configured for the `talking-vocab-quiz` Hosting site. The
build command creates `dist/`, injects `talking-vocab-quiz.web.app` as the
production Auth domain, and is called automatically by the Hosting predeploy
hook.

```bash
npm run build:firebase
npx firebase hosting:channel:deploy migration-check
npx firebase deploy --only hosting
```

Before production login testing, confirm these domains in Firebase
Authentication and Google OAuth settings:

- `talking-vocab-quiz.web.app`
- `https://talking-vocab-quiz.web.app/__/auth/handler`

The Vercel address can remain active as a fallback until the Firebase Hosting
flow is verified.

## Firestore collections

- `schools`
- `teachers`
- `vocabularySets`

## Notes

- Teachers sign in with Google only.
- Students do not sign in.
- Students can read only published sets through Firestore rules.

## Teacher approval

New teacher profiles are created in the `teachers` collection with
`isActive: false`. Pending teachers can see only the approval-wait screen and
cannot write vocabulary sets. Existing active profiles remain active.

### Find pending requests

In the Firebase Console, open Firestore Database and query the `teachers`
collection where `isActive` is equal to `false`. Verify the `teacherName`,
`schoolId`, and `schoolName` before approving the request.

### Approve a teacher

The project owner must change only the teacher document's `isActive` field to
`true` using the Firebase Console or a trusted Admin SDK environment. Client
Firestore rules intentionally prevent teachers from approving themselves or
changing their school binding.

```js
import { getFirestore } from "firebase-admin/firestore";

await getFirestore().collection("teachers").doc(teacherUid).update({
  isActive: true,
});
```

Do not use client-side code to activate a teacher. Do not alter `schoolId` or
`schoolName` when approving; create a new request if the school binding is
incorrect.
