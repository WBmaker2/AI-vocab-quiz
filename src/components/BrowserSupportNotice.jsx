export function BrowserSupportNotice({ support }) {
  return (
    <section className="notice-card notice-card-compact" aria-label="브라우저 지원 안내">
      <div className="notice-copy">
        <strong>브라우저 안내</strong>
        <p>TTS는 대부분 지원, STT는 Chrome·Edge에서 가장 안정적입니다.</p>
      </div>
      <div className="support-grid">
        <span className={support.tts ? "support-pill on" : "support-pill off"}>
          TTS {support.tts ? "사용 가능" : "확인 필요"}
        </span>
        <span className={support.stt ? "support-pill on" : "support-pill off"}>
          STT {support.stt ? "사용 가능" : "지원 제한"}
        </span>
      </div>
    </section>
  );
}
