# TODO
## UP NEXT
* [ ] improve: Plan/Triage subtask design - Rework the broken non-Focus subtask editor layout and styling to match the app's design (next task)
* [ ] bug - complete task reloads whole page
* [ ] SEARCH
* [ ] BUG: non-destructive subtasks
* [ ] small - prepare the example todo file for open-source publishing
* [ ] improve - expand the README with clearer instructions for using todo files

## SUGAR
* [ ] drag to collapsed section temporarily expands the section
* [ ] COLLAPSE: expand on hover
* [ ] Collapse for ALL tasks not just DONE
* [ ] SUGAR: sortable todo-list selector entries
* [ ] ADD TASK: "add task" should be a an empty row ready (and create new section focuses there after saving title)
* [ ] SUGAR: Hyperlinks work
* [ ] EFFECT: collapse furls and unfurls like a deck of cards

## Fun Stuff
* [ ] Celebration easter egg (have it applaud when you click or something like that)

## Bugs
* [ ] bug: hover preview is showing for full title when the title isn't overflow=true (bug: purge "visualColumn", correctly name column/columnstack)
* [ ] bug: visual - confrim delete needs higher z-index
* [ ] BUG: notes should only put in progress in WIP col

## Bigger Features
* [ ] CONSOLIDATED board (show WIP section for all lists)
* [ ] SUBTASKS: Support subtasks
* [ ] LARGE: iPhone app
* [ ] LARGE: Host on Lightwire
* [ ] Rebrand KindaBan
* [ ] SERVER: git push integration
* [ ] BACKUP: Backup rotation

