## Matching Game Follow-up Plan

### Request
- Increase the correct-match fade-out animation to 3 seconds.
- Keep each matched pair fading independently so later clicks do not interrupt earlier fades.
- When opening the matching-game unit chooser, pre-check the currently loaded unit by default.

### Implementation
- Update the matching pair removal timeout to 3000ms in the game component.
- Update the matched-card CSS animation duration to 3000ms to stay aligned with the removal timeout.
- Seed the matching-game unit selection from the current student unit when the chooser opens and no matching units are already selected.

### Verification
- Run `npm run build`.
- Open the app in a local preview.
- Verify that a loaded unit appears checked by default in the matching chooser.
- Verify that multiple quick correct matches fade for 3 seconds independently.
