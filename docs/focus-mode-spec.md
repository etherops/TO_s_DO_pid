# Focus Mode Product Spec

Focus is the date-oriented execution view. The approved Focus2 variation is now the only Focus mode.
The toolbar contains Plan, Focus, Calendar and Raw. Saved `focus2` preferences migrate to `focus`;
opening either saved Focus preference never changes Markdown.

## Sources and routing

Focus derives dated tasks and subtasks from all non-frozen, non-archived columns, including backlog.
Paper placement follows [the paper workflow contract](paper-workflow.md): projects remain in SELECTED,
and child projections always retain their parent. A project's own deadline can still be displayed.
Its three upper panels retain the original layout, with Today / Overdue centered and slightly larger:

- Left, **THIS WEEK - UNSCHEDULED**: whole-week assignments for the Sunday–Saturday week containing the displayed date.
- Center, **Today / Overdue**: three compact stacked sections, MAIN, LOW PRIO, BLOCKED/WAITING,
  including work completed or cancelled on that date. Blocked `[!]` takes precedence over low priority;
  other low-priority top-level tasks go in LOW PRIO, and remaining tasks/subtasks go in MAIN.
  Child bullet markers do not make subtasks low priority. All three headers show counts even when empty,
  without reserving blank vertical space. Dates stay on cards. Status regrouping waits for the existing
  1.5-second debounce; priority regrouping waits for the existing priority save delay.
- Right, **THIS WEEK - SCHEDULED**: exact-day assignments later in the week, under weekday/date headings.

The right panel always shows all seven weekday/date drop targets, including empty days.
Each day group keeps its content height, including expanded editors; when space runs out the panel
scrolls rather than shrinking day groups and allowing their cards to overlap subsequent headings.
Priority, source section and blocked status never override date routing. There are no Projects, Up Next,
Parked or Done panels. Undated work, current whole-month commitments and later-week work stay in Plan.
Terminal work appears in upper panels only on its recorded completion day. Missing completion dates
are not invented. Periods become overdue only after their final day. Weeks are named for the month
containing at least four of their days and numbered within that owning month.

Cards omit file-section labels. The left pane shows its shared due week once in its heading;
each row retains a compact clock for date editing. Cards remain compact editable rows, not tiles.
The left pane uses the same MAIN, LOW PRIO and BLOCKED/WAITING sections and precedence as the center,
including status debounce, counts and compact empty headers. The shared week header remains above
the three sections, and its count includes all of them. Grouping never detaches or copies subtasks.

## Date navigation

The large header date opens a native date picker. Previous/next-day arrows stay on the same line at
fixed horizontal positions as date text changes. Back to today restores the actual date. The displayed
date resets when leaving and reopening Focus.

All upper panels and the default calendar week derive from that date. Future previews suppress unfinished
work whose due period has ended, rather than predicting future overdue tasks. Current and past previews
retain overdue routing. Navigation uses current data, not historical snapshots, and never writes Markdown.
Date changes close parent drafts and wait for pending status transitions to settle.

Editing works on every displayed date. Quick add, date shortcuts and overdue rollover use the displayed
date; completion stamps use the actual day of the action. Overdue rollover updates unfinished
eligible work in one save, preserving terminal tasks, notes and children.

## Scheduling and ordering

Drag handles on unfinished tasks and subtasks schedule across the three panels:

- Left assigns the displayed whole week.
- Center assigns the displayed day.
- Each right-hand day heading assigns that exact date, including empty targets.

Drops change due dates and apply the shared paper-placement rule: normal/low top-level work goes to
the WIP root, while projects stay in SELECTED and children always stay nested under their parent.
Notes, status and raw content are retained.
Today and past-day assignments follow center-panel urgency rules. Completed work and unsettled status
changes cannot be scheduled by drag. Handles use two columns of three dots outside the right card edge;
title and unused card space open editing rather than dragging.

Within one date group and source section, top-level tasks can be manually reordered by their handles.
Only eligible task slots move; unrelated tasks and raw lines remain anchored. Cross-section scheduling
uses the same paper-placement rule. Manual source changes remain available through the context menu.

## Week at a glance

The bottom strip preserves its original container, height, seven day cards, independent week navigation
and dock magnification. Each day scrolls only when needed. Rows are compact read-only single-line text
with ellipsis, subtle separators and alternating tints. Hover reveals full title, status, date, source
and parent. Calendar entries have no edit, status, priority, drag or context-menu actions.
Completed rows show a green checkmark; will-not-do rows show a gray dash. Only the title is struck
through and muted, keeping the read-only status symbol distinct and the row height unchanged.

Exact-day tasks and subtasks appear on their due day, including today. Terminal entries use completion
dates. Whole-week/month assignments are never assigned to a fake weekday. Previous/next-week navigation
and This week return are independent of upper date navigation.

