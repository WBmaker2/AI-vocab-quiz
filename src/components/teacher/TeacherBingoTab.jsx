import {
  getTeacherBingoAvailableUnits,
  getTeacherBingoBoardLabel,
  getTeacherBingoSelectedUnits,
} from "./teacherBingoView.js";

export function TeacherBingoTab({
  bingo,
  units,
  canStartBingo = false,
  onOpenBingoHost,
  onBack,
}) {
  const bingoAvailableUnits = getTeacherBingoAvailableUnits(bingo, units);
  const bingoSelectedUnits = getTeacherBingoSelectedUnits(bingo);
  const bingoCanStart = bingo?.canStart ?? canStartBingo;

  return (
    <div className="launch-card">
      <div>
        <p className="mode-label">Student Access</p>
        <h3>학생 공개와 학급 빙고</h3>
        <p>
          학생은 홈 화면에서 학교, 선생님, 학년, 단원을 순서대로 선택한 뒤
          공개된 단어 세트를 불러와 활동을 시작합니다. 학급 빙고는 현재
          선택한 단원들에 9개 이상 단어가 있어야 시작할 수 있습니다.
        </p>
      </div>

      <div className="bingo-launch-section">
        <p className="mode-label">Bingo Setup</p>
        <h4>학급 빙고 단원 선택</h4>
        <p className="inline-hint">
          짝 맞추기처럼 여러 단원을 함께 선택해 빙고 단어 풀을 만듭니다.
          선택한 단원의 공개 단어를 합쳐 학생 배치 화면으로 넘어갑니다.
        </p>
        <div className="matching-unit-grid bingo-unit-grid">
          {bingoAvailableUnits.length > 0 ? (
            bingoAvailableUnits.map((unit) => {
              const cleanUnit = String(unit ?? "").trim();
              const selected = bingoSelectedUnits.includes(cleanUnit);
              return (
                <label
                  key={cleanUnit}
                  className={
                    selected
                      ? "matching-unit-option matching-unit-option-selected"
                      : "matching-unit-option"
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => bingo?.toggleUnit?.(cleanUnit)}
                  />
                  <span>{cleanUnit}단원</span>
                </label>
              );
            })
          ) : (
            <p className="inline-hint warning-hint">
              현재 학년에서 선택할 수 있는 단원이 없습니다.
            </p>
          )}
        </div>
        <div className="teacher-bingo-preview">
          <span>
            선택 단원:{" "}
            {bingo?.selectedUnitLabels?.length
              ? bingo.selectedUnitLabels.join(", ")
              : "없음"}
          </span>
          <span>사용 단어: {bingo?.items?.length ?? 0}개</span>
          <span>빙고판: {getTeacherBingoBoardLabel(bingo?.boardSize)}</span>
        </div>
      </div>

      <div className="stack-actions">
        <button
          className="secondary-button"
          onClick={onOpenBingoHost}
          disabled={!bingoCanStart}
        >
          학급 빙고 수업 시작
        </button>
        <button className="primary-button" onClick={onBack}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