# WIP
### In Progress
* [~] feature: Calendar day task lists - Rename Review to Calendar and show compact independently scrollable task lists in each day, preserving date placement and read-only behavior (Nov 2: 204 unit tests, build and final 12 Calendar/navigation browser checks pass; independent live-browser acceptance PASS including final themed scrollbar and shared blocked glyph; local only, not committed or deployed)
* [~] feature: Outline planning workspace - Unify Triage and Plan into outline-only Plan with compact SELECTED/WIP columns, section counts and schedule; preserve Markdown, existing edits and Focus routing (Nov 2: redundant Plan title/subtitle and File Outline label removed; accessible navigation retained with 6px top gap; 201 unit tests, build and 13 Plan/workspace/archive browser checks pass; independent live-browser acceptance PASS for spacing/label cleanup only; full-suite failures tracked below; local only, not committed or deployed)
* [~] feature: Raw Markdown view - Add Raw after Review, read-only by default with explicit editing, exact-text saves, stale-file conflict protection and unsaved-draft navigation protection (Nov 1: exact-source saving, read-only entry and 409 conflict protection pass browser checks; local only, not committed or deployed)
* [~] bugfix: Parent task progress sorting - Sort unstarted parents with subtask progress alongside active work in Plan/Triage while preserving explicit parent statuses, saved data and Focus routing (Nov 1: 187 unit tests and build pass; Plan/Triage sorting 2/2 and existing sorting 10/10 browser checks pass; independent browser acceptance PASS; not committed or deployed)
* [~] bugfix: Stable Focus date arrows - Keep previous and next arrows fixed as date text changes, with the date centered on the same line (Nov 1: 176 unit tests, build and 3 layout browser tests pass; independent browser acceptance PASS at 768, 1280 and 2560px; unrelated full-suite failures tracked in Release browser checks; not committed or deployed)
* [~] tweak: Active weekly Focus routing - Return in-progress whole-current-week tasks and subtasks to NOW alongside unstarted weekly work (Oct 21 direction supersedes the previous right-pane routing)
* [~] feature: Blocked status - Support [!] tasks and subtasks with a small red inner octagon inside the usual square checkbox and route blocked work to In Progress / Parked in Focus (176 unit tests and build pass; dedicated Blocked, weekly-routing and final status-cycle browser checks pass; independent browser review confirms glyph and routing; full browser suite remains 171 passed and 23 failed on Oct 21, so release acceptance is not complete)
* [~] bugfix: Focus status reorder flicker - Keep cards visible when status changes reorder within the same panel; reserve flight and arrival effects for moves between lists
* [~] bugfix: Parent completion override - Allow completing tasks with unfinished subtasks in Focus and Plan/Triage without changing child statuses or dates
* [~] improve: Archive by completion week - Require confirmation with create-versus-append details, guard repeat submissions, reuse equivalent week headings, and expose Archive navigation that reopens hidden sections (Nov 2: preview weeks inside WIP above regular sections; 205 unit tests, build and 6 archive/workspace browser checks pass; independent full code/UX acceptance PASS; Nov 1: build and 201 unit tests pass; all 3 archive browser checks now pass, including reopening hidden weeks; existing user data untouched; local only, not committed or deployed)
* [~] tweak: Focus priority arrows - Show separate side-by-side up and down buttons for normal priority; preserve debounce, child-detachment confirmation and board controls
* [~] feature: Subtask right-click deletion - Offer confirmed Delete subtask in nested editors and Focus cards; save immediately while preserving parents and siblings
* [~] improve: Selected Focus routing - Park only started (~) SELECTED-column tasks regardless of week assignment; keep today and overdue in NOW, unstarted placement unchanged, and retain initiative and subtask rules
* [~] improve: Subtask autosave - Save subtask titles and additions on blur or Enter and status, dates, removal and order immediately; keep parent fields independent and preserve hidden metadata
* [~] bugfix: Subtask completion badges - Show and edit completion dates in the nested editor with Today, Yesterday, custom day and Clear; save immediately without saving unrelated parent drafts
* [~] feature: Normal task subtasks - Allow normal tasks to own subtasks with a note-first editor, optional Add subtasks control and top-aligned editor headings, preserve children between normal and high priority, and offer a searchable regular-parent option after initiatives in Convert to subtask
* [~] bugfix: Quick-add day calendar - Use the native date input instead of invalid day input; preserve immediate save and week/month pickers
* [~] tweak: Initiative priority arrow - Use a gray down arrow that preserves subtasks at normal priority; require a themed confirmation with read-only dated child cards before detaching at low priority
* [~] improve: Subtask status counts - Replace the parent status symbol with a seamless fixed 4x4 proportional status grid inside a neutral border, very light gray unstarted tiles with centered dots at top and original green done at bottom; preserve original yellow and cancelled colors, separate N subtasks edit badge and existing status-click behavior (review fix: square hosts prevent clipping the bottom done row)
* [~] tweak: Initiative vertical expansion - Expand Initiatives vertically without horizontal magnification; keep its panel and task cards opaque when overlapping Up Next
* [~] feature: Editable Focus dates - Allow editing on any displayed date with date-relative scheduling and real-file persistence
* [~] tweak: Focus drag handle position - Keep handles outside the right card edge with a prominent two-column, three-row dot grip, clearer spacing and a wider grab area
* [~] bugfix: Regular-task editor layout - Restore full-width Focus notes and equal Save/Cancel buttons; retain the original notes/date arrangement in Plan/Triage when subtasks are absent
* [~] bugfix: Release browser checks - Repair archive naming/menu, obsolete completion-editor and Focus expectations, status-cycle assertions, detached-DOM checks, and fixture file-selection failures (full suite: 141 passed, 29 failed, 3 skipped on Sep 21 2026; Sep 28 rerun: 30 failures including duplicate-section new-task input; isolated legacy Focus: 15 passed, 19 failed; new started-only SELECTED routing check passes; Oct 2 full run: 158 passed, 34 failed, archive expectations corrected and 9/9 archive checks pass on rerun, remaining failures outside archive selection; Oct 15 full run: 162 passed, 29 failed, 2 skipped; active-week routing regression passes, legacy Focus remains 15 passed and 19 failed; Nov 1 full run: 166 passed, 30 failed, 1 skipped, including a new date-layout setup failure corrected with 3/3 passing on rerun; existing 768px toolbar status-summary overlap blocks mode switching, other failures remain in legacy Focus, completion editors, status timing, archive and fixture selection; Nov 1 parent-sort run completed after restarting a stalled runner: 26 pre-existing failures remain, independently confirmed against the prior run; new sorting checks pass; Nov 2 full outline run: 86 passed, 106 failed, 4 skipped across 44 specs; failures include obsolete all-columns/drawer navigation expectations, existing Focus cases and fixture sync failures; new Plan/workspace/archive checks pass 13/13; release remains blocked; Nov 2 Calendar parallel run: 84 passed, 113 failed, 1 skipped across 45 specs; Calendar checks pass, Plan fixture setup flaked under parallel load but all 12 Calendar/Plan/workspace checks pass on isolated rerun; broader release remains blocked; Nov 2 final archive-layout run: 87 passed, 111 failed, no skips across 45 specs; full patch code/UX acceptance PASS, but release remains not test-clean)
* [~] improve: Partial-start status cycle - Complete settled in-progress tasks on the first click and retain the chosen cycle until debounce settles
* [~] feature: Focus overdue rollover - Move overdue unfinished Focus tasks to today without shifting the NOW header

