# Focus Mode Product Spec

Focus Mode is the execution-oriented view of the current week. It is intentionally distinct from the main planning board: it surfaces what needs attention now while preserving enough weekly context to make date and status changes understandable.

## Source and routing

### Viewing another day

The large header date opens the date picker, with previous/next-day arrows alongside it and Back to today below it.
The date and both arrows stay on one line. At a fixed viewport width, the arrows keep fixed horizontal positions
as weekday, month, day, and preview-year text changes; the date stays centered between them.
Header arrows move one calendar day; the lower carousel arrows still move by week. All dates are editable: all panels, date badges, and the default
Week at a glance regroup relative to that date. The selected date acts as today throughout Focus, retaining the normal TODAY, Today!, This week, and due-today labels.
The lower week carousel still navigates independently around the chosen Focus week.

Date navigation uses current task data, not reconstructed historical statuses or file snapshots. Task edits,
status changes, priority changes, drag sorting, context actions, quick add, and overdue rollover update the real file.
Quick add, due-date shortcuts and overdue rollover use the displayed date; completion records the actual day of the action.
Notes, magnification, and week navigation remain available. Date navigation waits for pending status
changes/animations to settle; switching dates closes any open editor without saving its draft.
Back to today restores the current date. Date selection is local to the mounted Focus view and is not persisted.

Future previews omit unfinished tasks whose due period ends before the chosen date, rather than accumulating
predicted overdue work in NOW. Day, week, and month periods keep their real end boundaries. Undated work and
still-current periods remain visible under the normal routing rules. Today and past previews retain overdue routing.

Focus Mode derives its tasks from SELECTED and WIP. Started (`~`) top-level SELECTED tasks belong in IN PROGRESS / PARKED
regardless of scheduled period, except that whole-current-week, due-today and overdue tasks belong in NOW.
Other nonurgent started SELECTED tasks use PARKED, with low-priority
tasks in the final LOW PRIORITY group. Initiatives retain their exclusive panel; subtasks retain date/status routing.
Unstarted SELECTED tasks keep date-based placement: whole-current-week work in NOW, future or undated work in UP NEXT,
and future exact days this week in Week at a glance.

- A task is on deck when it is in WIP or due no later than the Saturday ending the current Sunday–Saturday week.
- NOW contains unstarted and in-progress whole-current-week tasks and subtasks from SELECTED and WIP in THIS WEEK above TODAY, using neutral card backgrounds. NOW also contains overdue and due-today nonterminal work, plus work completed or cancelled today. Low-priority whole-week commitments appear in a compact subgroup at the bottom of THIS WEEK. Initiatives retain their exclusive panel.
- UP NEXT contains unstarted SELECTED/WIP and in-progress WIP exact dates or whole-week work after the current week, whole-month work that is unstarted or in-progress WIP owned by a later month, and undated non-`~` work under UNSCHEDULED. Dated work is grouped into canonical month-owned week labels such as Aug Week #3. Current-week dates are omitted here because Week at a glance already represents them; whole-current-week assignments instead have one authoritative home in NOW.
- UP NEXT's dated groups form a chronological month timeline: each whole-month group is followed by the weeks owned by that month, then the next whole-month group and its weeks. UNSCHEDULED and LOW PRIORITY remain last.
- IN PROGRESS / PARKED contains nonurgent `~` SELECTED tasks except whole-current-week assignments, and `~` WIP tasks assigned to the current month as a whole or without a date. WIP-source work appears under THIS MONTH - ACTIVE; started SELECTED work uses PARKED. Low-priority work appears together under LOW PRIORITY at the bottom. Starting WIP work due after the current week leaves it in UP NEXT after debounce. Whole months use their calendar month for that boundary.
- A WIP `~` task assigned to a future exact day in the current week is shown only under that day in WEEK AT A GLANCE. Started SELECTED work stays parked and can also appear under its scheduled day.
- A future-dated queued task appears in UP NEXT and under its date in Week at a glance. A started SELECTED task instead appears in IN PROGRESS / PARKED and under its scheduled day.
- A nonterminal task has one trailing due marker: `! Aug 13 2026`, `! Aug Week #2 2026`, or `! Aug 2026`. A terminal task instead has one exact completion marker such as `| Aug 13 2026`; completing replaces the due marker with today’s completion marker, while reopening converts that completion day back into an exact due day.
- Sunday–Saturday weeks are named for the month containing at least four of their days and numbered among the weeks owned by that month.
- A period becomes overdue only after its final day. Current-week periods are scheduled under THIS WEEK in their routed panel but are not assigned to a fake weekday. WIP month periods remain in UP NEXT unless their task becomes active.
- When any unfinished Focus-source task is overdue, NOW offers a counted "Move overdue to today" action. It changes every overdue day, week, or month due period in SELECTED/WIP to today's exact date in one saved update; terminal tasks and other columns are untouched. The action disappears when nothing is overdue.

