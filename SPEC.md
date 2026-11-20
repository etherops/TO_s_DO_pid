# TO_s_DO_pid Product Specification

This file records the current product contracts that are easy to regress during maintenance. The detailed Focus Mode layout and routing rules are in [`docs/focus-mode-spec.md`](docs/focus-mode-spec.md).

Paper placement and date projections follow [`docs/paper-workflow.md`](docs/paper-workflow.md).
Tasks may live directly under H1. Projects are `+` tasks in SELECTED, not a separate column type.

## Plan outline workspace and Raw source

The navigation is Plan, Focus, Calendar, Raw. Focus is the weekly execution view documented in
`docs/focus-mode-spec.md`; saved Focus2 preferences migrate to Focus. Archive opens in a right-side drawer within Plan. Plan replaces both the old Triage and Plan modes; legacy
normal/triage preferences resolve to Plan. Clicking the active tab does not exit into an unnamed mode.
There is no legacy Board layout switch. The main workspace shows PROJECTS, TASKS and three SCHEDULED columns left to right.
A shared SELECTED heading spans PROJECTS and TASKS; SCHEDULED has its own peer heading across all three schedule columns,
with the combined total and Add/Archive controls alongside it. Each schedule column has a compact period header and count.
TASKS is the display name of the SELECTED source pane;
the Markdown heading, task ownership and mutation targets remain unchanged. TASKS shows individual tasks only,
excluding plus-marked projects already indexed in PROJECTS. Normal tasks with children remain individual tasks.
There is no vertical SELECTED/PROJECTS divider or separate future-schedule sidebar.

The entire backlog, including its ToC and editable source cards, lives in one left slide-out drawer.
The closed drawer leaves 44px peeking out with an integrated edge grip and vertical BACKLOG label,
not a separate tab; its contents are inert. Main-column stacking is isolated so raised cards stay behind the drawer.
Hover, focus or click opens the drawer over the main columns without resizing them. It is up to 840px wide,
capped to the viewport. The ToC and cards scroll independently. Choosing a ToC entry scrolls the backlog cards
without closing the drawer or hiding other source sections. The drawer stays open during editing and dragging;
Close or Escape retracts it, returning focus to the grip when needed. Reduced-motion disables the animation.
The Backlog heading spans its ToC and source cards. +Add and Archive remain together above Scheduled.

