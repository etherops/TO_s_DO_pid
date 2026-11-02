# TO_s_DO_pid Product Specification

This file records the current product contracts that are easy to regress during maintenance. The detailed Focus Mode layout and routing rules are in [`docs/focus-mode-spec.md`](docs/focus-mode-spec.md).

## Plan outline workspace and Raw source

The navigation is Plan, Focus, Calendar, Raw. Plan replaces both the old Triage and Plan modes; legacy
normal/triage preferences resolve to Plan. Clicking the active tab does not exit into an unnamed mode.
There is no legacy Board layout switch. Plan opens SELECTED and WIP category groups side by side;
the workspace starts directly beneath the app toolbar without a repeated Plan heading or subtitle row.
The sidebar has no visible File Outline heading; its navigation landmark retains the accessible name File outline.
Each group retains all of its actual Markdown H1 headings and sections in source order. The file outline
defaults to the backlog overview or first available heading if SELECTED/WIP are absent, without creating them. It
also exposes TODO, PROJECTS, archive and other headings, with task counts on both headings and sections.
Counts follow existing board semantics: parent task rows, all statuses, not additional subtask counts.
The Todo + Projects overview serves backlog triage inside Plan, not as a separate application mode.
An always-visible Archive shortcut in the outline and View archive beside the week previews open all
archive headings with task rows expanded. Clicking an archived section in the outline reveals and expands
that section. Archive navigation never writes task data or creates headings; missing archives show an empty state.

Existing task/section editors, sorting, drag/drop, multi-selection, context menus and archive confirmation
remain in use. Ordinary task cards remain compact single-line rows. Navigation never saves, creates,
reorders or migrates data. No section-level due-date inheritance or Focus routing changes are introduced.
The schedule sidebar summarizes open explicitly dated tasks and subtasks in all live non-archive/non-ice
headings. It is not a second copy of the data or the Focus routing model; clicking an entry reveals its
source section. Closed parents and their children, raw lines and undated items are excluded.

Inside the first visible WIP column, below its column header, compact expandable archive-week sections
sit above and at the same visual level as the regular sections. They combine terminal parent tasks
across WIP source headings/sections and appear only once, not above the column or in a separate panel.
Preview sections stay outside the source-section drag list so navigation never reorders Markdown.
Batches use completion dates, not due dates, and the exact archive
section names. Original task rows remain in their source sections until archived. Every week requires
confirmation, showing the destination, task count, and whether a section will be created or reused.
ARCHIVE is created only on confirmation if none exists. Repeated confirmation is ignored.
Undated terminal tasks are visibly assigned to the
current week. Each action moves only that week's terminal parents, with all children/metadata intact;
existing same-named archive sections are reused, ignoring case and extra whitespace. Legacy yearless
headings are reused only when their dated contents identify the exact target week/year. Existing duplicate
sections are reported in the confirmation, not silently merged or deleted. Other weeks, unfinished tasks
and source sections stay put.

Raw reads the exact source from disk, not parser-rendered output. It starts read-only on every entry/file
change. Edit enables a draft; only explicit Save (or Cmd/Ctrl+S while editing) writes it. Cancel/navigation
with a changed draft asks before discarding; closing/reloading the browser uses its unsaved-change warning.
Saving preserves source characters and unsupported syntax without parse/render normalization, uses the
existing backup endpoint, and rejects a stale expected source with HTTP 409 before writing. Failed saves
retain the draft. Empty-file saves are disabled. Successful saves reload the normal app model and reset
board undo history; Raw editing uses textarea undo, not the board's parser-based undo stack.

## Board task sorting

Plan/Triage section sorting and automatic sorting after parent-status changes or column moves use this order:
completed, will-not-do, active (in-progress or blocked), then unstarted. An unstarted parent with at least one
subtask in progress, blocked, done, or will-not-do sorts with active tasks, for both normal tasks and initiatives.
Explicit parent statuses take precedence. All-unstarted children and unsupported raw child lines do not imply progress.
Even if every child is terminal, the parent stays in the active sort group until explicitly completed or cancelled.
Equal-ranked tasks retain their relative order. Sorting moves the whole parent with its children, without changing
statuses, priorities, notes, dates, or child order. Focus routing and its status-order rules are unchanged.

