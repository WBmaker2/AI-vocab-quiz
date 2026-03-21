# Popular School Picker Plan

## Goal

Show the five most-used schools by default on the student school selection screen, while keeping search available for every other school.

## Behavior

- Display the top five schools as quick-pick buttons when the student screen opens.
- Replace those quick-pick buttons with search results after the student runs a search.
- Return to the quick-pick list when the search field is cleared.
- Keep the current visual style and selection flow unchanged.

## Data

- Derive usage from published vocabulary sets so the quick-pick list reflects the schools students can actually use right now.
- Keep school records in sync when teacher profiles are created or moved to a different school.
- Sort the featured list by published-set count descending, then by school name.

## Verification

- Confirm the student screen shows five clickable schools by default.
- Confirm a school search hides the featured list and shows search results in the same area.
- Confirm clearing the search field resets the school/teacher/unit selection and returns to the featured list.
- Confirm teacher profile edits still update school suggestions and published-set metadata.
