# Single Teacher Auto Select Plan

## Goal

When a student selects a school, automatically choose the teacher only if that school has exactly one registered teacher.

## Scope

- Keep the current school search and teacher dropdown UI.
- Auto-select the teacher when the school returns exactly one teacher.
- Keep manual teacher selection unchanged when the school has two or more teachers.
- Load the selected teacher's published units immediately so the student can continue without an extra click.

## Verification

- Confirm a school with one teacher auto-selects that teacher after the school button is clicked.
- Confirm the grade/unit flow remains enabled and published units load right away.
- Confirm a school with multiple teachers still requires manual selection.
