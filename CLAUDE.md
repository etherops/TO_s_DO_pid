# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Development Notes

**ALWAYS ASSUME THE DEV SERVER IS RUNNING** — Never attempt to start the development server. The user runs it separately in another terminal. Frontend is Vite on port **8081**; backend is Express on port **3001**.

## Common Development Commands

```bash
# Run frontend + backend concurrently (vite + nodemon)
npm run dev

# Backend only
npm run server

# Build for production
npm run build

# E2E tests (Cypress — specs under tests/cypress/e2e/)
npm run test:e2e           # Sequential, headless
npm run test:e2e:multi     # Parallel across 4 threads (scripts/run-parallel-tests.js)
npm run test:e2e:open      # Interactive runner
npx cypress run --spec "tests/cypress/e2e/task-crud.cy.js"   # Single spec

# Unit tests (Vitest — specs under tests/unit/)
npm test
```

## High-Level Architecture

A Vue 3 Kanban board whose "database" is one or more plain markdown files. Everything else is built around that constraint ("stupid simple").

### Frontend (`src/`)

- Vue 3, Composition API, `<script setup>`.
- Entry: `main.js` → `App.vue`.
- State composables (`src/composables/`):
  - `useTodoData.js` — central data: axios calls to the backend, WebSocket client, selected-file persistence in `localStorage`, checksum-based echo suppression on file-changed events.
  - `useTaskDisplay.js` — task filtering and display helpers.
  - `useTaskSelection.js` — multi-select set of task ids and click handler (normal click, cmd/ctrl click, shift click).
- Components (`src/components/`):
  - `FileTabBar.vue` — tabs, view-mode buttons (Triage/Plan/Focus/Review), undo/redo, History button. The full-screen modes have no close button of their own; the view-mode buttons are the only way in and out.
  - `KanbanBoard.vue` — renders the five column stacks, owns drag/drop glue, date-picker, archive-confirm modal, context menu, multi-drag handler. Drawer presets per view mode: `triage` (expand TODO/PROJECTS, collapse WIP/DONE) and `plan` (expand SELECTED/WIP, collapse the rest).
  - `ReviewMode.vue` — full-screen Review retrospective: a month calendar of what was completed, dropped, and is still due, topped by a clickable Jan–Dec bar chart of its calendar year. The chart spans the calendar's width with the stat tiles in the rail-width slot beside it. The rail carries the selected day's detail, an 8-week throughput trend, section ranking, and still-overdue work, each card shrinking with its own internal scroll so no card header falls below the fold. Read-only.
  - `FocusMode.vue` — full-screen Focus execution view. Its product behavior and interaction contract live in `docs/focus-mode-spec.md`; read that spec before changing Focus UX or routing.
  - `KanbanColumn.vue` — single column stack (TODO/PROJECTS/SELECTED/WIP/DONE); tri-state collapse caret; passes multi-drag through.
  - `KanbanSection.vue` — an H2/H3 section inside a column; hosts `vuedraggable`; handles multi-drag stacking (clones `.task-card.selected` into the drag wrapper, hides originals with `.multi-drag-hidden`).
  - `TaskCard.vue` — individual task card; inline edit, status, due date, notes, completion date.
  - `ContextMenu.vue` — right-click menu with a column → section submenu for "Move to" (also used by multi-select bulk move).
  - `ArchiveConfirmationModal.vue` — confirmation when dragging a section into a DONE/ARCHIVE column.
  - `DatePicker.vue`, `CompactDatePicker.vue` — due-date pickers.
  - `HistoryPanel.vue` — per-tab version history drawer: lists daily backups with date + time, shows an LCS-based unified diff vs. current file, supports full-version restore and per-line hover restore.
- Utils (`src/utils/`):
  - `TodoMdParser.js` — `parseTodoMdFile` / `renderTodoMdFile`, and `COLUMNSTACK_CATEGORIES` (H1 → column-stack keyword mapping).
  - `focusModeHelpers.js` — pure derivation for Focus mode (`deriveFocusModel`, `findActiveWipSection`, `findQuickAddTarget`).
  - `reviewModeHelpers.js` — pure derivation for Review mode (`deriveReviewModel`, `deriveCalendarYearBars`, `deriveWeeklyTrend`, `anchorForTask`, `shiftAnchor`).
  - `dateHelpers.js`, `completionDateHelpers.js` — date parsing/formatting.
  - `sectionHelpers.js`, `sortHelpers.js`, `taskTextHelpers.js` — section/task manipulation helpers.

### Backend (`server.js`)

Express + `ws`, single file, ~440 lines. Endpoints:

