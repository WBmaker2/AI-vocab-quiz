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

## Firebase Console steps

1. Create a Firebase project.
2. Add a Web App.
3. Enable Authentication.
4. Enable the Google provider in Authentication.
5. Create a Firestore database in production mode.
6. Apply the Firestore rules from `/firestore.rules`.

## Firestore collections

- `schools`
- `teachers`
- `vocabularySets`

## Notes

- Teachers sign in with Google only.
- Students do not sign in.
- Students can read only published sets through Firestore rules.
