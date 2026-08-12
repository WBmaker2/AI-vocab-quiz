# Task 6 Implementation Plan

## Scope

Connect the reviewed `WordSpellingGame` to the student home without changing its game logic, Firebase behavior, or CSS.

## Steps

1. Add the spelling screen contract to `appChrome.test.js` so it remains a compact app view.
2. Add the lazy spelling import and `APP_VIEWS.SPELLING` route in `App.jsx`, then pass the reviewed props and home back navigation.
3. Add `onOpenSpelling` to `ModeSelector` and place its disabled ghost button between fishing and typing.
4. Run the focused app chrome test and production build.
5. Self-review the diff, write the Task 6 report, and commit only the requested implementation files plus report.

## Verification

- `node --test src/utils/appChrome.test.js`
- `npm run build`
- Confirm the student game order is matching, fishing, spelling, typing, bingo and existing compact chrome remains unchanged for other views.
