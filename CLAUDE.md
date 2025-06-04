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
# LARGE SECTION
Task description
Task with note (this is a note)
Task with due date !!(2024-12-25)
[~] Task in progress
[x] Completed task
[-] Cancelled task

### SMALL SECTION
More tasks...

# ARCHIVE
[x] Old completed tasks (hidden by default)
```

**Key Patterns:**
- Components use props-based data flow with minimal event emission
- Drag/drop updates are optimistic (UI first, then server sync)
- All parsing/rendering logic centralized in `TodoParser.js`
- Date handling utilities in `dateHelpers.js` for consistent formatting

## Testing Approach

E2E tests use Cypress with custom helpers in `cypress/support/`:
- `test-base.js` - Common setup/teardown for file isolation
- `helpers.js` - Reusable test utilities

Run single test file:
```bash
npx cypress run --spec "cypress/e2e/task-crud.cy.js"
```

## Code Best Practices
See parent directory CLAUDE.md
