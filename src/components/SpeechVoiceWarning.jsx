export function SpeechVoiceWarning({ speech, pronunciation }) {
  if (!speech) {
    return null;
  }

  // 원어민 MP3로 재생 중이면 기기 음성 경고가 필요 없다.
  if (pronunciation?.lastSource === "mp3") {
    return null;
  }

  if (!speech.supported) {
    return (
      <article className="notice-card" role="note">
        <strong>소리가 안 나면</strong>
        <p>이 브라우저는 음성 읽기를 지원하지 않습니다. Chrome 또는 Edge에서 열어주세요.</p>
      </article>
    );
  }

  if (!speech.voicesReady) {
    return (
      <article className="notice-card" role="status">
        <p>영어 음성을 준비하는 중입니다. 잠시 후 자동으로 읽어줍니다.</p>
      </article>
    );
  }

  if (speech.hasEnglishVoice && !speech.speakError && !pronunciation?.lastError) {
    return null;
  }

  if (pronunciation?.lastSource === "mp3" || !speech.hasEnglishVoice) {
    // MP3 우선 모드에서는 안내 문구만 간단히 보여준다.
    if (pronunciation?.lastSource === "mp3") {
      return null;
    }
  }

  if (!speech.hasEnglishVoice && pronunciation) {
    return (
      <article className="notice-card" role="note">
        <strong>원어민 음원으로 들려주는 중이에요</strong>
        <p>
          기기에 영어 음성이 없어도 원어민 MP3로 먼저 들려줍니다. 잘 안 들리면
          다시 듣기 버튼을 눌러주세요.
        </p>
      </article>
    );
  }

  return (
    <article className="notice-card" role="note">
      <strong>영어 음성이 없어서 한국어 음성으로 들릴 수 있어요</strong>
      <p>
        잘 안 들리면 Chrome·Edge 사용, 기기 설정에서 영어 음성 설치 후 아래 다시 듣기
        버튼을 눌러주세요.
      </p>
    </article>
  );
}
