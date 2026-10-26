export function readAppCheckConfig(env = {}) {
  const siteKey = String(env?.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? "").trim();
  const debugToken = String(env?.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? "").trim();

  return {
    siteKey,
    debugToken,
    enabled: Boolean(siteKey),
  };
}
