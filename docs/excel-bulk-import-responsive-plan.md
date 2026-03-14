# Excel Bulk Import And Responsive Update Plan

## Goal

- Make `엑셀 가져오기` save every lesson in the selected grade without requiring an extra `현재 단원 저장`.
- Apply the current `학생 공개` checkbox value to every lesson saved by the Excel import.
- Prevent the main title from wrapping awkwardly.
- Improve the home and teacher layouts for desktop, portrait phones, and landscape tablets.

## Current Issues

- The Excel import loop already saves multiple lessons, but it preserves each lesson's previous `published` value instead of using the current checkbox state.
- The teacher UI copy still reads like the teacher must save the current unit separately.
- The hero title can wrap into two lines in a visually awkward place.
- Responsive rules only collapse at a single breakpoint and leave the hero and form layouts too loose on narrow screens.

## Implementation

### Data Flow

- Update `useVocabularyLibrary.importWorkbook()` so every imported lesson uses the current `teacherPublished` value.
- Keep the teacher's current `published` state after import instead of resetting it from previous catalog data.
- Update success copy so it clearly states that all imported lessons were saved and whether they were published.

### Teacher UI

- Update the Excel section help text to explain that all lessons in the selected grade are saved at once.
- Clarify that the `학생 공개` checkbox applies to both the current unit save and Excel bulk save.

### Layout

- Adjust the hero title typography so it stays on one line with a smaller, more adaptive clamp.
- Add tablet and phone breakpoints for hero padding, card spacing, section headings, grids, and action rows.
- Make stacked buttons and form fields fit cleanly on narrow screens without horizontal pressure.

## Verification

- `npm run build`
- Confirm Excel import code path saves every parsed lesson with the same `published` value.
- Confirm title stays on one line at common mobile widths.
- Confirm home and teacher screens remain readable in phone portrait and tablet landscape widths.
