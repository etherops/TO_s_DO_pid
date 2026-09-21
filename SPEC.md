# TO_s_DO_pid Product Specification

This file records the current product contracts that are easy to regress during maintenance. The detailed Focus Mode layout and routing rules are in [`docs/focus-mode-spec.md`](docs/focus-mode-spec.md).

## Shared visual system

All modes use the same visual language defined in `src/styles/design-system.css`:

- slate text and neutral surfaces establish hierarchy without mode-specific gray palettes;
- orange marks action and in-progress work;
- blue marks navigation, scheduling, and current/upcoming work;
- green marks completed work;
- cards use the same surface, border, radius, and shadow vocabulary across the board, Focus, and Review;
- mode-specific layouts may differ, but controls, status indicators, date badges, and spacing should reuse these tokens.

The shared board styling preserves state-specific presentation. Partial-collapse fans, summary cards, due-state cards, selected cards, low-priority cards, on-ice sections, raw text, and drag/sort animations retain their specialized styling and take precedence over the ordinary task surface.

## Markdown task model

### Subtasks

Indented `- [status] text` lines following a task belong to that parent. Plain indented `- text` is
also supported as an unstarted subtask; unchanged lines retain their original syntax. New or edited
subtasks use `  - [status] text`. Indented `*`, `+`, and other content are preserved verbatim, not
interpreted as tasks. Attached content moves with the parent.

Subtasks are managed in the parent's full task editor (Plan/Triage and Focus), with add, text, due-date,
status, and remove controls. Save commits the draft; Cancel discards it. A compact subtask-count badge
on the parent indicates subtasks and opens its editor. Dated children of SELECTED/WIP tasks also appear
in Focus NOW or IN PROGRESS / PARKED when normal date/status rules place them there, labeled with their
parent. Day-dated children also appear on their assigned day in Week at a Glance; other children stay
editor-only, not in Up Next. Children remain nested in
storage and never automatically change their parent's status. Subtask `-` is
a nesting marker, not a low-priority designation.
Subtask notes have no visual fields or tooltips. Hidden notes and unsupported source content survive
parse/render and title/date changes; the child title field omits notes and lifecycle suffixes.
Only initiatives accept new subtasks. Existing children under other tasks remain editable and preserved.
Focus offers Convert to subtask with a searchable initiative picker and Detach from the subtask editor.
The initiative editor always shows a trailing empty row instead of an Add button. Typing fills that row and reveals
the next empty row; Enter advances to the next row. Unused new blank rows
are excluded from sorting. Drag handles reorder subtasks within their parent; focused handles also support
Up/Down keys. Sorting is part of the editor draft and preserves non-subtask content in its original slots. Blank rows
are not saved. A parent cannot be toggled to completed until every subtask is `x`; raw preserved content
does not affect this check. Empty note fields stay one line and expand when they contain text.

### Parent tasks

- `* [ ]` and `* [~]` are normal queued and in-progress tasks.
- `* [x]` is completed; `* [-]` is explicitly will-not-do.
- `- [status]` is the low-priority equivalent of the same status.
- `+ [status]` marks a high-priority task or initiative. Priority controls cycle normal (`*`), low (`-`),
  high (`+`), then normal. Status, dates, notes, and source section do not change. High tasks display HIGH
  on the board; they keep normal-sized cards. Parsing and saving preserve all three Markdown list markers.
- A nonterminal task has one trailing due marker: `! Aug 13 2026`, `! Aug Week #2 2026`, or `! Aug 2026`.
- A terminal task has one exact completion marker: `| Aug 13 2026`.
- Status clicks normally cycle queued → completed → in progress → will-not-do → queued. A sequence starting
  from settled in-progress instead cycles in progress → completed → will-not-do → queued → in progress.
  Focus and the board retain that starting state during rapid clicks, resetting after 1.5 seconds without a click.

## Archive behavior (triage/plan board)

Archiving is a terminal-task operation on an archivable WIP section. It must:

1. Identify only task cards whose status is completed (`x`) or will-not-do (`-`).
2. Create or reuse a small archive section in the chosen DONE/ARCHIVE column.
3. Name that section for the current Sunday–Saturday week using the canonical due-week format, for example `Aug Week #2 2026`.
4. Move the terminal cards into that archive section.
5. Leave the source section and every unfinished card (` ` or `~`) in place.
6. Never create a `Leftovers from ...` section and never move the entire source section.

If the source section has no completed or will-not-do cards, archiving makes no task movement. The confirmation UI should say that there is nothing to archive.

The archive destination remains selectable when more than one DONE/ARCHIVE file column exists. If no DONE column exists, the app may create/use `ARCHIVE` as the DONE destination.

## Review mode (calendar retrospective)

Review is a read-only, full-screen calendar of what actually happened. It reads
every column in the file, including ARCHIVE, and never mutates tasks.

1. Each task is placed on the calendar by its authoritative date: the completion
   marker (`| Aug 13 2026`) for terminal tasks, the due marker for open ones.
2. The grid is one calendar month, padded out to whole Sunday–Saturday weeks.
   Padding days render their work but are excluded from every total.
3. Above the grid sits a January–December stacked bar chart of the calendar year,
   spanning exactly the grid's width. Clicking a bar moves the grid to that month
   and highlights the bar; the chart follows the grid, and its own arrows move it
   a year at a time. Month bars bucket by month, which can hold week and month due
   periods honestly: a month period goes to its month and a week period to the
   month holding four of its days.
4. Week and month due periods have no honest single-day slot, so they are counted
   in the totals but not dropped onto a day of the grid.
5. Tasks with no authoritative date are collected, not discarded.
6. Overdue counts mean "past due and still open as of today", independent of the
   period being viewed.

## Verification expectations

Changes must preserve the existing Vue/Vite architecture, plain-markdown persistence, undo/history behavior, and the 100% unit-test requirement documented in `CLAUDE.md`.