## Blocked status

`[!]` is an unfinished Blocked status for tasks and minus-prefixed subtasks. Parse/render preserves it,
including existing notes, priorities and due dates. It never counts as Done or Will not do and is not archived.
The status control keeps the ordinary checkbox outline and pale red fill, with a small red octagon inside;
the whole checkbox must not become an octagon. Headers and collapsed summaries count Blocked separately.
At widths of 1400px or less, a header with blocked counts shows status icons and counts without text labels,
retaining the descriptive tooltips so the fifth status does not overlap the file selector or toolbar.
Calendar treats it as open scheduled work with a red status marker. Parent progress grids include blocked children
as red cells; a blocked parent's own checkbox shows the blocked symbol instead of the grid.
The standard cycle is empty → done → in progress → blocked → will not do → empty.
Starting on settled in-progress uses in progress → done → blocked → will not do → empty → in progress.
Rapid clicks retain the starting cycle for 1.5 seconds across board, Focus and nested subtask editors.
Focus placement follows the Blocked rules in `docs/focus-mode-spec.md`.

## Shared visual system

All modes use the same visual language defined in `src/styles/design-system.css`:

- slate text and neutral surfaces establish hierarchy without mode-specific gray palettes;
- orange marks action and in-progress work;
- blue marks navigation, scheduling, and current/upcoming work;
- green marks completed work;
- cards use the same surface, border, radius, and shadow vocabulary across the board, Focus, and Calendar;
- mode-specific layouts may differ, but controls, status indicators, date badges, and spacing should reuse these tokens.

The shared board styling preserves state-specific presentation. Partial-collapse fans, summary cards, due-state cards, selected cards, low-priority cards, on-ice sections, raw text, and drag/sort animations retain their specialized styling and take precedence over the ordinary task surface.

## Markdown task model

### Subtasks

Right-clicking a child in either nested editor or on a Focus card offers confirmed Delete subtask.
It saves immediately, preserving the parent, other children, unsupported lines, and unsaved parent fields.

Indented `- [status] text` lines following a task belong to that parent. Plain indented `- text` is
also supported as an unstarted subtask; unchanged lines retain their original syntax. New or edited
subtasks use `  - [status] text`. Indented `*`, `+`, and other content are preserved verbatim, not
interpreted as tasks. Attached content moves with the parent.

