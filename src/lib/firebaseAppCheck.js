import { firebaseApp } from "./firebaseCore.js";
import { readAppCheckConfig } from "../utils/appCheck.js";

export async function initializeFirebaseAppCheck({
  app = firebaseApp,
  env = import.meta.env,
  isBrowser = typeof window !== "undefined",
  loadAppCheck = () => import("firebase/app-check"),
} = {}) {
  const config = readAppCheckConfig(env);

  if (!app || !isBrowser || !config.enabled) {
    return false;
  }

  if (config.debugToken && typeof self !== "undefined") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = config.debugToken;
  }

  const { initializeAppCheck, ReCaptchaV3Provider } = await loadAppCheck();
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(config.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return true;
}
