export function StudentBingoSetupBoard({ boardTitle, onBack, sessionCode, playerName, roundLabel, setupCountdownWarning, setupSecondsLeft, setupBoardComplete, setupCountLabel, setupBoardSize, setupGridRows, selectedSetupWordId, handleSetupCellClick, handleSetupCellDrop, handleSetupBoardDragStart, localError, statusMessage, actionLoading, setupFinalizeMode, handleFinalizeSetup, trayWords, handleSetupWordClick, handleSetupTrayDragStart, setupDraftCells }) {
  return (
    <section className="workspace-panel bingo-board-shell">
      <div className="section-heading bingo-board-heading">
        <div>
          <p className="mode-label">Student Board</p>
          <h2>{boardTitle}</h2>
          <p className="bingo-host-copy">
            영단어를 드래그하거나 눌러서 내 빙고판을 완성하세요.
          </p>
        </div>
        {onBack ? (
          <button className="ghost-button" type="button" onClick={onBack}>
            나가기
          </button>
        ) : null}
      </div>

      <div className="bingo-session-strip">
        <span className="bingo-session-pill">
          세션 코드 <strong>{sessionCode || "-"}</strong>
        </span>
        {playerName ? (
          <span className="bingo-session-pill">
            학생 <strong>{playerName}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill bingo-session-pill-accent">
          상태 <strong>배치 중</strong>
        </span>
        {roundLabel ? (
          <span className="bingo-session-pill">
            라운드 <strong>{roundLabel}</strong>
          </span>
        ) : null}
        <span
          className={`bingo-session-pill bingo-session-pill-button ${
            setupCountdownWarning ? "bingo-session-pill-warning" : ""
          }`}
        >
          남은 시간 <strong>{setupSecondsLeft}초</strong>
        </span>
      </div>

      <div className="bingo-setup-grid">
        <article className="bingo-card bingo-setup-board-card">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">Board Setup</p>
              <h3>빙고판 배치</h3>
            </div>
            <span className="bingo-status-chip">
              {setupBoardComplete ? "완성됨" : `${setupCountLabel} 배치`}
            </span>
          </div>

          <p className="bingo-call-helper">
            아래 카드들을 빈 칸에 드래그하거나, 카드를 먼저 눌러서 칸을 직접
            선택해 배치하세요. 60초 안에 모두 채우지 못하면 남은 칸은 자동
            완성됩니다.
          </p>

          <div
            className="bingo-setup-board"
            style={{ "--bingo-board-columns": setupBoardSize }}
          >
            {setupGridRows.flat().map((cell, index) => {
              const isSelected = selectedSetupWordId === cell.wordId && Boolean(cell.wordId);
              return (
                <button
                  key={cell.wordId || `setup-cell-${index}`}
                  type="button"
                  className={
                    cell.wordId
                      ? `bingo-setup-cell bingo-setup-cell-filled ${
                          isSelected ? "bingo-setup-cell-selected" : ""
                        }`
                      : `bingo-setup-cell bingo-setup-cell-empty ${
                          setupCountdownWarning ? "bingo-setup-cell-warning" : ""
                        }`
                  }
                  onClick={() => handleSetupCellClick(cell, index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleSetupCellDrop(event, index)}
                  draggable={Boolean(cell.wordId)}
                  onDragStart={
                    cell.wordId
                      ? (event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", cell.wordId);
                          handleSetupBoardDragStart(cell.wordId);
                        }
                      : undefined
                  }
                >
                  {cell.wordId ? (
                    <>
                      <strong>{cell.word}</strong>
                      {cell.meaning ? <small>{cell.meaning}</small> : null}
                    </>
                  ) : (
                    <span>빈 칸</span>
                  )}
                </button>
              );
            })}
          </div>

          {localError ? <p className="bingo-host-status bingo-host-status-error">{localError}</p> : null}
          {statusMessage ? <p className="bingo-host-status">{statusMessage}</p> : null}

          <div className="toolbar-row bingo-setup-actions">
            <button
              type="button"
              className={`primary-button${setupBoardComplete && !actionLoading ? " gi-pulse" : ""}`}
              onClick={() => handleFinalizeSetup(false)}
              disabled={!setupBoardComplete || actionLoading}
            >
              {actionLoading && setupFinalizeMode !== "random"
                ? "빙고판 확정 중..."
                : "빙고판 배치 완료"}
            </button>
            <button
              type="button"
              className="secondary-button bingo-randomize-button"
              onClick={() => handleFinalizeSetup(true)}
              disabled={actionLoading}
            >
              {actionLoading && setupFinalizeMode === "random"
                ? "랜덤 배치 중..."
                : "빙고판 랜덤 배치"}
            </button>
          </div>
        </article>

        <article className="bingo-card bingo-setup-tray-card">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">Fishing Pool</p>
              <h3>배치할 영단어 카드</h3>
            </div>
            <span className="bingo-status-chip">
              {trayWords.length}개 남음
            </span>
          </div>

          <p className="bingo-call-helper">
            카드를 눌러 선택한 뒤 빈 칸을 누르거나, 바로 드래그해서 배치할 수
            있습니다. 이미 놓은 카드를 다른 칸으로 옮길 수도 있습니다.
          </p>

          <div className="bingo-setup-tray">
            {trayWords.length > 0 ? (
              trayWords.map((tile) => {
                const isSelected = selectedSetupWordId === tile.wordId;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={
                      isSelected
                        ? "bingo-setup-word-card bingo-setup-word-card-selected"
                        : "bingo-setup-word-card"
                    }
                    onClick={() => handleSetupWordClick(tile.wordId)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", tile.wordId);
                      handleSetupTrayDragStart(tile.wordId);
                    }}
                  >
                    <strong>{tile.word}</strong>
                    {tile.meaning ? <small>{tile.meaning}</small> : null}
                  </button>
                );
              })
            ) : (
              <div className="bingo-empty-state">모든 카드가 배치되었습니다.</div>
            )}
          </div>

          <div className="bingo-metric-row">
            <span className="bingo-metric">
              배치 완료 <strong>{setupDraftCells.filter((cell) => Boolean(cell.wordId)).length}</strong>
            </span>
            <span className="bingo-metric">
              남은 시간 <strong>{setupSecondsLeft}초</strong>
            </span>
          </div>

          <p className={`bingo-host-status ${setupCountdownWarning ? "bingo-host-status-warning" : ""}`}>
            {actionLoading
              ? "선생님에게 내 빙고판을 전달하고 있어요."
              : setupCountdownWarning
              ? "시간이 얼마 남지 않았어요. 남은 칸은 자동으로 채워집니다."
              : "카드를 눌러 선택한 뒤 칸에 배치하세요."}
          </p>
        </article>
      </div>
    </section>
  );
}
