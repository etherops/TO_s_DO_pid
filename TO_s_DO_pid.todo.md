# TODO
## Quick Features
* [ ] due date no parens
* [ ] VIEW - sortable tabs
* [ ] "add task" should be a an empty row ready
* [ ] Backup rotation
* [ ] FEATURE: "Today, Tomorrow" as due dates
* [ ] counts in tabs
* [ ] shift click move bulk items
* [ ] can't archive a section with incomplete tasks
* [ ] right click - move task to ...
* [ ] due date allows: today, tomorrow, yesterday - mainly for testing
* [ ] double click to edit, focus tittle

## Fun Stuff
* [ ] Celebration easter egg (have it applaud when you click or something like that)

## Bugs
* [ ] bug: hover preview is showing for full title when the title isn't overflow=true (bug: purge "visualColumn", correctly name column/columnstack)
* [ ] bug: visual - confrim delete needs higher z-index
* [ ] BUG: Compact "confirm delete" is truncated vertically

## Bigger Features
* [ ] DYNAMIC: dynamic re-render/watch on file change
* [ ] SUBTASKS: Support subtasks
* [ ] LARGE: iPhone app
* [ ] LARGE: Host on Lightwire
* [ ] Rebrand KindaBan
* [ ] VIEW - diff revisions !!(May 26)
* [ ] SERVER: git push integration
* [ ] feature: add the preceeding folder name in custom tabs
* [ ] DELETE - undo

# WIP
### In Progress
* [~] fancier archive button (when you click archive, show a modal confirmation askign if the user is sure indicating it will move the current section to the archive, but create a new section and move any undone cards into that section in WIP.  It should then create a new section, put it in the same slot as the existing archiving section, name is "Week: {Current Month} {Current Week of Month .e.g 1,2,3,4)".  It will move all unstarted and in progress tasks into that section.)
* [ ] custom file again, or multiple custom directories
* [ ] too much vertical whitespace in task cards

# ARCHIVE
### Just done
* [x] collapsible/hidable DONE | Sun, June 8
* [x] save with a note puts in progress | Sat, June 7
* [x] parallelize tests | Sat, June 7
* [x] BOTH: auto append date completed DD/MM/YY on complete and set to done | Sat, June 7
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