# ARCHIVE
### Sep Week #4 2026
* [x] bugfix: File selector overlay - Keep list options above board content so file switching and browser test setup remain clickable | Sep 21 2026
* [x] bugfix: Subtask title spaces - Preserve untrimmed typing drafts so spaces are not erased on every keystroke | Sep 21 2026
* [x] bugfix: Weekly priority control - Center the standard priority arrow and remove the empty badge border in magnified day cards | Sep 21 2026
* [x] feature: Convert to subtask - Add a searchable initiative parent picker to Focus right-click actions and restrict new subtasks to initiatives while preserving existing children (consistent readable menu text across actions, columns, sections, and parent choices) | Sep 21 2026
* [x] feature: Subtask week schedule - Show dated subtasks on their assigned day in Week at a Glance with parent labels | Sep 21 2026
* [x] tweak: Focus weekly card fill - Use the normal neutral card background instead of blue for whole-week tasks | Sep 21 2026
* [x] improve: Subtask parent context - Give NOW one Subtasks group per main date section, show the full parent title when editing, and allow detaching into a standalone task in the same section | Sep 21 2026
* [x] improve: Focus drag handles - Place compact 3x3-dot handles outside the left card edge across all panels and week-at-a-glance, omit subtask filler markers, disable where no sorting peer exists, and restore blank-card click to edit | Sep 21 2026
* [x] feature: Nested subtasks - Support indented minus subtasks with a count badge and preservation of unsupported content (two-thirds subtasks beside one-third notes in task editors; hidden notes preserved, compact day/week/month date picker and qualified Focus routing with parent labels, manual sorting, always-empty trailing row, completion guard) | Sep 21 2026
* [x] feature: Initiatives - Use plus-marked high-priority tasks, a three-level priority toggle, and a Focus initiatives panel (sortable within source sections; content-sized up to 4.5 rows then scrolls, hidden when empty; debounce priority and status regrouping; date edits stay in place) | Sep 21 2026
* [x] improve: Focus scheduling boundaries - Combine unstarted and active whole-current-week work in NOW, keep later weeks in Up Next and low-priority work in bottom groups, and distinguish this-month active and parked work | Sep 21 2026
* [x] feature: Focus note editing - Add, edit, and remove task notes in Focus; Enter saves and Shift+Enter adds a newline | Sep 21 2026
* [x] feature: Focus week preview - Navigate Focus by day with a header date picker, read-only editing protection, and no future overdue clutter | Sep 21 2026

### Sep Week #3 2026
* [x] bugfix: Focus column chooser order - Match the Plan/Triage left-to-right stack order while preserving file order within each stack | Sep 13 2026
* [x] tweak: Focus weekly low-priority grouping - Put low-priority whole-week tasks in a subgroup at the bottom of NOW's This Week group | Sep 13 2026

### Sep Week #2 2026
* [x] improve: Status toggle order - Cycle not started, done, in progress, and will not do everywhere | Sep 8 2026
* [x] feature: Focus task context menu - Add advanced card actions beginning with confirmed deletion | Sep 8 2026
* [x] feature: Focus card sorting - Reorder cards within the same Focus group and source section while preserving Markdown structure | Sep 8 2026

### Aug Week #3 2026
* [x] improve - explain Focus panel membership rules from each panel title | Aug 21 2026
* [x] improve - merge the legacy project tracker into canonical TODO.md and keep it app-discoverable | Aug 20 2026
* [x] improve - show Focus task notes from a compact indicator in an immediate wide tooltip | Aug 20 2026
* [x] bugfix - keep note-tooltip hover time from magnifying side panes | Aug 20 2026
* [x] bugfix - save a titled Focus quick-add when its due date is selected | Aug 19 2026
* [x] improve - preview each next status with checkbox highlight colors in Focus mode | Aug 19 2026
* [x] improve - add a centered on-theme current-date heading in Focus mode | Aug 18 2026
* [x] improve - tune Review mode's completion palette and shared mode-tab fills | Aug 18 2026
* [x] improve - unify the visual design across Triage, Plan, Focus, and Review | Aug 18 2026
* [x] improve - restore compact low-priority cards and Focus-style in-progress indicators on the main board | Aug 18 2026
* [x] small - remove the Classic board-style toggle and keep the unified presentation | Aug 18 2026
* [x] improve - archive terminal tasks into a section named for the current week | Aug 16 2026
* [x] feature - add the Review calendar retrospective mode | Aug 16 2026

