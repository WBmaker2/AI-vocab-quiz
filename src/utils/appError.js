const KOREAN_PATTERN = /[가-힣]/;

const MESSAGE_BY_CODE = [
  {
    pattern:
      /permission-denied|insufficient permissions|missing or insufficient permissions/i,
    message:
      "권한을 확인하지 못했습니다. 잠시 후 다시 시도하거나 선생님께 알려 주세요.",
  },
  {
    pattern: /unauthenticated|auth\/|not authenticated|login required/i,
    message: "로그인이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.",
  },
  {
    pattern:
      /unavailable|network-request-failed|failed to fetch|networkerror|offline|internet_disconnected|err_connection/i,
    message: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
  },
  {
    pattern: /deadline-exceeded|timeout|timed out/i,
    message: "응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.",
  },
  {
    pattern: /resource-exhausted|too many requests|quota exceeded/i,
    message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  },
  {
    pattern: /not-found|no document to update|document not found/i,
    message: "요청한 자료를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.",
  },
  {
    pattern: /aborted|cancelled|canceled/i,
    message: "작업이 취소되었습니다. 다시 시도해 주세요.",
  },
  {
    pattern: /already-exists/i,
    message: "이미 처리된 요청입니다. 화면을 새로고침해 주세요.",
  },
  {
    pattern: /storage|quotaexceeded|quota exceeded/i,
    message:
      "이 브라우저의 저장 공간을 사용할 수 없습니다. 저장 공간을 확인해 주세요.",
  },
  {
    pattern: /firebase environment variables|firebase.*not configured/i,
    message: "Firebase 연결 설정이 필요합니다. 관리자에게 알려 주세요.",
  },
  {
    pattern: /invalid-argument/i,
    message: "입력한 내용을 확인한 뒤 다시 시도해 주세요.",
  },
];

export function getErrorCode(error) {
  if (!error || typeof error !== "object") {
    return "";
  }

  return String(error.code ?? error.name ?? "").trim();
}

export function getErrorMessage(error) {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return String(error.message ?? "").trim();
}

export function isKoreanMessage(value) {
  return KOREAN_PATTERN.test(String(value ?? ""));
}

export function formatAppError(error, fallback = "요청을 처리하지 못했습니다.") {
  const code = getErrorCode(error);
  const rawMessage = getErrorMessage(error);
  const searchable = `${code} ${rawMessage}`.trim();

  for (const entry of MESSAGE_BY_CODE) {
    if (entry.pattern.test(searchable)) {
      return entry.message;
    }
  }

  if (isKoreanMessage(rawMessage)) {
    return rawMessage;
  }

  if (code) {
    return fallback;
  }

  return fallback;
}
