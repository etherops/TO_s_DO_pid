# TODO
## UP NEXT
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
* [~] improve: Focus scheduling boundaries - Keep active current-week work on the right, later weeks in Up Next, and low-priority work in bottom groups

# ARCHIVE
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