Subtasks are managed in the parent's full task editor (Plan/Triage and Focus), with add, text, due-date,
status, and remove controls. Subtask titles and additions save on blur or Enter. Status (including lifecycle dates),
due dates, removal and ordering save immediately. Parent Save/Cancel affects only parent fields and does not undo
saved subtask edits. Empty placeholder rows are never saved; hidden notes and raw attached content are preserved.
Completed and will-not-do children show a labeled completion-date badge in the editor instead of the due-date control.
The badge opens an exact-day picker with Today, Yesterday, custom day and Clear; changes save immediately
without changing the child status, hidden notes, or unsaved parent fields in either Focus or Plan/Triage.
If a legacy terminal child has no recorded date, the badge explicitly says "no date".
A compact subtask-count badge on the parent reads "N subtasks" and opens the editor; its tooltip and accessible label describe the counts.
The parent's status symbol itself becomes a seamless fixed 4×4 grid inside a neutral border, filled proportionally in this order:
very light gray unstarted with centered gray dots at the top, gray will-not-do, yellow in progress, green done at the bottom. Pixels have no gaps or outlines. The status control retains its
existing click behavior; the visualization does not change the stored parent status.
Dated children of SELECTED/WIP tasks also appear
in Focus NOW or IN PROGRESS / PARKED when normal date/status rules place them there, labeled with their
parent. Day-dated children also appear on their assigned day in Week at a Glance; other children stay
editor-only, not in Up Next. Children remain nested in
storage and never automatically change their parent's status. Subtask `-` is
a nesting marker, not a low-priority designation.
Subtask notes have no visual fields or tooltips. Hidden notes and unsupported source content survive
parse/render and title/date changes; the child title field omits notes and lifecycle suffixes.
Initiatives and normal `*` tasks accept new subtasks. Existing children under low-priority tasks remain editable and preserved.
Normal tasks without children retain their note-first editor with a small "Add subtasks" action instead of an empty
subtask pane. Initiatives and tasks with existing subtasks display the subtask editor directly.
Changing between initiative and normal priority keeps children attached. Moving a normal parent to low priority
opens a themed in-app modal. It shows the parent title, subtask count, read-only cards with statuses and dates,
Cancel and "Detach subtasks & make low".
Cancel is focused initially; Escape or backdrop click cancels.
Cancel changes nothing;
confirm detaches all subtasks as normal-priority tasks immediately after the parent in its original section,
preserving their order, statuses, notes, and dates. Unsupported attached content stays with the parent.
Focus offers Convert to subtask with initiatives presented first and a "Choose a regular task" option.
The regular-task view lists open, editable normal tasks across columns in a compact scrollable list filtered by title.
Closed tasks, low-priority tasks, subtasks, and the source task are excluded. Parents with children cannot be converted.
Detach remains available from the subtask editor.
The parent editor always shows a trailing empty row instead of an Add button. Typing fills that row and reveals
the next empty row; Enter advances to the next row. Unused new blank rows
are excluded from sorting. Drag handles reorder subtasks within their parent; focused handles also support
Up/Down keys. Sorting is part of the editor draft and preserves non-subtask content in its original slots. Blank rows
are not saved. Parent status is manually controlled: a parent can be completed regardless of subtask statuses.
Completing a parent records its completion date without changing its children or their dates.
Empty note fields stay one line and expand when they contain text.

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
2. Group terminal cards by their recorded completion dates and create or reuse small sections in the chosen DONE/ARCHIVE column.
3. Name each section for its completion Sunday–Saturday week using the canonical due-week format, for example `Aug Week #2 2026`. Tasks completed last week go into last week's section even when archived this week.
4. Move each terminal card into its completion-week section, keeping its children and metadata intact. Missing or invalid completion dates fall back to the week the dialog opened without inventing or changing stored dates. The confirmation lists each destination week and count, and explicitly identifies this fallback.
5. Offer a checkbox for each completion week. Default to only closed Sunday–Saturday weeks (week start before the current Sunday). Current/future weeks, including undated fallback tasks, start unchecked but can be selected explicitly. Counts and preview reflect only selected weeks; disable confirmation when none are selected. Move only selected weeks and leave every other card and the source section in place.
6. Never create a `Leftovers from ...` section and never move the entire source section.

If the source section has no completed or will-not-do cards, archiving makes no task movement. The confirmation UI should say that there is nothing to archive.

The archive destination remains selectable when more than one DONE/ARCHIVE file column exists. If no DONE column exists, the app may create/use `ARCHIVE` as the DONE destination.

## Calendar mode

Calendar (formerly Review) is a read-only, full-screen calendar of scheduled and completed work. It reads
every column in the file, including ARCHIVE, and never mutates tasks.
The persisted `review` view key remains compatible; the visible tab and tooltip say Calendar.

1. Each task is placed on the calendar by its authoritative date: the completion
   marker (`| Aug 13 2026`) for terminal tasks, the due marker for open ones.
2. The grid is one calendar month, padded out to whole Sunday–Saturday weeks.
   Padding days render their work but are excluded from every total.
   Each day shows compact task titles and status markers below its date and counts. Busy days scroll
   inside their own bounded list without growing the week row; the date and counts remain visible.
   Full titles are available on hover, and day selection still opens the existing detail pane.
   Lists are keyboard-scrollable and remain read-only. Open work appears first, then completed and
   will-not-do tasks, retaining source order within each group.
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
