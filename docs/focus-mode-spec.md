# Focus Mode Product Spec

Focus Mode is the execution-oriented view of the current week. It is intentionally distinct from the main planning board: it surfaces what needs attention now while preserving enough weekly context to make date and status changes understandable.

## Source and routing

Focus Mode derives its tasks from SELECTED and WIP.

- A task is on deck when it is in WIP or due no later than the Saturday ending the current Sunday–Saturday week.
- NOW contains overdue and due-today work regardless of status, work completed or cancelled today, and undated queued WIP work.
- IN PROGRESS / QUEUED contains non-urgent active work and non-urgent dated queued work.
- UP NEXT / WAITING contains the remaining SELECTED work.
- A future-dated queued task appears both in IN PROGRESS / QUEUED and under its date in Week at a glance.

## Top execution carousel

The top area contains three panels with one spotlight at a time:

1. UP NEXT / WAITING
2. NOW, spotlighted by default
3. IN PROGRESS / QUEUED

The spotlight is larger. Both side panels remain fully visible and slightly shorter and narrower than the spotlight, and sit just below vertical center so their breathing room remains nearly balanced. The stage uses most of the available viewport height while preserving a small footer buffer around the compact navigation dots. Navigation works through panel clicks, the three compact dots, left/right arrow keys, and horizontal swipe.

## Week at a glance

The lower strip always shows Sunday through Saturday and replaces the old DONE panel.

- Every day is a contained, independently scrolling pane.
- Future days show scheduled tasks.
- Past days retain completed and cancelled tasks. When a terminal task has no due date, its completion stamp determines its day.
- Today is lightly muted and mirrors every task in NOW.
- The Today mini cards are display-only except for their due-date clock.
- Weekly cards omit the redundant due-date badge, use a hoverable one-letter section marker, collapse notes to an icon, and retain a clickable clock for date editing.

### Dock magnification

Moving the pointer across the week strip produces a Mac Dock-style magnification effect.

- The pane nearest the pointer is the strongly magnified center pane.
- Immediate neighbors grow modestly; the effect tapers off quickly beyond them.
- Fixed outer slots translate away from the magnified region instead of flex-reflowing.
- Magnified panes may escape the weekly container and stack in front of the upper carousel.
- Pane movement is one smooth transform animation, not separate width and position stages.
- An inverse-scaled content layer keeps typography and icons at their normal visual size while laying content out across the wider magnified area. The purpose of magnification is to reveal more title text and more tasks, not to enlarge type.
- Leaving the strip returns all panes to equal size and position.

## Task interactions

- Task names are edited independently from due dates.
- The due-date clock opens an anchored menu with Today, Tomorrow, each remaining day this week, Next week, Custom, and Clear. Choosing an option saves immediately.
- Status uses the four board states: queued, in progress, completed, and will not do.
- Status appearance updates immediately, but sorting and re-bucketing wait 1.5 seconds so repeated toggles do not move the control under the pointer.
- A change that moves a card uses the hold, flight, and landing animation. A change that leaves the card in the same rendered slot does not whisk.

## Ordering

Existing day/group boundaries take precedence. Within a group, tasks use the main board's status order—completed, cancelled, in progress, then unstarted—and then cluster by source section.

## Theme

Focus Mode follows the toolbar light, dark, or automatic theme preference.