PROJECTS and TASKS retain their existing editors, counts and paper ownership.
Low-priority tasks appear under a separate LOW PRIO heading at the bottom of each source section and scheduled
date/completion group. Rendering does not rewrite paper order; explicit source dragging writes a complete list,
preserving hidden projects and raw metadata. Subtask bullet markers do not make subtasks low-priority.
Each Scheduled column has one PROJECTS group at its top, collecting its open plus-marked parents across dates.
Projects retain date labels and appear only once in that column, never again under its date headers.
Individual tasks and surfaced subtasks stay grouped by date below, with LOW PRIO last within each date.
Completed items retain their completion-day groups. This display-only grouping does not detach children,
change column totals or rewrite the file.
Compact source headers keep actions inline, truncate long section labels with a title tooltip, and retain
section collapse controls. Each main column scrolls independently.
SCHEDULED uses three independently scrolling columns in the existing editable card layout:
This week (archive-ready weeks, Overdue, Today and Rest of this week), Rest of this month, and After.
Only one schedule column is active at a time, initially This week. Clicking a column or activating its header
widens it; the other two stay narrower with dimmed contents. Their existing groups and cards remain visible
and usable. Schedule cards use clock-only date-picker buttons with the full date on hover; Projects and Tasks
retain their date labels. Switching the active column never changes task data.
The three schedule panes join edge-to-edge with shared dividers and rounded corners only on the outside.
Their headers stay at a single fixed height; long labels ellipsize instead of wrapping, and counts remain visible.
Column widths ease between states while dimming and background colors fade; reduced-motion preferences disable transitions.
Inactive columns are readable compact previews: narrower, smaller single-line ellipsized titles, tighter padding,
and no drag handles, date/action buttons, parent links or subtask counts. A first click only activates the column
and restores its controls; it must not also edit a task or change its status. The active column retains the larger share of width.
Current-week assignments stay in the first column even when the week crosses into the next month;
month-only commitments keep their own month precision. Week-only assignments lead the remaining-week group,
followed by exact-day subheadings. Later day/week assignments sit under their canonical Sunday–Saturday week;
whole-week tasks precede chronological day subgroups with weekday/date labels. Month-only assignments retain
separate month groups. Grouping is display-only and preserves source order within each exact date.
Week and day headers accept scheduling drops for their own precision without bubbling to an outer group.
Task rows prioritize the title beside the status, compact subtask count, date, and an always-available actions button.
Expanded Plan project checklists end with an empty Subtask row that saves on Enter or blur and stays ready
for the next addition. No parent Save is required; adding a child preserves the parent's source section,
status, dates and existing child metadata. Frozen and low-priority parents do not offer this add row.
In Plan, a plain individual-task title click opens the editor with the title focused; Enter/Space also activate it.
For PROJECTS, the first title activation expands its checklist; the next title activation opens the editor.
There is no disclosure caret. An expanded project has a small Close control, including an empty project with its add row.
Modifier-clicks retain task selection, frozen tasks remain read-only, and status/date/action controls stay independent.
Priority, notes, edit, and confirmed deletion live in that keyboard-accessible overflow; source sections and note previews
do not compete with the title. Subtask parent links use a compact marker with the full parent name on hover.
Each pane scrolls independently. The sidebar is a table of contents with per-section counts;
The sidebar excludes SELECTED, PROJECTS and WIP. Clicking a heading scrolls only the backlog column to that source or section;
it never hides other sources or moves the surrounding page. Normal section-collapse controls remain available.
SELECTED retains its source sections, direct H1 tasks, ordering and controls. Scheduled views group
dated tasks and subtasks from all non-frozen, non-archived sources, independently of paper placement.
Plan's source-column and section headers use compact controls and minimal vertical padding.
Empty schedule groups show their heading, empty-state message and zero count on one line, retaining the separator below.
Rest of this week is subheaded by exact due day. Its week-only group appears first, immediately after Today and before
the upcoming dated days. Completed / will not do stays expanded, with completion-day headers newest first and a final
No completion date group for undated terminal tasks; merely viewing these groups does not assign completion dates.
The first SCHEDULED column also retains Needs a date, closed-week archive previews and completed groups.
The columns keep usable minimum widths; smaller screens scroll horizontally with their headers aligned.
The Markdown WIP heading is not renamed; scheduled projections remain independent of source buckets.
PROJECTS indexes every plus-marked parent outside the archive, regardless of its source column or status.
This index shares original task objects with source panes; merely viewing it never moves or copies tasks in Markdown.
Projects start collapsed. The column's Expand all / Collapse all control opens or closes every project;
mixed state offers Expand all. Dragging a project's dot handle above or below another project reorders the original
parent and its entire subtree in Markdown; dropping across source sections places it in the target's section.
The drop line previews placement, and saved order survives reload. Frozen projects cannot be moved or targeted.
There is no Sort button or automatic project sorting; completed projects can also be manually reordered.
Expanded rows show all supported
subtasks in source order, including undated and completed tasks, with their status and due/completion date.
Expanded subtasks use a compact, borderless checklist rather than nested cards: smaller status marks,
single-line ellipsized titles, visible date clocks and action menus, and a row highlight on hover or keyboard focus.
Subtask titles edit directly in that row with Save/Enter and Cancel/Escape; they never open a parent-edit modal.
Date clocks open an in-place picker below the row for due or completion dates, including missing dates.
The action button exposes the same edit, date, move, detach and deletion commands as right-click.
Title and date changes preserve notes, siblings and source nesting. Expanded subtask status buttons
cycle and save immediately, including completion dates. Their scheduled copies retain their original group through
the shared 1.5-second status pause, and reopening restores the original due precision during that cycle.
Frozen subtasks remain read-only. Disclosure state is view-only
and resets when switching files. Unsupported child syntax remains untouched in the source.
The full Plan project editor also stays in place: its single-line title sits above full-width child rows.
Due and completion controls use compact clocks with full dates in tooltips and pickers, reserving readable
space for every child title. Notes and dates stack below; Save/Cancel stay together. The duplicate read-only
checklist and project drag/Close controls are hidden while that full editor is open.
Legacy PROJECTS headings are read as SELECTED-category sources until explicitly migrated.
User-facing high-priority terminology is Project, not Initiative; the `+` marker and Focus routing stay unchanged.
Explicit project-section migration creates one plus-marked parent per populated PROJECTS section and indents its
normal tasks as minus-marked subtasks. A timestamped exact-source backup must precede migration; nested or unsupported
content and non-normal child priorities are rejected rather than flattened or discarded. Other columns are untouched.

