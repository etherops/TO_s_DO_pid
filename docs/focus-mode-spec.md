# Focus Mode Product Spec

Focus Mode is the execution-oriented view of the current week. It is intentionally distinct from the main planning board: it surfaces what needs attention now while preserving enough weekly context to make date and status changes understandable.

## Source and routing

### Viewing another day

The large header date opens the date picker, with previous/next-day arrows alongside it and Back to today below it.
Header arrows move one calendar day; the lower carousel arrows still move by week. A date other than today makes Focus read-only: all panels, date badges, and the default
Week at a glance regroup relative to that date. The selected date acts as today throughout Focus, retaining the normal TODAY, Today!, This week, and due-today labels.
The lower week carousel still navigates independently around the chosen Focus week.

Preview uses current task data, not reconstructed historical statuses or file snapshots. Task edits,
status changes, priority changes, drag sorting, context actions, quick add, and overdue rollover are unavailable.
Notes, magnification, and week navigation remain available. Date navigation waits for pending status
changes/animations to settle; switching dates closes any open editor without saving its draft.
Back to today restores live editing. Preview selection is local to the mounted Focus view and is not persisted.

Future previews omit unfinished tasks whose due period ends before the chosen date, rather than accumulating
predicted overdue work in NOW. Day, week, and month periods keep their real end boundaries. Undated work and
still-current periods remain visible under the normal routing rules. Today and past previews retain overdue routing.

Focus Mode derives its tasks from SELECTED and WIP.

- A task is on deck when it is in WIP or due no later than the Saturday ending the current Sunday–Saturday week.
- NOW contains unstarted and in-progress whole-current-week commitments together in THIS WEEK above TODAY, using neutral card backgrounds. It also contains overdue and due-today nonterminal work, plus work completed or cancelled today. Low-priority whole-week commitments appear in a compact subgroup at the bottom of THIS WEEK.
- UP NEXT contains exact dates or whole-week work after the current week regardless of active status, whole-month work that is unstarted or owned by a later month, and undated non-`~` work under UNSCHEDULED. Dated work is grouped into canonical month-owned week labels such as Aug Week #3. Current-week dates are omitted here because Week at a glance already represents them; unstarted whole-current-week assignments instead have one authoritative home in NOW.
- UP NEXT's dated groups form a chronological month timeline: each whole-month group is followed by the weeks owned by that month, then the next whole-month group and its weeks. UNSCHEDULED and LOW PRIORITY remain last.
- IN PROGRESS / PARKED contains only `~` tasks assigned to the current month as a whole or without a date. WIP-source work appears under THIS MONTH - ACTIVE, while SELECTED-source work appears under THIS MONTH - PARKED. Low-priority work appears together under LOW PRIORITY at the bottom. Starting work due after the current week leaves it in UP NEXT after debounce. Whole months use their calendar month for that boundary.
- A `~` task assigned to a future exact day in the current week is shown only under that day in WEEK AT A GLANCE, not duplicated in either upper side panel.
- A future-dated queued task appears in UP NEXT and under its date in Week at a glance. It is not duplicated into IN PROGRESS / PARKED.
- A nonterminal task has one trailing due marker: `! Aug 13 2026`, `! Aug Week #2 2026`, or `! Aug 2026`. A terminal task instead has one exact completion marker such as `| Aug 13 2026`; completing replaces the due marker with today’s completion marker, while reopening converts that completion day back into an exact due day.
- Sunday–Saturday weeks are named for the month containing at least four of their days and numbered among the weeks owned by that month.
- A period becomes overdue only after its final day. Current-week periods are scheduled under THIS WEEK for the whole week but are not assigned to a fake weekday. Month periods remain in UP NEXT unless their task becomes active.
- When any unfinished Focus-source task is overdue, NOW offers a counted "Move overdue to today" action. It changes every overdue day, week, or month due period in SELECTED/WIP to today's exact date in one saved update; terminal tasks and other columns are untouched. The action disappears when nothing is overdue.

## Top execution carousel

The top area contains three panels with one spotlight at a time:

1. UP NEXT
2. NOW, spotlighted by default
3. IN PROGRESS / PARKED

The current date is centered prominently above the panels using the full weekday, abbreviated month, and ordinal day (for example, `Tuesday, Aug 18th`).

The spotlight is larger. When NOW is centered, both side panels remain fully visible and slightly shorter and narrower than the spotlight, and sit just below vertical center so their breathing room remains nearly balanced. The carousel is linear—UP NEXT → NOW → IN PROGRESS / PARKED—and never wraps an end panel around to the opposite side. The stage uses most of the available viewport height while preserving a small footer buffer around the compact navigation dots. Navigation works through adjacent panel clicks, the three compact dots, left/right arrow keys, and horizontal swipe.

## Week at a glance

The lower strip always shows Sunday through Saturday and replaces the old DONE panel. Whole-current-week commitments live together in NOW's THIS WEEK group rather than occupying a synthetic eighth day here.
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

- Convert to subtask in the right-click menu offers a searchable list of unfinished initiatives.
  Conversion moves the task under that initiative, preserving status, notes and dates, and writes an indented minus row.
  Tasks already containing children cannot be converted. New children can only be added to initiatives;
  existing children of other tasks remain intact and editable.

- Subtasks are managed in the parent's inline editor. Dated children also appear in NOW or In Progress / Parked
  when their status/date qualifies, with a parent-name badge; other children stay editor-only. They remain nested
  in source storage and do not appear in Up Next. Day-dated children appear on their day in Week at a Glance,
  with a parent label; today retains its summary and past days use completion dates. Notes stay hidden and preserved.
  A subtask-count badge indicates their presence and opens the parent editor. They support draft add/edit/status/remove with the
  parent's Save/Cancel controls. Other-date previews do not allow editing.
  Editing a surfaced subtask shows its full parent title, wrapping rather than truncating. Detach saves the
  current title draft and promotes it to a regular-priority standalone task immediately after the parent in
  the same source section, preserving status, dates, and hidden notes.