Dock magnification enlarges the nearest day and modestly enlarges neighbors, translating outer slots
rather than reflowing them. Edge panes remain inside the viewport. Inverse-scaled content preserves
normal text size while revealing more content. Leaving restores equal widths.

## Editing and task actions

- Click a title, unused card surface or child-count badge to edit. Name, notes and dates are independent.
  Save, Enter or Command/Ctrl+Enter saves parent fields; Escape/Cancel discards that draft. Shift+Enter
  inserts a note newline. Notes appear inline after titles instead of icons, in smaller muted italic
  text aligned to the title baseline (10px, or 9px on low-priority rows). Long notes truncate within
  the compact row; hover shows the full note and clicking edits it.
  Typing `title (note)` directly in the name field saves that note instead of overwriting it with the
  previously loaded note field. Without a parenthesized note, the separate note field remains authoritative.
  Surfaced subtasks use the same inline note and Note editor in every upper pane. Saving, clearing or
  cancelling their notes never detaches them or changes their parent, siblings, status or dates.
  Name-only subtask edits preserve existing note blocks; typing a new `(note)` replaces the old note
  without accumulating copies during input, including within expanded project editors.
- Regular tasks without children use full-width notes and optional Add subtasks. Projects show children
  by default. Subtasks and Note headings align at the top.
- Child titles and additions save on blur or Enter. Child status, completion/due dates, ordering, moving,
  detaching and confirmed deletion save immediately, independently of parent drafts. Hidden notes, raw
  lines and siblings are preserved; empty placeholders never persist.
- Surfaced children retain a parent badge; editing shows the full parent title. Detach saves the child
  title draft and promotes it to a regular task immediately after its parent in the same source section.
- Right-click editable cards for editing, confirmed deletion and explicit source-column/section movement.
  Child menus offer Edit, Move to another parent, Detach and confirmed Delete, not top-level column movement.
  Parent selection defaults to searchable non-archived projects, including completed and will-not-do
  projects without reopening them, with searchable open regular tasks as an alternative.
  Scrolling within a context menu or parent list keeps it open, including at the list boundaries;
  scrolling the background dismisses it. Focusing picker search must not scroll the background.
- Conversion preserves status, dates and notes. Existing parents cannot be converted into subtasks.
  Low-priority tasks, terminal regular tasks, archived and frozen parents are excluded as destinations.
  Conversion and moving an existing subtask use the same parent eligibility rules.
- Quick Add creates an unstarted task due on the displayed date. Its target is the WIP section with the
  most active tasks, then first WIP section, then first SELECTED section. No title is hard-coded.
  Custom Day uses a native date input; Week and Month retain their own precision controls.
- Due clocks provide shortcuts and one custom Day/Week/Month picker. Choosing a date saves immediately.
  Terminal cards edit completion dates instead. Nested terminal children offer Today, Yesterday, custom
  day and Clear; missing legacy dates stay missing until explicitly edited.

## Status and priority

Status cycles queued → completed → in progress → blocked → will not do → queued. Settled in-progress
work instead starts in progress → completed → blocked → will not do → queued → in progress. The starting
state stays fixed during rapid clicks, resetting after the 1.5-second debounce. Appearance updates
immediately; saving, sorting and routing wait so the control stays under the pointer. Same-panel status
changes reorder without disappearing; cross-panel moves retain their transition.

Blocked `[!]` uses a small red inner octagon within the normal square checkbox. It remains unfinished
and retains dates. Completion replaces the due marker with the actual completion day; reopening converts
that stamp back to an exact due day.

Parents complete independently of children. Their status symbol is a seamless fixed 4×4 grid showing
child-status proportions inside a neutral internal border: light-gray dotted unstarted at top, then
gray will-not-do, red blocked, yellow active and green done at bottom. A blocked parent shows its blocked
indicator instead. The separate child-count badge opens editing.

High `+`, normal `*` and low `-` priority never override scheduling. Normal cards show compact
adjacent up/down arrows; high returns to normal, low advances to high. Preview is immediate; saving waits
700ms after the final click. Leaving Focus flushes the choice. Lowering a parent to low requires a themed
modal listing read-only child cards with statuses/dates and warning that all children detach. Cancel is
initially focused, focus is trapped, Escape/backdrop cancels. Confirm detaches children immediately after
their parent, preserving metadata.

## Appearance and safety

Focus follows shared light/dark/automatic themes. Both side panels stay visible around the center;
hover magnification never reselects panels. Direct editing does not move the spotlight.
Mode changes and browsing never rewrite files. Edits use existing save/history mechanisms.
Low-priority cards share the same horizontal card edges and title start as other priorities in Focus
and Plan. Their smaller checkboxes are centered within the same-width checkbox slot; smaller glyphs
must not shift titles. Muted colors and smaller text distinguish them, not indentation.
