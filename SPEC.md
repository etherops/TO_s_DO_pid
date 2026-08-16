# TO_s_DO_pid Product Specification

This file records the current product contracts that are easy to regress during maintenance. The detailed Focus Mode layout and routing rules are in [`docs/focus-mode-spec.md`](docs/focus-mode-spec.md).

## Markdown task model

- `* [ ]` and `* [~]` are normal queued and in-progress tasks.
- `* [x]` is completed; `* [-]` is explicitly will-not-do.
- `- [status]` is the low-priority equivalent of the same status.
- A nonterminal task has one trailing due marker: `! Aug 13 2026`, `! Aug Week #2 2026`, or `! Aug 2026`.
- A terminal task has one exact completion marker: `| Aug 13 2026`.

## Archive behavior (triage/plan board)

Archiving is a terminal-task operation on an archivable WIP section. It must:

1. Identify only task cards whose status is completed (`x`) or will-not-do (`-`).
2. Create or reuse a small archive section in the chosen DONE/ARCHIVE column.
3. Name that section for the current Sunday–Saturday week using the canonical due-week format, for example `Aug Week #2 2026`.
4. Move the terminal cards into that archive section.
5. Leave the source section and every unfinished card (` ` or `~`) in place.
6. Never create a `Leftovers from ...` section and never move the entire source section.

If the source section has no completed or will-not-do cards, archiving makes no task movement. The confirmation UI should say that there is nothing to archive.

The archive destination remains selectable when more than one DONE/ARCHIVE file column exists. If no DONE column exists, the app may create/use `ARCHIVE` as the DONE destination.

## Review mode (calendar retrospective)

Review is a read-only, full-screen calendar of what actually happened. It reads
every column in the file, including ARCHIVE, and never mutates tasks.

1. Each task is placed on the calendar by its authoritative date: the completion
   marker (`| Aug 13 2026`) for terminal tasks, the due marker for open ones.
2. The grid is one calendar month, padded out to whole Sunday–Saturday weeks.
   Padding days render their work but are excluded from every total.
3. Above the grid sits a January–December stacked bar chart of the calendar year,
   spanning exactly the grid's width. Clicking a bar moves the grid to that month
   and highlights the bar; the chart follows the grid, and its own arrows move it
   a year at a time. Month bars bucket by month, which can hold week and month due
   periods honestly: a month period goes to its month and a week period to the
   month holding four of its days.
4. Week and month due periods have no honest single-day slot, so they are counted
   in the totals but not dropped onto a day of the grid.
5. Tasks with no authoritative date are collected, not discarded.
6. Overdue counts mean "past due and still open as of today", independent of the
   period being viewed.

## Verification expectations

Changes must preserve the existing Vue/Vite architecture, plain-markdown persistence, undo/history behavior, and the 100% unit-test requirement documented in `CLAUDE.md`.

