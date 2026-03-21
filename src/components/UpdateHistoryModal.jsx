import { useEffect, useId, useRef } from "react";

export function UpdateHistoryModal({ open, currentVersion, updates, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!open) {
      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      previouslyFocusedElementRef.current = null;
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
      return undefined;
    }

    previouslyFocusedElementRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (dialog instanceof HTMLElement) {
      const focusableElements = getFocusableElements(dialog);
      const firstFocusableElement = focusableElements[0] ?? dialog;
      firstFocusableElement.focus();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!(dialog instanceof HTMLElement)) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const currentFocus = document.activeElement;

      if (event.shiftKey) {
        if (currentFocus === firstFocusableElement || currentFocus === dialog) {
          event.preventDefault();
          lastFocusableElement.focus();
        }
        return;
      }

      if (currentFocus === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="update-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="update-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="update-modal-header">
          <div>
            <p className="mode-label">Update Info</p>
            <h2 id={titleId}>업데이트 기록</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="update-modal-body">
          {updates.map((entry) => (
            <article
              key={entry.version}
              className={
                entry.version === currentVersion
                  ? "update-entry update-entry-current"
                  : "update-entry"
              }
            >
              <div className="update-entry-meta">
                <strong>{entry.version}</strong>
                {entry.date ? <span>{entry.date}</span> : null}
              </div>
              <ul>
                {entry.summary.map((item, index) => (
                  <li key={`${entry.version}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(", "),
    ),
  ).filter((element) => element instanceof HTMLElement);
}