- `GET  /api/files` — lists `.todo.md` files from the server directory, directories in `stupid.yaml`, and individual files in `stupid.yaml`.
- `GET  /api/todos?path=<filePath>` — read a todo file.
- `POST /api/todos` — body `{ content, path }`. Writes the file and snapshots a backup (first write of the day only).
- `GET  /api/history?path=<filePath>` — lists backup versions with `{ date, filename, size, mtime }`, newest first.
- `GET  /api/history/version?path=<filePath>&date=YYYY-MM-DD` — returns the content of that snapshot.
- **WebSocket** on the same server: clients send `{ type: 'watch', filePath }`; server `fs.watch`es each watched file and pushes `{ type: 'fileChanged', filePath, checksum }` on change. Clients compare the checksum against their own rendered content to skip echoes from their own saves.

### Todo File Format

```
# TODO
Task description
Task with note (this is a note)
Task with due date !!(2024-12-25)
[~] Task in progress
[x] Completed task
[-] Cancelled task

# SELECTED
Tasks ready to work on

### SMALL SECTION
More tasks in small sections...

# WIP
Tasks currently being worked on

# ARCHIVE
[x] Old completed tasks (hidden by default)
```

- H1 (`#`) — column header (maps to one of TODO/PROJECTS/SELECTED/WIP/DONE column stacks).
- H2 (`##`) — large section.
- H3 (`###`) — small section (archivable as a whole).
- Unparsable lines survive as `raw-text` items and can be surfaced via the raw-text toggle.

### Column Categories

H1 headers map to the five visual column stacks by substring match (uppercased):

- **TODO**: TODO, BACKLOG, INBOX, LATER, SOMEDAY, IDEAS, ICE
- **PROJECTS**: PROJECTS, PROJECT
- **SELECTED**: SELECTED, HOLD, ONGOING
- **WIP**: WIP, SCHEDULED, IN PROGRESS, IN-PROGRESS, DOING, CURRENT, ACTIVE
- **DONE**: DONE, COMPLETE, COMPLETED, ARCHIVE, FINISHED, RESOLVED

Defined in `src/utils/TodoMdParser.js` (`COLUMNSTACK_CATEGORIES`).

### Backups and History

Backups are per-file, once per day (first write of the day):

```
<file-dir>/.TO_s_DO_pid.bak/<filename-without-ext>/<filename>.bak.YYYY-MM-DD.<ext>
```

The HistoryPanel uses `GET /api/history` and `GET /api/history/version` to surface snapshots. Diff is a plain LCS of the rendered current file vs. the snapshot, collapsed to 3 lines of context around each change. Line-level restore re-inserts a removed line at the neighbourhood anchored by the closest preceding `equal` op in the diff — i.e. just after its nearest unchanged neighbour in the current file.

### Key Patterns

- Components use props-down / events-up; `KanbanBoard` is the orchestrator.
- Drag/drop updates are optimistic (UI first, save follows).
- All parse/render logic lives in `TodoMdParser.js`.
- Date logic lives in `dateHelpers.js` / `completionDateHelpers.js`.
- Selected-file persistence is in `localStorage` (`selectedTodoFilePath`); view mode is in `localStorage.viewMode` (`normal` / `triage` / `plan` / `focus` / `review`).
- WebSocket client uses a checksum comparison against its own `renderTodoMdFile` output to avoid reload storms on self-initiated saves.

## Testing Approach

**CRITICAL TESTING PRINCIPLE: 100% TEST SUCCESS RATE IS MANDATORY**
- Less than 100% is FAILURE and UNACCEPTABLE.
- Tests must pass reliably, every time, in every execution mode.
- Flaky tests are not acceptable — they must be fixed, not ignored.

### E2E (Cypress)

- Spec pattern: `tests/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}` (see `cypress.config.js`).
- Support + helpers: `tests/cypress/support/e2e.js`, `tests/cypress/support/helpers.js`.
- Each test creates its own `fixture-*.todo.md` file via a Cypress `task`; fixtures are cleaned up at the end of the test. Browser isolation (unique `CYPRESS_PROFILE_ID`) keeps localStorage from leaking between parallel runs.
- Cypress `baseUrl` is `http://localhost:8081` — the frontend must be running.

```bash
npm run test:e2e          # sequential
npm run test:e2e:multi    # parallel across 4 threads
npx cypress run --spec "tests/cypress/e2e/task-crud.cy.js"
```

Notes on known-tricky areas:
- `@4tw/cypress-drag-drop` cannot simulate multi-drag when multiple tasks have `.selected` (Vue re-renders detach the dragged element). Multi-select operations are therefore covered via the context-menu "Move to" path, which hits the same `moveTasksToSection` logic that drag-and-drop multi-drag uses.
- After structural DOM changes (e.g. deleting a duplicate section), scope late assertions to the specific column/section rather than `cy.get('.section').last()` to avoid stale-element matches.

### Unit (Vitest)

- Spec pattern: `tests/unit/**/*.test.js`.
- `happy-dom` environment.

```bash
npm test
```

## Git

- Commit messages are a single line.
- Do not add `Co-Authored-By` or any attribution lines.

## Code Best Practices

See parent directory `CLAUDE.md` for style rules (SOLID/DRY, guard clauses, 120-char lines, self-documenting names, testing philosophy).