- Click an existing note indicator to edit its note, or click the task title to add a note in the inline editor.
  The note field saves on Enter (also Command/Ctrl+Enter); Shift+Enter inserts a newline. Save, Cancel, and Escape
  are also supported. Clearing it removes the
  note. Saving preserves status, priority, due/completion date, and source section. Editing never changes the
  spotlight. Note hover still shows the immediate tooltip without counting toward pane magnification.
  Other-date read-only views allow reading notes but not editing them.

- Focus Mode's + Add creates an unstarted task due today, so it appears immediately in NOW. Its storage section is inferred dynamically: use the WIP section with the most `~` tasks, falling back to the first WIP section and then the first SELECTED section; no section title is hard-coded.
- Task names are edited independently from due dates. The title and unused card surface open editing.
  Sorting starts only from the dedicated drag handle, shown when a task has sortable peers.
- Right-clicking any visible task card opens a Focus action menu without changing the spotlighted panel. Delete is a
  confirmed action in that menu and removes the task from its original Markdown section. The menu also shows the
  task's exact Triage/Plan column and can move it to a chosen section in any other Triage/Plan column without changing
  its status or schedule. Column choices follow the board's left-to-right stack order, retaining file order within
  each stack.
- Task titles and due-date controls remain directly editable in the left and right side panels; using them does not move that panel into the spotlight. Clicking the surrounding panel still brings it to center.
- The due-date clock opens an anchored menu with Today, Tomorrow, each remaining day this week, This week, Next week, whole-month shortcuts, one unified custom picker, and Clear. “Next week” assigns the entire next Sunday–Saturday week, not an exact Monday. The custom picker switches between Day, Week, and Month precision without presenting three competing controls. Choosing a value saves immediately.
- Status uses the four board states and the same click cycle as the board: queued → completed → in progress →
  will not do → queued. If clicking begins on a settled in-progress task, that sequence instead uses
  in progress → completed → will not do → queued → in progress. The starting state stays fixed during rapid
  clicks and resets after the 1.5-second debounce. Hover previews the next state's highlight without replacing
  the current symbol.
- For completed or cancelled work, the completion stamp is authoritative for Focus placement. An old due date does not keep a task in NOW or place it under the wrong weekday.
- Marking an unscheduled or current-month-level Up Next task in progress moves it to IN PROGRESS / PARKED after the status debounce. Work due after this week remains in UP NEXT; due-today and overdue work remains in NOW.
- Status appearance updates immediately, but sorting and re-bucketing wait 1.5 seconds so repeated toggles do not move the control under the pointer.
- A change that moves a card uses the hold, flight, and landing animation. A change that leaves the card in the same rendered slot does not whisk.

## Priority marker

- `+ [status]` marks high-priority work (an initiative). Every priority control cycles Regular → Low → High → Regular.
  HIGH is distinct from the task's status and due date. Plan/Triage keeps normal card size with a HIGH control.
- Focus pins unfinished high-priority SELECTED/WIP tasks in a compact Initiatives panel above Up Next.
- Initiatives is slightly wider than Up Next, with subtly larger task text and checkboxes.
  Its height fits its contents up to 4.5 task rows, then scrolls internally, rather than reserving empty vertical space.
  It sits above Up Next and NOW with only a slight lower-edge overlap, rather than covering their contents.
  It belongs to the left-hand stack and never reserves a full-width row above NOW or the right panel.
  Its cards have no extra background fill; the surrounding stack stays transparent even when magnified.
  This is their exclusive Focus location: omit these tasks from other panels and the week strip.
  They retain their source section and dates, and progress counts never double-count them.
  Completing, cancelling, or lowering priority removes a task from this panel. The panel is hidden when empty.
  Future-date viewing keeps its existing overdue exclusion and read-only rules. The HIGH control can restore regular
  priority directly from the panel. Status, title, note, date, and context-menu actions remain available there.

- Markdown tasks beginning with `- [status]` are low priority; `* [status]` is normal priority. The checkbox status and list-marker priority are independent.
- The parser and renderer preserve the marker through every edit and save.
- Low-priority tasks use a compact treatment throughout the app. UP NEXT and IN PROGRESS / PARKED pull them into a compact LOW PRIORITY group at the bottom of each panel. NOW keeps low-priority whole-week work together at the bottom of THIS WEEK; other low-priority work remains in its final LOW PRIORITY group.
- Week at a glance preserves its day columns instead of adding nested groups; each low-priority row carries a small inline LOW badge.
- Focus priority controls preview immediately but save and regroup 700ms after the last click, allowing rapid cycling
  without moving the card. Leaving Focus flushes the pending choice. The up/down priority icon marks regular work LOW, LOW advances to HIGH,
  and HIGH restores regular priority. The board's full editor exposes the same cycle.
- Priority never overrides NOW urgency rules or the date-based Week at a glance placement.

## Ordering

Existing day/group boundaries take precedence. Within a group, tasks cluster by source section and follow their order in that Markdown section.

Cards sharing the same Focus group and source Markdown section can be drag-sorted. A successful drop rewrites only those cards' relative task slots in the source section; raw text and tasks outside the sortable subset remain anchored. Cross-group and cross-section drops are rejected so Focus sorting cannot change task meaning or silently move work between planning structures.

Initiatives uses the same sorting rules: drag the handle to reorder initiatives from the same source section.
NOW puts subtasks in one separate Subtasks group per main date section (This Week, Today), not per parent.

## Theme

Focus Mode follows the toolbar light, dark, or automatic theme preference.
