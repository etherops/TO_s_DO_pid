# Claude Handoff

## User's closing note

The user is very disappointed with this session's assistance and is going back to
Codex.

## What shipped

Both commits are on `main` and pushed.

- `89b5746` — Add Review mode calendar retrospective (#5)
- `1ade5ac` — Rework archive to move completed tasks into the current week

The archive rework was inherited from the previous session's handoff and was
committed unchanged; everything else below was built this session.

## Review mode

A fourth view mode (`localStorage.viewMode === 'review'`), reachable from the
Review button in `FileTabBar`. It is read-only: Focus and the board keep
ownership of task mutation.

### Files

- `src/utils/reviewModeHelpers.js` — pure derivation.
  - `deriveReviewModel(todoData, { anchor, today })` — one calendar month padded
    to whole Sunday–Saturday weeks, per-day buckets, totals, section ranking.
  - `deriveCalendarYearBars(todoData, { year, today })` — Jan–Dec month buckets.
  - `deriveWeeklyTrend(todoData, { anchor, weeks })` — trailing-week sparkline.
  - `anchorForTask`, `shiftAnchor`, `periodLabelFor`, `periodSubLabelFor`,
    `dayKey`, `MONTHS_IN_YEAR`.
- `src/components/ReviewMode.vue` — the whole view.
- `tests/unit/utils/reviewModeHelpers.test.js` — 31 tests.
- `src/App.vue`, `src/components/FileTabBar.vue` — routing and the mode button.
- `src/components/FocusMode.vue` — close button removed (see below).

### Model rules

1. Every task is placed by its authoritative date: the completion marker
   (`| Aug 13 2026`) for terminal tasks, the due marker for anything still open.
   Both may be absent, which is reported rather than hidden.
2. The grid is one calendar month padded out to whole weeks. Padding days render
   their work but are excluded from every total.
3. Week and month due periods have no honest single-day slot, so they count
   toward the totals without being dropped onto a day of the grid. The year bars
   bucket by month and can hold them honestly — a month period goes to its
   month, a week period to the month holding four of its days.
4. Tasks with no date are collected in `undated`, not discarded.
5. `overdueOpen` means past due and still open as of today, independent of the
   month on screen.

### Layout

- **Header** — the Jan–Dec bar chart (stacked completed / will-not-do /
  still-open), with the date controls hard right: two self-labelling steppers
  (`‹ 2026 ›`, `‹ August ›`) plus `This Month`, and the colour-keyed year totals
  underneath, whose swatches double as the chart's legend.
- **Stats row** — six metric tiles spanning the calendar's width.
- **Calendar** — day cells with a stacked meter and count chips.
- **Rail (320px)** — Throughput (8-week sparkline), Where work landed, and a
  pane that shows the selected day's detail or, with no day selected, the whole
  month's completions grouped by canonical week label then by day.
- **Left gutter** — each band names itself in stacked vertical type: `2026`,
  `STATS`, `AUGUST`. One shared 22px gutter width keeps the bars, tiles and
  calendar on a single left edge.

### Interaction

- One `anchor` ref drives both the calendar and the chart, so they cannot
  disagree: clicking a bar moves the calendar to that month and pulls the chart
  to its year; stepping the year carries the calendar to the same month of that
  year.
- Clicking a day opens its detail in the rail's bottom pane; clicking again
  closes it. The pane is last in the rail and the standing cards are `flex:
  none`, so opening or closing a day never moves anything above it.

## Behaviour changed outside Review

- The `✕` close button was removed from both Focus and Review. The view-mode
  buttons in the tab bar are now the only way in and out of the full-screen
  modes.

## Verification

```bash
npm test -- --run   # 109/109 passing
npm run build       # clean
```

Cypress was not run this session; the e2e suite needs the frontend and backend
running.

## Notes for whoever picks this up

- Node 14 is first on `PATH` and is too old for Vitest. Use
  `~/.nvm/versions/node/v22.23.2/bin` when running `npm test`.
- `docs/focus-mode-spec.md` owns Focus's contract; `SPEC.md` now carries the
  Review mode contract alongside the archive one.
- `model.spanning` is still computed and still feeds the "Still open" count and
  the completion-rate denominator, even though its rail card was removed.
