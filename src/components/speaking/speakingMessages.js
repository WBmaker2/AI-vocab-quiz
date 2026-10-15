export function getGuidance(error) {
  if (error === "microphone-permission-denied") {
    return {
      title: "마이크 권한이 필요합니다",
      body: "브라우저 주소창의 사이트 권한에서 마이크를 허용한 뒤 다시 시도하세요.",
    };
  }

  if (error === "microphone-device-missing") {
    return {
      title: "마이크를 찾을 수 없습니다",
      body: "기기에 연결된 입력 마이크가 있는지 확인하고 다른 앱이 마이크를 사용 중인지 점검하세요.",
    };
  }

  if (error === "microphone-device-busy") {
    return {
      title: "마이크가 다른 앱에서 사용 중입니다",
      body: "다른 앱의 녹음이나 화상회의를 종료한 뒤 다시 시도하세요.",
    };
  }

  if (error === "speech-recognition-safari-limited") {
    return {
      title: "Safari 말하기 인식이 제한되었습니다",
      body: "마이크 권한이 허용되어 있어도 Safari에서는 브라우저 음성 인식이 시작되지 않을 수 있습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 여는 것이 더 안정적입니다.",
    };
  }

  if (error === "speech-recognition-service-unavailable" || error === "speech-recognition-network-error") {
    return {
      title: "브라우저 음성 인식을 시작하지 못했습니다",
      body: "마이크 권한과 입력 장치는 정상일 수 있지만, 현재 브라우저의 STT 서비스가 시작되지 않았습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  if (error === "microphone-access-failed" || error === "speech-recognition-start-failed") {
    return {
      title: "말하기 인식을 시작하지 못했습니다",
      body: "브라우저를 새로고침하고 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  return null;
}

export function getStatusMessage({
  supported,
  listening,
  transcript,
  question,
  status,
}) {
  if (!supported) {
    return "이 브라우저에서는 말하기 평가를 지원하지 않습니다. Chrome 또는 Edge에서 다시 시도하세요.";
  }

  if (listening) {
    return "듣는 중입니다. 화면의 단어를 또박또박 말해보세요.";
  }

  if (status === "correct") {
    return `좋아요. "${question.word}" 단어가 맞게 인식되었습니다.`;
  }

  if (status === "incorrect" && transcript) {
    return `인식 결과는 "${transcript}"입니다. 단어를 다시 듣고 한 번 더 말해보세요.`;
  }

  if (status === "empty") {
    return "음성이 인식되지 않았습니다. 마이크 버튼을 눌러 다시 시도하세요.";
  }

  return "단어를 보고 마이크 버튼을 눌러 말해보세요.";
}