| Application view | Markdown relationship |
| --- | --- |
| Backlog | Live tasks in TODO and other backlog headings, in source section/order, including already dated work; frozen work stays here unchanged |
| PROJECTS | A derived index of live `+` parents, using original objects and source metadata; not a column type |
| TASKS (SELECTED) | Original source sections and individual tasks, including completed and undated work |
| Scheduled | Open dated tasks and subtasks from any non-frozen, non-archived source; children stay attached |
| Needs a date | Undated WIP commitments, retained visibly without guessing dates |
| Completed / will not do | Terminal top-level tasks, expanded by completion day |

Scheduled groups are Overdue, Today, Rest of this week, then explicit future weeks/months. Whole-week and whole-month
assignments retain their precision and are overdue only after the period ends. Current-week periods stay with this
week even across month/year boundaries. Within each group, earlier period end dates come first, with day before
week before month on ties. Source section labels are compact secondary metadata; subtasks include their parent label.
Children have no inherited date; their own status and date control their projection independently of the parent.
Counts refer to the visible rows. Expanded projects always retain their complete child list.
Backlog and SELECTED retain existing section/card controls. +Add opens a task-title and destination-section form;
Cancel writes nothing, and confirmation adds exactly one normal-priority task. Cards use the existing task editor,
priority/status controls, selection and context menus. Dated child rows open their parent's subtask editor.

Explicit date edits put normal/low top-level tasks directly under WIP, or SELECTED when the date is cleared.
Projects move to or stay in SELECTED, even when dated. No date-named paper sections are generated.
Subtasks never detach or move their parent when scheduled or cleared; their date is updated in place.
Moving a parent retains its original object, children, notes and unsupported metadata. Empty source sections stay intact.
Within Scheduled, task and subtask grips allow rescheduling across current and future day/week/month groups.
Drops on a day subgroup use that day, never its enclosing week's date. Overdue is not an assignment target;
dropping there changes nothing. Every card date badge opens a compact chooser beside the clicked badge.
Shortcuts and explicit day/week/month selections save immediately without a second confirmation. Switching precision tabs,
opening or dismissing the chooser does not save. Backlog and SELECTED keep their original source editors.

Navigation, rendering, clock passage, unrelated edits and status changes never bulk-migrate files or synthesize dates.
This is a projection over original objects, not filtered writable copies of sections. Plan persists lifecycle dates
immediately, preserving the original due period during rapid status cycling, and defers regrouping until the status
debounce settles. Leaving Plan cannot cancel a completion timestamp. Focus routing is unchanged.
Plan shares one 1.5-second status debounce per task across its source card and Projects/scheduled copies. Every click
restarts the pause and continues the same status cycle, even when switching between copies. Status glyphs and persisted
lifecycle dates update immediately; source ordering, collapsed-stack membership, due groups and completion-day groups
remain at their pre-cycle positions until the final click settles. Changing files or leaving Plan clears pending timers
without losing the latest status/date. Sorting at settlement does not run the legacy floating-card animation.
Trade-off: canonical time sections are maintained only for explicitly rescheduled parents, not existing paper arrangements.
Revisit source-section restoration after unscheduling if paper organization later needs richer provenance; do not add hidden
metadata or a second database for this first version.

