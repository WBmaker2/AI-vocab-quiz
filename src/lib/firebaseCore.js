import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  createSpellingLeaderboardApi,
  validateSpellingLeaderboardResult,
} from "./spellingLeaderboard.js";
export { createSpellingLeaderboardApi, validateSpellingLeaderboardResult };


function getEnvValue(name) {
  return String(import.meta.env?.[name] ?? "").trim();
}

const firebaseConfig = {
  apiKey: getEnvValue("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvValue("VITE_FIREBASE_APP_ID"),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

const app = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const firebaseApp = app;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

async function initializeAuthPersistence(firebaseAuth) {
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
    return "local";
  } catch (localError) {
    try {
      await setPersistence(firebaseAuth, browserSessionPersistence);
      return "session";
    } catch (sessionError) {
      console.warn(
        "Firebase Auth persistence is unavailable; continuing with in-memory auth.",
        { localError, sessionError },
      );
      return "memory";
    }
  }
}

const authPersistenceReadyPromise = auth
  ? initializeAuthPersistence(auth)
  : Promise.resolve("disabled");

try {
  if (typeof globalThis !== "undefined") {
    globalThis.__FIREBASE_CORE__ = globalThis.__FIREBASE_CORE__ || {};
    globalThis.__FIREBASE_CORE__.authPersistenceReady = authPersistenceReadyPromise;
  }
} catch {
  // ignore
}

export { authPersistenceReadyPromise as authPersistenceReady };

export function ensureFirebase() {
  if (!auth || !db) {
    throw new Error("Firebase environment variables are not configured.");
  }

  return { auth, db };
}