## Top execution carousel

The top area contains three panels with one spotlight at a time:

1. UP NEXT
2. NOW, spotlighted by default
3. IN PROGRESS / PARKED

The current date is centered prominently above the panels using the full weekday, abbreviated month, and ordinal day (for example, `Tuesday, Aug 18th`).

The spotlight is larger. When NOW is centered, both side panels remain fully visible and slightly shorter and narrower than the spotlight, and sit just below vertical center so their breathing room remains nearly balanced. The carousel is linear—UP NEXT → NOW → IN PROGRESS / PARKED—and never wraps an end panel around to the opposite side. The stage uses most of the available viewport height while preserving a small footer buffer around the compact navigation dots. Navigation works through adjacent panel clicks, the three compact dots, left/right arrow keys, and horizontal swipe.

## Week at a glance

The lower strip always shows Sunday through Saturday and replaces the old DONE panel. Whole-current-week commitments
use THIS WEEK in NOW for both unstarted and in-progress tasks and subtasks,
rather than occupying a synthetic eighth day here.
- Every day is a contained, independently scrolling pane.
- Future days show scheduled tasks.
- Past days retain completed and cancelled tasks. When a terminal task has no due date, its completion stamp determines its day.
- Today is lightly muted and replaces the weekday header and duplicate NOW cards with a centered blue “Today!” callout and one vertical summary of the nonzero task-status counts, using the standard status indicators.
- Weekly cards omit the redundant due-date badge and collapse notes to an icon. Their one-letter section marker and clickable due-date clock remain hidden at rest to preserve title width, then appear when that pane is magnified.

### Dock magnification

Moving the pointer across the week strip produces a Mac Dock-style magnification effect.

- The pane nearest the pointer is the strongly magnified center pane.
- Immediate neighbors grow modestly; the effect tapers off quickly beyond them.
- Fixed outer slots translate away from the magnified region instead of flex-reflowing.
- Magnified panes may escape the weekly container and stack in front of the upper carousel, but edge panes shift inward so the active pane remains inside the viewport.
- Pane movement is one smooth transform animation, not separate width and position stages.
- An inverse-scaled content layer keeps typography and icons at their normal visual size while laying content out across the wider magnified area. The purpose of magnification is to reveal more title text and more tasks, not to enlarge type.
- Leaving the strip returns all panes to equal size and position.

## Task interactions

- `[!]` means Blocked. The normal checkbox outline and lightly tinted fill surround a small red inner
  octagon, parallel to the orange inner square for In progress. The outer checkbox is not a stop sign.
  Blocked tasks and subtasks go to the right pane's BLOCKED group regardless of due date, including today,
  overdue, weekly, future and undated work. Low-priority blocked work uses that pane's LOW PRIORITY group.
  Blocked initiatives move here too; high priority and children are preserved. Undated blocked subtasks
  also surface here. Future previews retain overdue suppression. Blocked is unfinished: dates are retained,
  no completion date is added, and archive excludes it. Changing status restores normal date/priority routing.

- Right-click a subtask in its nested editor or on any Focus card to delete it with confirmation.
  Deletion saves immediately and removes only that child, preserving its parent, siblings, and unsupported source lines.
  Subtask menus do not offer top-level column movement or conversion to another subtask.

- Convert to subtask in the right-click menu first offers a searchable list of unfinished initiatives,
  plus "Choose a regular task" for a short scrollable, title-filtered list of open normal tasks across editable columns.
  Conversion moves the task under the chosen parent, preserving status, notes and dates, and writes an indented minus row.
  Tasks already containing children cannot be converted. New children can be added to initiatives and normal tasks;
  existing children of other tasks remain intact and editable.

- Normal tasks without subtasks keep the full-width note layout and a small "Add subtasks" action.
  The subtask editor appears only after that action or when children already exist; initiatives show it by default.
  When both columns are visible, Subtasks and Note headings align at the top; a short subtask list never centers vertically beside a taller note.