Archive is a slide-out drawer on the right, opened from the Planning heading or View archive beside the week previews.
The Plan columns remain mounted beneath it, preserving selection and edits. Close or Escape returns to Plan.
The drawer opens archive headings with task rows expanded. It starts closed after reload; legacy archive-tab preferences
resolve to Plan. Archive navigation never writes task data or creates headings; missing archives show an empty state.
Compact ready-to-archive week sections sit above the date groups inside WIP, expanded by default and collapsible.
Only closed Sunday–Saturday weeks appear: current and future weeks are excluded. Hide the heading entirely
when no closed weeks are ready.
They continue to combine
terminal parent tasks across SELECTED and WIP source headings/sections, appearing once. This covers work scheduled
through either status path; frozen sections remain excluded. Preview sections are derived, not stored.
Batches use completion dates, not due dates, and the exact archive
section names. Original task rows remain in their source sections until archived. Every week requires
confirmation, showing the destination, task count, and whether a section will be created or reused.
ARCHIVE is created only on confirmation if none exists. Repeated confirmation is ignored.
Undated terminal tasks fall back to the current week and therefore do not appear in Ready to archive;
they remain accessible in the completed list. Each action moves only that week's terminal parents, with all children/metadata intact;
existing same-named archive sections are reused, ignoring case and extra whitespace. Legacy yearless
headings recognize Week/Wek/Wk and omitted Week, plus full/abbreviated month names. Yearless headings require
an exact-week dated anchor and consistent year evidence; adjacent-week spillover does not disqualify a paper bucket.
Empty, undated-only or mixed-year headings are not guessed. Existing duplicate matching week sections are
listed in the confirmation and merged only on confirmation, preserving every item and nested child. Other weeks, unfinished tasks
and source sections stay put.

Raw reads the exact source from disk, not parser-rendered output. It starts read-only on every entry/file
change. Edit enables a draft; only explicit Save (or Cmd/Ctrl+S while editing) writes it. Cancel/navigation
with a changed draft asks before discarding; closing/reloading the browser uses its unsaved-change warning.
Saving preserves source characters and unsupported syntax without parse/render normalization, uses the
existing backup endpoint, and rejects a stale expected source with HTTP 409 before writing. Failed saves
retain the draft. Empty-file saves are disabled. Successful saves reload the normal app model and reset
board undo history; Raw editing uses textarea undo, not the board's parser-based undo stack.
Raw has an always-visible, independently scrolling ToC sidebar. It lists Markdown hash headings by level and source line,
ignoring fenced code. Selecting a heading scrolls to and selects its exact source line without editing or saving.
The outline follows the current draft, including duplicate titles, in both read-only and edit mode.
ToC headings and source headings share a column-category color: TODO blue, PROJECTS purple,
SELECTED amber, WIP green, and ARCHIVE/DONE rose. Subsections inherit their parent column's color.
The source pane adds a matching section gutter and lightly tinted heading rows; task text stays neutral.
Highlighting follows draft edits and scrolling without interpreting HTML or modifying saved source.
Dark mode uses lighter variants; forced-colors mode retains native readable editor text.

## Board task sorting

Plan/Triage section sorting and automatic sorting after parent-status changes or column moves use this order:
completed, will-not-do, active (in-progress or blocked), then unstarted. An unstarted parent with at least one
subtask in progress, blocked, done, or will-not-do sorts with active tasks, for both normal tasks and projects.
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
Projects and normal `*` tasks accept new subtasks. Existing children under low-priority tasks remain editable and preserved.
Normal tasks without children retain their note-first editor with a small "Add subtasks" action instead of an empty
subtask pane. Projects and tasks with existing subtasks display the subtask editor directly.
Changing between project and normal priority keeps children attached. Moving a normal parent to low priority
opens a themed in-app modal. It shows the parent title, subtask count, read-only cards with statuses and dates,
Cancel and "Detach subtasks & make low".
Cancel is focused initially; Escape or backdrop click cancels.
Cancel changes nothing;
confirm detaches all subtasks as normal-priority tasks immediately after the parent in its original section,
preserving their order, statuses, notes, and dates. Unsupported attached content stays with the parent.
Focus offers Convert to subtask with projects presented first and a "Choose a regular task" option.
The regular-task view lists open, editable normal tasks across columns in a compact scrollable list filtered by title.
Closed tasks, low-priority tasks, subtasks, and the source task are excluded. Parents with children cannot be converted.
Subtasks have a shared right-click menu on Plan checklist rows, scheduled rows/sidebar, Focus cards and nested editors.
It offers editing, moving to another parent, detaching as a regular task and confirmed deletion.
Parent selection defaults to searchable open projects, with a searchable regular-task option; current, low-priority,
closed, archived and frozen parents are excluded. Moving appends the child to the destination; detaching places it
immediately after its source parent in the same section. Both preserve status, notes, dates and unsupported metadata.
Deletion removes only the selected child. Actions save immediately, independently of unsaved parent fields.
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
- `+ [status]` marks a high-priority task or project. Priority controls cycle normal (`*`), low (`-`),
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
