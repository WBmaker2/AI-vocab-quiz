# Firebase Architecture Plan

## Goal

Use Firebase as the shared backend while keeping the product behavior:

- teachers sign in with Google
- first-time teachers register school name and teacher name, then wait for
  project-admin approval
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
- approval source of truth: new profiles use `isActive: false`, and only a
  trusted Firebase Console/Admin SDK operation may activate them

Teacher self-service updates cannot change `isActive`, `schoolId`, or
`schoolName`.

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

Writes require an active owner teacher whose bound `schoolId` and
`schoolName` match the set. Existing documents cannot move to another owner
or school.

### `studentProfiles`

Document id:

- `schoolId + grade + normalized student name + device-private capability token`

Document fields include the student scope, immutable `profileToken`, per-activity best
records, earned badges, and timestamps.

Purpose:

- save a student's personal growth history only on the browser that created the
  device-private capability token
- prevent name-only predictable profile reads and writes

The capability token is a random 32-character hexadecimal value stored only in
that browser's local storage. It is never rendered or logged. A browser without
the token does not fetch an existing personal profile; saving there creates a
new device-private profile instead. Consequently, existing personal growth
history starts fresh once on the updated device-private model. Public leaderboard
history remains shared and is not reset by this migration.

### Leaderboard score bounds

Student leaderboard writes are checked both in the client and Firestore rules:

- Matching: 1-100 solved pairs, 0-7200 whole elapsed seconds, and score no
  greater than `solvedPairs * 100`.
- Fishing: non-negative whole result counts totaling 1-10, and score no greater
  than `correctCount * 140`.
- Typing: 1-500 questions, internally consistent whole-number counts and rounded
  accuracy, 0-86400 whole elapsed seconds, and score no greater than
  `correctCount * 140`.

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
- Independent request generations prevent older school, teacher, unit, or set
  responses from overwriting a newer student selection.

## Spreadsheet import

- Browser import supports `.xlsx` only.
- Maximum file size: 5 MiB.
- Maximum data rows: 5,000.
- The complete workbook is parsed and validated before any remote write.
- Publisher metadata and all imported units are committed through one
  Firestore batch, capped at 500 operations.
- Teacher saves and destructive mutations share one serialized coordinator, so
  an older autosave cannot overwrite a later import or revive a deleted set.

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

1. A teacher can sign in with Google and create a pending teacher profile.
2. Only an approved active teacher can save and publish sets bound to their
   school identity.
3. A student can search a school, choose a teacher, grade, and unit.
4. A student can load only published sets.
5. The app still works when Firebase config is missing by showing guidance instead of crashing.
