# Claude Handoff

## Current task completed

The archive behavior was reworked locally to match the new product contract:

- `src/components/KanbanBoard.vue`
  - Uses the canonical current-week label from `dateHelpers.js`.
  - Archives only `x` and `-` task cards.
  - Leaves the source section and unfinished cards in place.
  - Reuses an existing same-named current-week archive section when present.
  - Removed the old whole-section/leftovers implementation.
- `src/components/ArchiveConfirmationModal.vue`
  - Describes completed/will-not-do cards as the archive candidates.
  - Uses “Archive Completed Tasks” wording.
- `src/components/KanbanSection.vue`
  - Archive button tooltip now describes archiving completed tasks from the section.
- `src/utils/sectionHelpers.js`
  - Removed the obsolete `generateLeftoversSectionName` helper; the other section-menu helpers remain.
- `tests/cypress/e2e/archive-confirmation.cy.js`
  - Updated expectations for the new archive semantics.

## Product contract

See [`SPEC.md`](SPEC.md), especially “Archive behavior (triage/plan board)”. The short version is: archive terminal cards into a current-week archive section; do not move unfinished cards and do not create leftovers sections.

## Verification

Passed locally:

```bash
npm run build
npm test -- --run
```

Result: production build succeeded and all 78 unit tests passed.

The Cypress archive spec was updated but was not run in this handoff because it requires the separately running frontend/backend test environment.

## Git state

The implementation and these docs are intentionally uncommitted. Before committing, inspect:

```bash
git status --short
git diff --check
```

Do not restore the old `Leftovers from ...` behavior unless the product specification changes.