### Aug Week #2 2026
* [x] feature - add the Focus week carousel with adjacent-week previews | Aug 15 2026
* [x] improve - direct Focus whisk-away transitions toward their destinations | Aug 15 2026
* [x] feature - edit historical completion dates in Focus and board modes | Aug 15 2026
* [x] improve - summarize the current day in Week at a Glance | Aug 14 2026
* [x] bugfix - prevent false vertical scrolling in weekday panes | Aug 13 2026
* [x] feature - add Dock-style magnification to Focus panes | Aug 13 2026
* [x] improve - move current-week commitments into NOW | Aug 13 2026
* [x] feature - add the unified quick date picker to Focus task creation | Aug 13 2026
* [x] improve - replace todo tabs with a counted custom file selector | Aug 13 2026
* [x] improve - refine Focus routing, scheduling, and due-date alerts | Aug 13 2026
* [x] improve - order Up Next groups by their month timeline | Aug 13 2026
* [x] feature - unify due and completion lifecycle date syntax and migrate existing data | Aug 13 2026

### May Week #4 2026
* [x] feature - add persistent undo/redo history | May 29 2026

### Apr Week #4 2026
* [x] feature - add revision history with diff and restore | Apr 24 2026

### Just done
* [x] small: autosort on drag/drop to partial collapse | Jan 27 2026
* [x] VIEW: COLLAPSE - separate Full Collapse caret from the other two modes | Jan 29 2026
* [x] BUG: right-click context menus and submenus remain visible near the page fold | Mar 6 2026
* [x] BUG: right click move to broken | Jul 17 2025
* [x] select, multi select, move to section
* [x] BUG: delete sections w/ same name! | Jun 26 2025
* [x] V-BUG: too much vertical whitespace in task cards | Jun 26 2025
* [x] auto poll/websocket server (take server and backup immedietely if there is conflict) | Jun 24 2025
* [x] md5 sum check before writing | Jun 24 2025
* [x] FOCUS MODE (TODO and ARCHIVE slide to the side, WIP pops twice as wide 2 columns.  Automatically?) | Jun 20 2025
* [x] custom file again, or multiple custom directories | Jun 10 2025
* [x] fancier archive button".  It will move all unstarted and in progress tasks into that section.) | Jun 8 2025
* [x] collapsible/hidable DONE | Jun 8 2025
* [x] save with a note puts in progress | Jun 7 2025
* [x] parallelize tests | Jun 7 2025
* [x] BOTH: auto append date completed DD/MM/YY on complete and set to done | Jun 7 2025
* [x] collase in archive by default, put badge at top in archive by default | Jun 9 2025
* [x] VIEW: Auto sort tasks by status
* [x] display note preview inline
* [x] details is a pop up instead of "expand card"
* [x] bug: purge "visualColumn", correctly name column/columnstack
* [x] hide raw text by default
* [x] purge existing on-ice feature, but bring it back
* [x] refactor column, fileColumn -> columnStack, column
* [x] PARSE: non destructive write-backj aka save unparsed lines
* [x] drop and drop conflation between task/section
* [x] refactor: move creating visual column in parser
* [x] get rid of section.column and section.filecolumn?
* [x] re-order sections
* [x] show different sections in TODO column
* [x] bug: new sections get inserted above column TODO in file
* [x] MARKDOWN.1: archive - dymanic archive picker if multiple
* [x] purge drag& drop archive code
* [x] gracefully handle todo file missing
* [x] MARKDOWN: 3# = column, 1# = section
* [x] consolidated date picker/edit mode
* [x] right left day arrows for date picker
* [x] debug edit mode
* [x] add task/section improvements
* [x] 4-th check box state a - dash incomplete grey
* [x] bug: enter/tab in edit mode
* [x] re-add notes, TESTS
* [x] bug: file backups today was in UTC instead of local
* [x] modularize vue components
* [x] "archive week" instead of janky d&d
* [x] remove section archive d&d for archive button
* [x] Script setup and composition API
* [x] CUSTOM todo source folder in .env config
* [x] BUG: custom tabs is BROKEN CRAP!
* [x] SECTION - create/delete
* [x] feature: clock date picker to change due date
* [x] flash red overdue [May 16]
* [x] VIEW: Truncated task, expand item with wrapping on hover instead of tool tip
* [x] kill ghost DONE
* [x] Larger edit box
* [x] due date `\!\! May 12th` on items that pops/alert visually
* [x] Support (Parenthetical) Notes
* [x] pre-archive ghost-archive complete items in WIP
* [x] parenthesis doesn't display, because notes
* [x] VIEW: remove custom tabs
* [x] TODOs... tabs instead of file drop down
* [x] favicon test
* [x] compactiffy display
* [x] Improve file picker
* [x] File backup before writing
