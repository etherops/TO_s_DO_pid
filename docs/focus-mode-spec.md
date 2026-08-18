# Focus Mode Product Spec

Focus Mode is the execution-oriented view of the current week. It is intentionally distinct from the main planning board: it surfaces what needs attention now while preserving enough weekly context to make date and status changes understandable.

## Source and routing

Focus Mode derives its tasks from SELECTED and WIP.

- A task is on deck when it is in WIP or due no later than the Saturday ending the current Sunday–Saturday week.
- NOW contains whole-current-week commitments in a purple THIS WEEK group above TODAY, overdue and due-today nonterminal work, plus work completed or cancelled today.
- UP NEXT contains whole-month work, exact dates or whole-week work after the current week grouped into canonical month-owned week labels such as Aug Week #3, and undated non-`~` work under UNSCHEDULED. Current-week dates are omitted here because Week at a glance already represents them; whole-current-week assignments instead have one authoritative home in NOW.
- UP NEXT's dated groups form a chronological month timeline: each whole-month group is followed by the weeks owned by that month, then the next whole-month group and its weeks. UNSCHEDULED and LOW PRIORITY remain last.
- IN PROGRESS / WAITING contains only `~` tasks due within the current calendar month or without a date, except whole-current-week work, which remains in NOW. Undated `~` tasks from the former General group appear under IN PROGRESS / PARKED; undated `~` tasks from the former Waiting group appear under WAITING / BLOCKED. Starting a dated Up Next task moves it here after debounce unless it is due today/overdue/current whole week (NOW) or due next month or later (UP NEXT). Whole weeks use their majority-month owner for that boundary.
- A `~` task assigned to a future exact day in the current week is shown only under that day in WEEK AT A GLANCE, not duplicated in either upper side panel.
- A future-dated queued task appears in UP NEXT and under its date in Week at a glance. It is not duplicated into IN PROGRESS / WAITING.
- A nonterminal task has one trailing due marker: `! Aug 13 2026`, `! Aug Week #2 2026`, or `! Aug 2026`. A terminal task instead has one exact completion marker such as `| Aug 13 2026`; completing replaces the due marker with today’s completion marker, while reopening converts that completion day back into an exact due day.
- Sunday–Saturday weeks are named for the month containing at least four of their days and numbered among the weeks owned by that month.
- A period becomes overdue only after its final day. Current-week periods are scheduled under THIS WEEK for the whole week but are not assigned to a fake weekday. Month periods remain in UP NEXT unless their task becomes active.

## Top execution carousel

The top area contains three panels with one spotlight at a time:

1. UP NEXT
2. NOW, spotlighted by default
3. IN PROGRESS / WAITING

The current date is centered prominently above the panels using the full weekday, abbreviated month, and ordinal day (for example, `Tuesday, Aug 18th`).

The spotlight is larger. When NOW is centered, both side panels remain fully visible and slightly shorter and narrower than the spotlight, and sit just below vertical center so their breathing room remains nearly balanced. The carousel is linear—UP NEXT → NOW → IN PROGRESS / WAITING—and never wraps an end panel around to the opposite side. The stage uses most of the available viewport height while preserving a small footer buffer around the compact navigation dots. Navigation works through adjacent panel clicks, the three compact dots, left/right arrow keys, and horizontal swipe.

## Week at a glance

The lower strip always shows Sunday through Saturday and replaces the old DONE panel. Whole-current-week commitments live only in NOW's purple THIS WEEK group rather than occupying a synthetic eighth day here.
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

- Focus Mode's + Add creates an unstarted task due today, so it appears immediately in NOW. Its storage section is inferred dynamically: use the WIP section with the most `~` tasks, falling back to the first WIP section and then the first SELECTED section; no section title is hard-coded.
- Task names are edited independently from due dates.
- Task titles and due-date controls remain directly editable in the left and right side panels; using them does not move that panel into the spotlight. Clicking the surrounding panel still brings it to center.
- The due-date clock opens an anchored menu with Today, Tomorrow, each remaining day this week, This week, Next week, whole-month shortcuts, one unified custom picker, and Clear. “Next week” assigns the entire next Sunday–Saturday week, not an exact Monday. The custom picker switches between Day, Week, and Month precision without presenting three competing controls. Choosing a value saves immediately.
- Status uses the four board states: queued, in progress, completed, and will not do.
- For completed or cancelled work, the completion stamp is authoritative for Focus placement. An old due date does not keep a task in NOW or place it under the wrong weekday.
- Marking an Up Next task in progress moves it to IN PROGRESS / WAITING after the status debounce. Its due period is preserved; due-today and overdue work remains in NOW.
- Status appearance updates immediately, but sorting and re-bucketing wait 1.5 seconds so repeated toggles do not move the control under the pointer.
- A change that moves a card uses the hold, flight, and landing animation. A change that leaves the card in the same rendered slot does not whisk.

## Priority marker

- Markdown tasks beginning with `- [status]` are low priority; `* [status]` is normal priority. The checkbox status and list-marker priority are independent.
- The parser and renderer preserve the marker through every edit and save.
- Low-priority tasks use a compact treatment throughout the app. UP NEXT, NOW, and IN PROGRESS / WAITING pull them into a compact LOW PRIORITY group at the bottom of each panel.
- Week at a glance preserves its day columns instead of adding nested groups; each low-priority row carries a small inline LOW badge.
- Priority controls update the Markdown list marker immediately: clicking LOW restores normal priority, while the subtle down-arrow marks a normal task low priority. The board's full editor exposes the same toggle.
- Priority never overrides NOW urgency rules or the date-based Week at a glance placement.

## Ordering

Existing day/group boundaries take precedence. Within a group, tasks use the main board's status order—completed, cancelled, in progress, then unstarted—and then cluster by source section.

## Theme

Focus Mode follows the toolbar light, dark, or automatic theme preference.
