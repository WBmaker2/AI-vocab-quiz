# Word Matching Game Plan

## Goal

- Add a new student activity called `단어 짝 맞추기`.
- Let students choose one or more published units from the selected teacher and grade before starting.
- Run a continuous matching game with 5 visible pairs at a time, TTS on English cards, a stopwatch, and a final score screen.

## Flow

1. Keep the current student flow: school -> teacher -> grade.
2. Show a new `단어 짝 맞추기` button next to `단어 세트 불러오기`.
3. When the button is pressed, reveal a checkbox panel for the published units of the selected grade.
4. Load all published words from the checked units and open the new matching-game screen.

## Game Rules

- Start with 5 visible Korean cards and 5 visible English cards.
- Students select one Korean card and one English card to make a pair.
- If the pair is correct, remove it and replace both slots with the next unseen pair when available.
- If fewer than 5 pairs remain, the visible card count naturally shrinks toward the end.
- Clicking an English card reads the word aloud with TTS.
- Keep a running stopwatch from the start of the game until the last pair is matched.

## Results

- Show total solved pairs.
- Show elapsed time in stopwatch format.
- Show a final score based on solved pair count and elapsed time.

## Acceptance Checks

- Students can select multiple units from the same grade and teacher for the game.
- The matching game only starts when at least one selected unit contains published words.
- English card clicks trigger TTS playback.
- The board keeps refilling until all pairs are solved.
- The result screen shows solved count, elapsed time, and final score.
- `npm run build` passes after the change.
