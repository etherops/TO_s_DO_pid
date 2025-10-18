# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Development Notes

**ALWAYS ASSUME THE DEV SERVER IS RUNNING** - Never attempt to start the development server. The user runs it separately in another terminal.

## Common Development Commands

```bash
# Run development servers (frontend + backend concurrently)
npm run dev

# Run tests
npm run test:e2e        # Run Cypress tests headless
npm run test:e2e:open   # Open Cypress interactive runner

# Build for production
npm run build

# Run individual servers
npm run server  # Backend only on port 3001
```

## High-Level Architecture

This is a Vue.js 3 Kanban board application that intentionally uses plain text files as its database ("stupid simple" philosophy).

**Frontend Architecture:**
- Vue 3 with Composition API and `<script setup>` syntax
- State management via composables in `src/composables/`:
  - `useTodoData.js` - Central data management, API calls, and state
  - `useTaskDisplay.js` - Task filtering and display logic

**Backend Architecture:**
- Express server (`server.js`) with three endpoints:
  - `GET /api/files` - Lists .txt files in todo directory
  - `GET /api/todos` - Reads selected todo file
  - `POST /api/todos` - Saves todo file with automatic daily backups

**Todo File Format:**
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

**Column Categories:**
The application organizes H1 headers into four visual columns based on keywords:
- **TODO Column**: TODO, BACKLOG, INBOX, LATER, SOMEDAY, IDEAS, ICE
- **SELECTED Column**: SELECTED, HOLD, ONGOING
- **WIP Column**: WIP, SCHEDULED, IN PROGRESS, IN-PROGRESS, DOING, CURRENT, ACTIVE
- **DONE Column**: DONE, COMPLETE, COMPLETED, ARCHIVE, FINISHED, RESOLVED

These mappings are defined in `src/utils/TodoMdParser.js` in the `COLUMNSTACK_CATEGORIES` constant.

**Key Patterns:**
- Components use props-based data flow with minimal event emission
- Drag/drop updates are optimistic (UI first, then server sync)
- All parsing/rendering logic centralized in `TodoParser.js`
- Date handling utilities in `dateHelpers.js` for consistent formatting

## Testing Approach

**CRITICAL TESTING PRINCIPLE: 100% TEST SUCCESS RATE IS MANDATORY**
- Less than 100% test success is FAILURE and UNACCEPTABLE
- All tests must pass reliably, every time, in all execution modes
- Flaky tests are not acceptable - they must be fixed, not ignored
- "Good enough" or "mostly working" is never acceptable for test suites

E2E tests use Cypress with parallel execution support:
- `cypress/support/helpers.js` - Reusable test utilities with browser isolation
- `cypress/support/e2e.js` - Global hooks for unique file creation per test
- Parallel execution: `npm run test:e2e:parallel` - runs tests across 4 threads
- Each test gets unique `fixture-*.todo.md` file to prevent data conflicts
- Browser isolation ensures localStorage doesn't leak between parallel tests

Run commands:
```bash
npm run test:e2e          # Sequential execution
npm run test:e2e:parallel # Parallel execution (4 threads)
npx cypress run --spec "cypress/e2e/task-crud.cy.js"  # Single test
```

## Code Best Practices
See parent directory CLAUDE.md