- Subtasks are managed in the parent's inline editor. Dated children also appear in NOW or In Progress / Parked
  when their status/date qualifies, with a parent-name badge; other children stay editor-only. They remain nested
  in source storage and do not appear in Up Next. Day-dated children appear on their day in Week at a Glance,
  with a parent label; today retains its summary and past days use completion dates. Notes stay hidden and preserved.
  The parent status symbol itself becomes a seamless fixed 4×4 grid inside a neutral border, filled proportionally from top to bottom:
  very light gray unstarted with a centered gray dot per tile, gray will-not-do, red blocked, yellow in progress, then green done.
  Pixels have no gaps or outlines. It retains the parent's status-click behavior.
  A blocked parent shows the blocked indicator instead of the child grid. Parent completion is allowed even with unfinished subtasks; it records the parent's completion date
  without changing any child's status or dates. The grid continues to reflect the actual child statuses.
  The separate "N subtasks" badge opens the parent editor and does not contain the grid.
  Subtask titles and additions save on blur or Enter. Status (including completion dates), due dates, removal and ordering
  save immediately. Parent Save/Cancel applies only to parent fields, not saved subtask changes. Empty placeholder rows are not persisted.
  Editing is available on every displayed date.
  Completed and will-not-do subtasks show a labeled completion-date badge in the nested editor instead of a due-date clock.
  Clicking that badge opens an exact-day completion picker with Today, Yesterday, custom day and Clear.
  The chosen completion date saves immediately, preserving the child's status and hidden notes and leaving parent drafts unsaved.
  Legacy terminal subtasks without a recorded date say "no date"; displaying them never invents a timestamp.
  Editing a surfaced subtask shows its full parent title, wrapping rather than truncating. Detach saves the
  current title draft and promotes it to a regular-priority standalone task immediately after the parent in
  the same source section, preserving status, dates, and hidden notes.

- Click an existing note indicator to edit its note, or click the task title to add a note in the inline editor.
  The note field saves on Enter (also Command/Ctrl+Enter); Shift+Enter inserts a newline. Save, Cancel, and Escape
  are also supported. Clearing it removes the
  note. Saving preserves status, priority, due/completion date, and source section. Editing never changes the
  spotlight. Note hover still shows the immediate tooltip without counting toward pane magnification.
  Other-date views allow both reading and editing notes.

- Focus Mode's + Add creates an unstarted task due today, so it appears immediately in NOW. Its storage section is inferred dynamically: use the WIP section with the most `~` tasks, falling back to the first WIP section and then the first SELECTED section; no section title is hard-coded.
- Quick Add's custom Day picker uses the native calendar date control (`type="date"`), not a text field.
  Choosing a date saves a nonempty task immediately; Week and Month retain their period pickers.
- Task names are edited independently from due dates. The title and unused card surface open editing.
  Sorting starts only from the dedicated drag handle, shown when a task has sortable peers.
  Focus handles sit outside the right card edge and use two columns of three clearly spaced dots,
  with a taller grip and wider hit area; titles and unused card space still open editing.
- Right-clicking any visible task card opens a Focus action menu without changing the spotlighted panel. Delete is a
  confirmed action in that menu and removes the task from its original Markdown section. The menu also shows the
  task's exact Triage/Plan column and can move it to a chosen section in any other Triage/Plan column without changing
  its status or schedule. Column choices follow the board's left-to-right stack order, retaining file order within
  each stack.
- Task titles and due-date controls remain directly editable in the left and right side panels; using them does not move that panel into the spotlight. Clicking the surrounding panel still brings it to center.
- The due-date clock opens an anchored menu with Today, Tomorrow, each remaining day this week, This week, Next week, whole-month shortcuts, one unified custom picker, and Clear. “Next week” assigns the entire next Sunday–Saturday week, not an exact Monday. The custom picker switches between Day, Week, and Month precision without presenting three competing controls. Choosing a value saves immediately.
- Status uses the five board states and the same click cycle as the board: queued → completed → in progress →
  blocked → will not do → queued. If clicking begins on a settled in-progress task, that sequence instead uses
  in progress → completed → blocked → will not do → queued → in progress. The starting state stays fixed during rapid
  clicks and resets after the 1.5-second debounce. Hover previews the next state's highlight without replacing
  the current symbol.
- For completed or cancelled work, the completion stamp is authoritative for Focus placement. An old due date does not keep a task in NOW or place it under the wrong weekday.
- Marking an unscheduled or current-month-level Up Next task in progress moves it to IN PROGRESS / PARKED after the status debounce. Started SELECTED work due after this week also moves there; WIP work due after this week remains in UP NEXT. Due-today and overdue work remains in NOW.
- Status appearance updates immediately, but sorting and re-bucketing wait 1.5 seconds so repeated toggles do not move the control under the pointer.
- Status changes that keep a card in the same panel/list reorder in place after debounce, without hiding,
  flight clones, or arrival effects—even when its row or subgroup changes. Initiatives count as their own list
  regardless of the underlying routing bucket. Moves between lists retain the hold, flight, and landing animation.

