import { APP_VERSION } from "../constants/app.js";

const env = import.meta.env ?? {};
const DEFAULT_ERROR_REPORT_URL = String(env.VITE_ERROR_REPORT_URL ?? "").trim();
const DEFAULT_SENTRY_DSN = String(env.VITE_SENTRY_DSN ?? "").trim();
const MAX_EVENTS_PER_MINUTE = 12;
const DEDUPE_WINDOW_MS = 60_000;

let globalHandlersInstalled = false;
let sentryClient = null;
let recentEvents = [];

function getNow() {
  return Date.now();
}

function getLocationHref() {
  return typeof globalThis.location?.href === "string"
    ? globalThis.location.href
    : "";
}

export function buildErrorPayload(error, context = {}, options = {}) {
  const now = options.now ?? getNow();
  const message =
    typeof error === "string"
      ? error
      : String(error?.message ?? "Unknown client error");
  const stack = typeof error?.stack === "string" ? error.stack : "";

  return {
    type: "error",
    source: "client",
    version: APP_VERSION,
    timestamp: new Date(now).toISOString(),
    message,
    name: String(error?.name ?? ""),
    code: String(error?.code ?? ""),
    stack,
    url: options.url ?? getLocationHref(),
    userAgent:
      options.userAgent ??
      String(globalThis.navigator?.userAgent ?? ""),
    context,
  };
}

export function shouldReportEvent(key, options = {}) {
  const now = options.now ?? getNow();
  const maxEvents = options.maxEvents ?? MAX_EVENTS_PER_MINUTE;
  const windowMs = options.windowMs ?? DEDUPE_WINDOW_MS;

  recentEvents = recentEvents.filter((event) => now - event.time < windowMs);

  if (recentEvents.length >= maxEvents) {
    return false;
  }

  if (recentEvents.some((event) => event.key === key)) {
    return false;
  }

  recentEvents.push({ key, time: now });
  return true;
}

function sendPayload(url, payload) {
  if (!url) {
    return false;
  }

  const body = JSON.stringify(payload);

  try {
    if (typeof globalThis.navigator?.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      return globalThis.navigator.sendBeacon(url, blob);
    }

    if (typeof globalThis.fetch === "function") {
      void globalThis.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function reportClientError(
  error,
  context = {},
  options = {},
) {
  const payload = buildErrorPayload(error, context, options);
  const key = `${payload.name}:${payload.message}:${payload.stack.slice(0, 120)}`;

  if (!shouldReportEvent(key, options)) {
    return null;
  }

  const sentry = options.sentry ?? sentryClient;

  if (sentry && typeof sentry.captureException === "function") {
    sentry.captureException(
      error instanceof Error ? error : new Error(payload.message),
      { extra: { ...context, version: APP_VERSION } },
    );
  }

  const url = options.reportUrl ?? DEFAULT_ERROR_REPORT_URL;
  if (url) {
    sendPayload(url, payload);
  } else if (env.DEV) {
    console.error("[observability]", payload);
  }

  return payload;
}

export function reportWebVital(metric, options = {}) {
  const payload = {
    type: "web-vital",
    source: "client",
    version: APP_VERSION,
    timestamp: new Date(options.now ?? getNow()).toISOString(),
    name: metric?.name ?? "",
    value: Number(metric?.value ?? 0),
    rating: metric?.rating ?? "",
    id: metric?.id ?? "",
    navigationType: metric?.navigationType ?? "",
    url: options.url ?? getLocationHref(),
  };

  const key = `vital:${payload.name}:${payload.id}`;
  if (!shouldReportEvent(key, options)) {
    return null;
  }

  const url = options.reportUrl ?? DEFAULT_ERROR_REPORT_URL;
  if (url) {
    sendPayload(url, payload);
  }

  return payload;
}

export function installGlobalErrorHandlers() {
  if (
    globalHandlersInstalled ||
    typeof globalThis.addEventListener !== "function"
  ) {
    return () => {};
  }

  globalHandlersInstalled = true;

  const handleError = (event) => {
    reportClientError(event?.error ?? event?.message ?? "window error", {
      source: "window.error",
    });
  };
  const handleRejection = (event) => {
    reportClientError(event?.reason ?? "unhandled rejection", {
      source: "unhandledrejection",
    });
  };

  globalThis.addEventListener("error", handleError);
  globalThis.addEventListener("unhandledrejection", handleRejection);

  return () => {
    globalThis.removeEventListener("error", handleError);
    globalThis.removeEventListener("unhandledrejection", handleRejection);
    globalHandlersInstalled = false;
  };
}

async function initSentry(dsn, options) {
  if (!dsn) {
    return null;
  }

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      release: APP_VERSION,
      environment: String(env.MODE ?? "production"),
      tracesSampleRate: Number(options.tracesSampleRate ?? 0.05),
    });
    return Sentry;
  } catch (error) {
    if (env.DEV) {
      console.warn("[observability] Sentry initialization failed", error);
    }
    return null;
  }
}

function initWebVitals(options) {
  if (typeof globalThis.window === "undefined") {
    return;
  }

  void import("web-vitals")
    .then(({ onCLS, onINP, onLCP, onTTFB }) => {
      const report = (metric) => reportWebVital(metric, options);
      onCLS(report);
      onINP(report);
      onLCP(report);
      onTTFB(report);
    })
    .catch(() => {});
}

export async function initObservability(options = {}) {
  const removeGlobalHandlers = installGlobalErrorHandlers();
  const sentry = await initSentry(
    options.sentryDsn ?? DEFAULT_SENTRY_DSN,
    options,
  );

  sentryClient = sentry;
  initWebVitals(options);

  return () => {
    removeGlobalHandlers();
    sentryClient = null;
    recentEvents = [];
  };
}

export function resetObservabilityForTests() {
  recentEvents = [];
  sentryClient = null;
  globalHandlersInstalled = false;
}
