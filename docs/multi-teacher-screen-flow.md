# Multi-Teacher Screen Flow

## Teacher flow

### 1. Home

- Show `Teacher Mode` and `Student Mode`
- `Teacher Mode` button requires Google sign-in

### 2. Google sign-in

- Redirect to Firebase Google sign-in
- On return, check whether `teachers/{uid}` exists

### 3. First-login onboarding

Fields:

- `school name`
- `teacher name`

Behavior:

- search for an existing school match while typing
- if matched, connect the teacher to that school
- if no match, create a new school row and connect it
- after save, enter Teacher Dashboard

### 4. Teacher dashboard

Top area:

- signed-in teacher name
- school name
- sign out

Set controls:

- `grade` selector
- `unit` input or selector
- `load set`
- `save set`
- `publish on/off`
- `delete set`

Vocabulary controls:

- add/edit/delete word
- Excel upload for the current teacher's school context
- sample data load

### 5. Publish behavior

- sets are saved as drafts by default
- teacher must explicitly turn on `published`
- when `published` is off, students cannot see the set

## Student flow

### 1. Home

- choose `Student Mode`
- do not require login

### 2. School selection

- school search input
- matched school list
- choose one school

### 3. Teacher selection

- list active teachers for that school
- show only public teacher name

### 4. Grade selection

- choose grade `3` to `6`

### 5. Unit selection

- list only units that are `published = true` for the chosen teacher and grade

### 6. Activity start

- load the selected set
- enable `Listening Quiz` and `Speaking Quiz`

## Recommended screen states

### Teacher states

- signed out
- signing in
- onboarding required
- dashboard ready
- saving
- publish updated
- remote error

### Student states

- school not selected
- school selected, teacher not selected
- teacher selected, grade not selected
- grade selected, no published units
- unit selected, set loaded
- remote error

## Recommended UI copy

### Teacher onboarding

- title: `선생님 정보 등록`
- description: `처음 한 번만 학교와 선생님 이름을 등록하면, 이후에는 내 단어세트만 관리할 수 있습니다.`

### Student school step

- title: `학교 선택`
- description: `우리 학교를 먼저 선택하세요.`

### Student teacher step

- title: `선생님 선택`
- description: `수업을 등록한 선생님을 고르세요.`

### Publish hint

- text: `공개를 켜야 학생들이 이 단원을 찾을 수 있습니다.`

## Open product decisions

1. Should a teacher be allowed to change school after onboarding?
2. Should students see all teachers in a school, or only teachers with at least one published set?
3. Should the student path allow direct search by teacher name as a shortcut?
4. Should publish be set per unit only, or also support whole-grade bulk publish?

## Suggested next implementation order

1. Add Google sign-in and teacher session state
2. Add teacher onboarding for school and teacher name
3. Replace current schema and RLS with owner-based tables
4. Add publish toggle to Teacher Mode
5. Replace current student entry with `school -> teacher -> grade -> unit`
6. Reconnect listening and speaking activities to the loaded published set
