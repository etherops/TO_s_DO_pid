# Paper ownership and scheduled views

## Contract

Markdown remains the source of truth. Reading, navigation, date rollovers and external file reloads
never reorganize it. The application changes placement only in response to an explicit edit.

| Item | Paper placement after assigning a date | After clearing its date |
| --- | --- | --- |
| Normal `*` / low `-` top-level task | Directly under `# WIP` | Directly under `# SELECTED` |
| Project `+` | Remains in, or moves to, `# SELECTED` | Remains in SELECTED |
| Subtask | Remains nested under its parent | Remains nested under its parent |

Dates independently project open items into Plan's Scheduled groups and the matching Focus window,
regardless of their source column. Archive and frozen/ICE content are excluded. A dated project can
still appear as a deadline in those views, but this does not relocate it from SELECTED.
Every expanded project shows all its subtasks; scheduled child appearances reference the same objects,
not copies. A child never inherits its parent's date, and clearing its date removes its independent
scheduled appearance without removing it from the project. Child status is independent of parent status.

The Projects pane is a view of `+` tasks, not a paper column type. Legacy `# PROJECTS` is read as a
SELECTED-category column until explicitly migrated. New edits never create a Projects column.
In Plan, SELECTED displays and counts only individual tasks; `+` parents appear in PROJECTS instead,
not both panes. Normal tasks with children remain individual tasks. This display split does not change
Markdown ownership or detach children.

## Implementation boundaries

`TodoMdParser` represents H1-direct tasks with an internal headerless section (`headerStyle: NONE`).
This reuses the existing section-based editors without writing an invented Markdown heading.
`taskWorkflow` handles explicit-edit placement at the shared persistence boundary, covering inline
text, pickers, additions and drag scheduling. Plan's direct scheduling action uses the same placement
helper. Completed/cancelled lifecycle stamps do not count as clearing a due date. Undo/redo bypass
placement so restoration remains exact.

```text
Markdown ownership → task and child objects → Plan / Focus date projections
                             ↑
                 edit date → placement rule → save
```

This deliberately favors a small shared rule over separate Plan/Focus movement implementations.
Section/date disagreement introduced by paper editing is allowed; dates control projections without
silently rewriting paper organization.

## Explicit migration

Move active-column `+` tasks into SELECTED with their complete subtrees. Retire `# PROJECTS`, preserving
remaining tasks/notes. Flatten WIP's H2/H3 groups into H1-direct items in source order. Keep archives,
backlog sections, task text, statuses, dates, child order and unsupported nested content intact.
Compare full task-subtree signatures before/after, not just task counts, and require idempotence.

`scripts/migrate-paper-workflow.cjs <absolute-file-path>` dry-runs the migration; `--apply` opts into writing.
Before writing, create and verify a unique `.filename.before-paper-workflow-UUID.bak` recovery copy beside
the source using the running app's existing API. Require `expectedContent` to match the live file.
A stale precondition or failed backup aborts the write. Private file contents are never printed.
Do not automatically migrate other files on load.

## Recommendation: H1 and H2

Use H1 for columns and H2 for optional sections. Tasks can sit directly under either. A project is a
`+` task, not a heading. This makes the paper hierarchy simpler and removes the old visual-size and
archive-eligibility distinction between H2/H3.

Keep H3 parsing and rendering for legacy files and archives. A global H3-to-H2 rewrite is a separate
user decision, not part of this migration. Revisit heading-generation defaults and H2 archive controls
when that choice is approved; don't make existing history unreadable in the meantime.
