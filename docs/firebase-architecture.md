# Firebase Architecture Plan

## Goal

Use Firebase as the shared backend while keeping the product behavior:

- teachers sign in with Google
- first-time teachers register school name and teacher name
- each teacher owns only their own vocabulary sets
- students enter through `school -> teacher -> grade -> unit`
- students can read only published sets

## Firebase services

- Firebase Authentication
  - Google sign-in for teachers
- Cloud Firestore
  - schools
  - teachers
  - vocabulary sets

## Why Firestore document shape is simplified

The app loads an entire unit at once for listening and speaking activities.
That makes it reasonable to store the word list directly inside the set document.

This avoids:

- extra subcollection reads for every activity
- more complex rules around parent-child documents
- more index requirements for a small classroom-scale dataset

## Collections

### `schools`

Document fields:

- `name`
- `normalizedName`
- `createdAt`

Purpose:

- school search source for students
- school reference for teacher onboarding

### `teachers`

Document id:

- teacher Firebase Auth `uid`

Document fields:

- `teacherName`
- `schoolId`
- `schoolName`
- `isActive`
- `createdAt`
- `updatedAt`

Purpose:

- public teacher selection for students
- owner profile for teacher dashboard

### `vocabularySets`

Document id:

- deterministic key from `ownerUid + grade + unit`

Document fields:

- `ownerUid`
- `schoolId`
- `schoolName`
- `teacherName`
- `grade`
- `unit`
- `published`
- `sourceType`
- `items`
- `createdAt`
- `updatedAt`

### `items` array shape

Each item inside `vocabularySets.items`:

- `id`
- `order`
- `word`
- `meaning`
- `imageHint`
- `exampleSentence`
- `createdAt`

## Query strategy

### Teacher

- Auth state from Firebase Auth
- Teacher profile from `teachers/{uid}`
- Teacher set catalog from Firestore query `where("ownerUid", "==", uid)`
- Teacher set detail from deterministic document id

### Student

- School search from `schools` using prefix query on `normalizedName`
- Teacher list from `teachers` filtered by `schoolId`
- Unit list from `vocabularySets` filtered by `ownerUid` and then reduced client-side to published units for the selected grade
- Set detail from deterministic document id, then check `published === true`

## Tradeoffs

### Pros

- no paid Supabase requirement
- natural Google sign-in support
- simpler deployment story for a browser-only app
- simpler set loading because one unit is one document

### Constraints

- school search should be prefix-oriented, not full text search
- Firestore document size is limited to 1 MiB, so unit word lists should stay modest
- teacher list is per school, not full text teacher search by default

## Acceptance checks

1. A teacher can sign in with Google and create a teacher profile.
2. A teacher can save and publish only their own sets.
3. A student can search a school, choose a teacher, grade, and unit.
4. A student can load only published sets.
5. The app still works when Firebase config is missing by showing guidance instead of crashing.