## Priority marker

- `+ [status]` marks high-priority work (an initiative). Board priority controls cycle Regular → Low → High → Regular.
  Normal-priority Focus cards instead show side-by-side ↑ and ↓ buttons: ↑ makes high priority directly,
  while ↓ makes low priority. This includes Week at a glance. Low and high controls keep their existing actions.
  The arrows use compact 10px glyphs in adjacent 12px-wide buttons, with no gap between the controls.
  HIGH is distinct from the task's status and due date. Plan/Triage keeps normal card size with a HIGH control.
- Focus pins unstarted and in-progress high-priority SELECTED/WIP tasks in a compact Initiatives panel above Up Next.
- Initiatives is slightly wider than Up Next, with subtly larger task text and checkboxes.
  At rest its height fits its contents up to 4.5 task rows, then scrolls internally.
  Hovering or focusing inside expands it downward to show all rows without internal vertical scrolling.
  An open inline editor also keeps it expanded while focus moves into a popup menu.
  Its width, left position, and resting tilt do not change. Only Up Next uses horizontal magnification.
  Expansion overlays the content below rather than pushing the other panels or reserving empty space.
  It sits above Up Next and NOW with only a slight lower-edge overlap, rather than covering their contents.
  It belongs to the left-hand stack and never reserves a full-width row above NOW or the right panel.
  Its cards use the normal opaque task-card fill for the current theme. The Initiatives panel is fully opaque,
  including when it expands over Up Next; only the surrounding layout wrapper is transparent.
  This is their exclusive Focus location: omit these tasks from other panels and the week strip.
  They retain their source section and dates, and progress counts never double-count them.
  Completing, cancelling, or lowering priority removes a task from this panel. The panel is hidden when empty.
  Future-date viewing keeps its existing overdue exclusion and allows editing. A small neutral-gray down-arrow control restores
  regular priority directly from the panel while keeping subtasks attached. Changing a normal parent to low priority
  opens a themed in-app modal warning that all subtasks will be detached.
  It shows the parent title, subtask count, and read-only subtask cards with titles, statuses, and dates, focuses Cancel first,
  traps keyboard focus, and supports Escape/backdrop
  dismissal. The explicit action is "Detach subtasks & make low"; no browser confirmation prompt is used.
  Cancel changes nothing. Confirm detaches them as normal-priority tasks directly after the parent in source order,
  preserving status, notes, and dates. Detachment occurs when the priority debounce settles, not on each toggle click.
  Status, title, note, date, and context-menu actions remain available there.

- Markdown tasks beginning with `- [status]` are low priority; `* [status]` is normal priority. The checkbox status and list-marker priority are independent.
- The parser and renderer preserve the marker through every edit and save.
- Low-priority tasks use a compact treatment throughout the app. UP NEXT and IN PROGRESS / PARKED pull them into a compact LOW PRIORITY group at the bottom of each panel. NOW keeps low-priority whole-week work together at the bottom of THIS WEEK; other low-priority work remains in its final LOW PRIORITY group.
- Week at a glance preserves its day columns instead of adding nested groups; each low-priority row carries a small inline LOW badge.
- Focus priority controls preview immediately but save and regroup 700ms after the last click, allowing rapid cycling
  without moving the card. Leaving Focus flushes the pending choice. Normal work has separate high/low arrows;
  LOW advances to HIGH and HIGH restores regular priority. Lowering a normal task with subtasks still requires confirmation.
- Priority never overrides NOW urgency rules or the date-based Week at a glance placement.

## Ordering

Existing day/group boundaries take precedence. Within a group, tasks cluster by source section and follow their order in that Markdown section.

Cards sharing the same Focus group and source Markdown section can be drag-sorted. A successful drop rewrites only those cards' relative task slots in the source section; raw text and tasks outside the sortable subset remain anchored. Cross-group and cross-section drops are rejected so Focus sorting cannot change task meaning or silently move work between planning structures.

Initiatives uses the same sorting rules: drag the handle to reorder initiatives from the same source section.
NOW puts subtasks in one separate Subtasks group per main date section (This Week, Today), not per parent.

## Theme

Focus Mode follows the toolbar light, dark, or automatic theme preference.
