# Talking Vocab Quiz PRD

> **문서 상태:** 이 문서는 초기 MVP PRD입니다. 이후 인증·Firebase 저장·리더보드·빙고·다중 활동이 추가되어 현재 범위와 다를 수 있습니다. 현재 운영 기준은 [`docs/OPERATIONS.md`](OPERATIONS.md)를 따릅니다.

## 1. Product Summary

Talking Vocab Quiz is a classroom web app for elementary English lessons. Teachers create a vocabulary set for the day, and students practice through listening and speaking quiz flows powered by browser-native speech features.

## 2. Target Users

- Primary: Elementary English teachers for grades 3-6
- Secondary: Students participating in teacher-led or self-paced practice

## 3. User Needs

### Teachers need

- a simple interface for entering words
- a fast way to reuse today's list during class
- a classroom-friendly quiz flow with visible score tracking

### Students need

- clear audio pronunciation
- easy answer choices
- low-friction speaking practice with retry support
- immediate feedback that feels game-like rather than punitive

## 4. Must-Have Features

### A. Teacher mode

- Input form for vocabulary items
- Fields: word, meaning, optional image hint, optional example sentence
- Edit and delete controls
- Save and load from `localStorage`
- "Start quiz" action

### B. Listening quiz

- Read target word aloud with TTS
- Offer 4 answer choices
- Show correct or incorrect feedback immediately
- Support replaying audio
- Advance to next question

### C. Speaking practice

- Show target word prominently
- Start microphone capture through Web Speech API
- Compare recognized text to expected answer
- Allow retry if recognition is empty or low-confidence
- Show recognized result to teacher or student

### D. Progress and scoring

- Current score
- Question count
- Progress indicator
- Final results summary

### E. Compatibility and accessibility

- Browser support notice
- Keyboard-accessible controls where possible
- Text + icon + audio feedback combination
- Responsive layout for tablets and laptops

## 5. Nice-to-Have Features

- Randomized question order
- Optional image cards for younger learners
- Simple praise animations
- Export and import vocabulary sets
- Example sentence playback

## 6. Non-Goals

- Authentication
- Server-side database
- Paid AI speech services
- Multi-class roster management
- Long-term student analytics

## 7. Functional Requirements

### Vocabulary data model

Each item should support:

```json
{
  "id": "uuid-or-timestamp",
  "word": "apple",
  "meaning": "사과",
  "imageHint": "",
  "exampleSentence": "I eat an apple.",
  "createdAt": "2026-03-10T00:00:00.000Z"
}
```

### Listening quiz behavior

- The system selects a target vocabulary item.
- The system reads the word aloud on question start.
- The system generates 4 answer options including the correct meaning.
- The student selects one option.
- The system records correctness and updates score.

### Speaking quiz behavior

- The system displays the target word.
- The student taps a record button.
- The browser requests microphone permission if needed.
- The system captures recognized speech.
- The system normalizes case and whitespace before comparison.
- The system returns pass, retry, or incorrect result.

## 8. Quality Requirements

- Fast initial load on a normal school network
- No required backend for MVP
- Graceful fallback message when STT is unavailable
- Stable state restoration after refresh through `localStorage`

## 9. Acceptance Criteria

### Teacher mode

- A teacher can add at least 10 words in one session.
- A saved set remains available after page refresh.
- A teacher can edit and delete existing entries.

### Listening quiz

- When the quiz starts, the app can read the current word aloud.
- The student can replay the word audio at least once per question.
- The app shows whether the selected choice is correct.

### Speaking quiz

- The app can request microphone access.
- The app shows the recognized text.
- The app determines whether the recognized word matches the target word.
- When recognition is not supported, the app displays a clear notice instead of breaking.

### UI

- Core actions remain usable at `360px` width and above.
- Buttons are visually large enough for touch interaction.

## 10. Proposed Build Order

1. App shell and routing between modes
2. Teacher mode CRUD and persistence
3. Listening quiz with score state
4. Speaking quiz with STT integration
5. Results summary and retry loop
6. Responsive and accessibility polish

## 11. Suggested Stack

- `Vite`
- `React`
- Plain CSS or CSS Modules
- Browser-native Web Speech API

This stack keeps the app lightweight and easy to deploy on static hosting.
