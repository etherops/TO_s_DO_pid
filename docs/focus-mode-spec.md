# Focus Mode Product Spec

Focus is the date-oriented execution view. The approved Focus2 variation is now the only Focus mode.
The toolbar contains Plan, Focus, Calendar and Raw. Saved `focus2` preferences migrate to `focus`;
opening either saved Focus preference never changes Markdown.

## Sources and routing

Focus derives dated tasks and subtasks from all non-frozen, non-archived columns, including backlog.
Paper placement follows [the paper workflow contract](paper-workflow.md): projects remain in SELECTED,
and child projections always retain their parent. A project's own deadline can still be displayed.
Its three upper panels retain the original layout, with Today / Overdue centered and slightly larger:

- Left: equal-width **Tasks** / **Projects** tabs, with Tasks selected on each opening of Focus.
  The inactive tab shows its current filtered item count beside its name, including zero. The active tab's
  count stays in the panel header without a duplicate badge on its tab. Counts update with data and date navigation.
  Tasks retains **THIS WEEK - UNSCHEDULED**, showing whole-week assignments for the displayed Sunday–Saturday week.
  Projects shows non-frozen `+` projects in SELECTED whose due period contains the displayed date:
  that exact day, that whole week, or that whole month. Undated projects, other periods and archives are excluded.
  Tasks excludes real project cards but retains individually scheduled subtasks and their parent badges.
  Display-only expandable project summaries belong exclusively to Today / Overdue, never the Tasks tab.
  These are real project rows with the existing inline editor, children, status and date controls.
  Each project shows its recorded due day, week or month beside the clickable clock; only the Tasks tab hides
  repeated due labels beneath its shared week heading.
  Switching tabs only changes the view and cancels unsaved parent drafts; it never changes Markdown.
- Center, **Today / Overdue**: three compact stacked sections, MAIN, LOW PRIO, BLOCKED/WAITING,
  including work completed or cancelled on that date. Blocked `[!]` takes precedence over low priority;
  other low-priority top-level tasks go in LOW PRIO, and remaining tasks/subtasks go in MAIN.
  Child bullet markers do not make subtasks low priority. All three headers show counts even when empty,
  without reserving blank vertical space. Dates stay on cards. Status regrouping waits for the existing
  1.5-second debounce; priority regrouping waits for the existing priority save delay.
  Within each section, surfaced subtasks sharing a parent and due/completion day are collected in one
  compact, expandable project-name group, initially expanded and placed above standalone tasks.
  Only groups with two or more visible subtasks receive a summary header. A lone subtask renders as
  a regular row with its parent badge and normal controls, including when a former group shrinks to one.
  Both summary groups and lone project subtasks sort together above standalone tasks within each section;
  hiding a singleton's summary header does not change its project-first ordering.
  A normal read-only checkbox is empty when all children are unstarted, yellow when any work has
  started, and green/checkmarked only when every child is completed. It is not the project's grid
  checkbox and never changes parent status. It shares the task checkbox's left alignment and size;
  the expand arrow is at the far right. Beside the title, a compact segmented bar shows each child
  status proportion (green completed, yellow active, red blocked, gray cancelled, pale unstarted),
  with a numeric completion percentage counting completed children only. The bar, percentage and
  task count sit directly after the title, left-aligned rather than pushed to the card's right edge.
  Headers always use a blue-tinted background and blue title, whether collapsed or expanded.
  Expanded headers also have a bottom divider, distinct from neutral child rows without changing checkbox alignment.
  Group cards share the regular task cards' left and right edges, reserving the same drag-handle
  gutter once at the group boundary rather than again inside each child row.
  Standalone cards retain a small vertical gap in the center and weekly-unscheduled sections;
  project child rows remain compact inside their shared group.
  Its count covers only those visible
  children, not the whole project. Overdue dates stay separate. The header only expands/collapses;
  it is not the real project card and has no project status, editor or scheduling actions. Expanded
  children retain their status, note, editing, date, drag and context-menu controls without repeated
  parent badges. Collapse and navigation never modify Markdown or reveal unscheduled/future siblings.
- Right, **THIS WEEK - SCHEDULED**: exact-day assignments later in the week, under weekday/date headings.

The right panel always shows all seven weekday/date drop targets, including empty days.
Each day group keeps its content height, including expanded editors; when space runs out the panel
scrolls rather than shrinking day groups and allowing their cards to overlap subsequent headings.
Priority, source section and blocked status never override task date routing. There are no separate Projects, Up Next,
Parked or Done panels. Undated tasks, current whole-month commitments and later-week tasks stay in Plan;
selected projects are additionally accessible through the left Projects tab.
Terminal work appears in upper panels only on its recorded completion day. Missing completion dates
are not invented. Periods become overdue only after their final day. Weeks are named for the month
containing at least four of their days and numbered within that owning month.

All displayed card titles, including expanded project children, stay on one line with ellipsis; editors remain in place.
Cards omit file-section labels. The left Tasks tab shows its shared due week once in its heading;
each task row retains a compact clock for date editing. Project rows show their own recorded due labels.
Cards remain compact editable rows, not tiles.
The left pane uses the same MAIN, LOW PRIO and BLOCKED/WAITING sections and precedence as the center,
including status debounce, counts and compact empty headers. The shared week header remains above
the three sections, and its count includes all of them. Grouping never detaches or copies subtasks.

## Date navigation

The large header date opens a native date picker. Previous/next-day arrows stay on the same line at
fixed horizontal positions as date text changes. Back to today restores the actual date. The displayed
date resets when leaving and reopening Focus through the toolbar. Clicking a Calendar day title/number instead
opens Focus on that exact local date, including dates in adjacent-month padding cells. This navigation does not
reschedule tasks or save Markdown, and later ordinary toolbar openings still start on today.

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
