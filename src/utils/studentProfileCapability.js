import { normalizeStudentNameKey } from "./leaderboard.js";

export const STUDENT_PROFILE_CAPABILITY_STORAGE_KEY =
  "studentProfileCapabilities.v2";

const PROFILE_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

function normalizeScopeValue(value) {
  return String(value ?? "").trim();
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readCapabilities(storage) {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(STUDENT_PROFILE_CAPABILITY_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
      ? parsedValue
      : {};
  } catch {
    return {};
  }
}

function writeCapabilities(storage, capabilities) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      STUDENT_PROFILE_CAPABILITY_STORAGE_KEY,
      JSON.stringify(capabilities),
    );
    return true;
  } catch {
    return false;
  }
}

export function isStudentProfileCapabilityToken(value) {
  return PROFILE_TOKEN_PATTERN.test(String(value ?? ""));
}

export function createStudentProfileCapabilityScope({
  schoolId,
  grade,
  studentName,
}) {
  return JSON.stringify([
    normalizeScopeValue(schoolId),
    normalizeScopeValue(grade),
    normalizeStudentNameKey(studentName),
  ]);
}

export function createStudentProfileCapabilityToken({
  crypto = globalThis.crypto,
} = {}) {
  if (!crypto || typeof crypto.getRandomValues !== "function") {
    return null;
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function findStudentProfileCapability({
  schoolId,
  grade,
  studentName,
  storage = getDefaultStorage(),
}) {
  const capabilities = readCapabilities(storage);

  if (!capabilities) {
    return null;
  }

  const profileToken = capabilities[
    createStudentProfileCapabilityScope({ schoolId, grade, studentName })
  ];

  return isStudentProfileCapabilityToken(profileToken) ? profileToken : null;
}

export function getOrCreateStudentProfileCapability({
  schoolId,
  grade,
  studentName,
  storage = getDefaultStorage(),
  createToken = createStudentProfileCapabilityToken,
}) {
  const scope = createStudentProfileCapabilityScope({ schoolId, grade, studentName });
  const capabilities = readCapabilities(storage);

  if (!capabilities) {
    return null;
  }

  const existingToken = capabilities[scope];

  if (isStudentProfileCapabilityToken(existingToken)) {
    return existingToken;
  }

  const profileToken = createToken();

  if (!isStudentProfileCapabilityToken(profileToken)) {
    return null;
  }

  return writeCapabilities(storage, { ...capabilities, [scope]: profileToken })
    ? profileToken
    : null;
}
