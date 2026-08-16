import { describe, it, expect } from 'vitest';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';
import {
  anchorForTask,
  dayKey,
  deriveCalendarYearBars,
  deriveReviewModel,
  deriveWeeklyTrend,
  periodLabelFor,
  shiftAnchor
} from '../../../src/utils/reviewModeHelpers';

// Wednesday 12 August 2026, so "this week" runs Sun 9th - Sat 15th
const WEDNESDAY = new Date(2026, 7, 12, 10, 0, 0);

const fixture = `# SELECTED
## Plans
* [ ] Due Friday this week ! Aug 14 2026
* [~] Started, due today ! Aug 12 2026
* [ ] Overdue and open ! Aug 5 2026
* [ ] Due next month ! Sep 3 2026
* [ ] Undated and open
* [ ] Whole week commitment ! Aug Week #2 2026
* [ ] Whole month commitment ! Aug 2026

# WIP
### CURRENT
* [x] Finished Monday | Aug 10 2026
* [x] Finished Wednesday | Aug 12 2026
* [-] Dropped Wednesday | Aug 12 2026

# ARCHIVE
### Aug Week #2 2026
* [x] Archived Wednesday | Aug 12 2026
* [x] Archived last week | Aug 6 2026
* [x] Archived with no completion date
`;

const todoData = parseTodoMdFile(fixture);

const findDay = (model, key) => model.days.find(day => day.key === key);

describe('deriveReviewModel', () => {
  const model = deriveReviewModel(todoData, { anchor: WEDNESDAY, today: WEDNESDAY });

  it('pads the anchor month out to whole Sunday-Saturday weeks and flags padding days', () => {
    expect(model.days.length % 7).toBe(0);
    expect(model.gridStart.getDay()).toBe(0);
    expect(model.weeks.every(week => week.length === 7)).toBe(true);
    expect(findDay(model, '2026-07-31').isOutsidePeriod).toBe(true);
    expect(findDay(model, '2026-08-01').isOutsidePeriod).toBe(false);
  });

  it('labels the month and marks it current', () => {
    expect(model.label).toBe('August 2026');
    expect(model.subLabel).toBe('Aug 1 – 31');
    expect(model.isCurrentPeriod).toBe(true);
  });

  it('buckets terminal tasks onto their completion day, from every column', () => {
    const wednesday = findDay(model, '2026-08-12');
    expect(wednesday.completed.map(entry => entry.task.displayText)).toEqual([
      'Finished Wednesday',
      'Archived Wednesday'
    ]);
    expect(wednesday.cancelled.map(entry => entry.task.displayText)).toEqual(['Dropped Wednesday']);
    expect(findDay(model, '2026-08-10').completed).toHaveLength(1);
  });

  it('buckets open tasks onto their exact due day and tracks in-progress separately', () => {
    const today = findDay(model, '2026-08-12');
    expect(today.due.map(entry => entry.task.displayText)).toEqual(['Started, due today']);
    expect(today.inProgress).toHaveLength(1);
    expect(findDay(model, '2026-08-14').due.map(entry => entry.task.displayText)).toEqual(['Due Friday this week']);
  });

  it('keeps week and month commitments out of the day grid and in the spanning list', () => {
    expect(model.spanning.map(entry => entry.task.displayText)).toEqual([
      'Whole week commitment',
      'Whole month commitment'
    ]);
    expect(model.days.flatMap(day => day.due).map(entry => entry.task.displayText))
      .not.toContain('Whole week commitment');
  });

  it('covers the whole month, not just the week holding today', () => {
    expect(findDay(model, '2026-08-06').completed).toHaveLength(1);
    expect(findDay(model, '2026-08-05').due.map(entry => entry.task.displayText)).toEqual(['Overdue and open']);
  });

  it('renders work landing in the padding days but leaves it out of the totals', () => {
    // August's grid runs Jul 26 - Sep 5, so Sep 3 shows in the trailing row.
    const september3 = findDay(model, '2026-09-03');
    expect(september3.isOutsidePeriod).toBe(true);
    expect(september3.due.map(entry => entry.task.displayText)).toEqual(['Due next month']);
    expect(model.totals.due).toBe(3);
  });

  it('keeps dateless work off the grid entirely', () => {
    const texts = model.days.flatMap(day => [...day.completed, ...day.cancelled, ...day.due])
      .map(entry => entry.task.displayText);
    expect(texts).not.toContain('Archived with no completion date');
    expect(texts).not.toContain('Undated and open');
  });

  it('collects dateless tasks instead of dropping them', () => {
    expect(model.undated.completed.map(entry => entry.task.displayText)).toEqual(['Archived with no completion date']);
    expect(model.undated.open.map(entry => entry.task.displayText)).toEqual(['Undated and open']);
  });

  it('reports still-overdue open work regardless of the period on screen', () => {
    expect(model.overdueOpen.map(entry => entry.task.displayText)).toEqual(['Overdue and open']);
    expect(model.totals.overdueOpen).toBe(1);
  });

  it('totals throughput, commitments and derived rates over the month', () => {
    expect(model.totals.completed).toBe(4);
    expect(model.totals.cancelled).toBe(1);
    expect(model.totals.due).toBe(3);
    expect(model.totals.spanningDue).toBe(2);
    expect(model.totals.commitments).toBe(10);
    expect(model.totals.completionRate).toBe(40);
    expect(model.totals.activeDays).toBe(3);
    // Aug 1 through Aug 12 have elapsed; the 13th onward has not.
    expect(model.totals.elapsedDays).toBe(12);
    expect(model.totals.dailyAverage).toBe(0.3);
    expect(model.totals.busiestDayLabel).toBe('Wed 12');
    expect(model.totals.busiestDayCount).toBe(2);
  });

  it('ranks the sections that completed work came from', () => {
    expect(model.topSections).toEqual([
      { label: 'ARCHIVE › Aug Week #2 2026', count: 2 },
      { label: 'WIP › CURRENT', count: 2 }
    ]);
  });

  it('marks today and future days', () => {
    expect(findDay(model, '2026-08-12').isToday).toBe(true);
    expect(findDay(model, '2026-08-12').isFuture).toBe(false);
    expect(findDay(model, '2026-08-14').isFuture).toBe(true);
    expect(findDay(model, '2026-08-10').isFuture).toBe(false);
  });

  it('excludes padding days from the totals', () => {
    const september = deriveReviewModel(todoData, { anchor: new Date(2026, 8, 15), today: WEDNESDAY });
    // September's grid opens on Aug 30, so August's work is out of reach of it.
    expect(september.gridStart.getTime()).toBe(new Date(2026, 7, 30).getTime());
    expect(findDay(september, '2026-09-03').due).toHaveLength(1);
    expect(september.totals.completed).toBe(0);
    expect(september.totals.due).toBe(1);
    expect(september.isCurrentPeriod).toBe(false);
  });
});

describe('deriveCalendarYearBars', () => {
  const bars = deriveCalendarYearBars(todoData, { year: 2026, today: WEDNESDAY });
  const month = (index) => bars.months[index];

  it('covers January through December of the requested calendar year', () => {
    expect(bars.months).toHaveLength(12);
    expect(bars.year).toBe(2026);
    expect(month(0).key).toBe('2026-01');
    expect(month(11).key).toBe('2026-12');
    expect(month(7).monthLabel).toBe('Aug');
    expect(month(7).label).toBe('Aug 2026');
  });

  it('rolls every day of a month into that month bar', () => {
    expect(month(7).completed.map(entry => entry.task.displayText)).toEqual([
      'Finished Monday',
      'Finished Wednesday',
      'Archived Wednesday',
      'Archived last week'
    ]);
    expect(month(7).cancelled).toHaveLength(1);
  });

  it('absorbs week and month due periods into their owning month', () => {
    expect(month(7).due.map(entry => entry.task.displayText)).toEqual([
      'Due Friday this week',
      'Started, due today',
      'Overdue and open',
      'Whole week commitment',
      'Whole month commitment'
    ]);
    expect(month(7).inProgress).toHaveLength(1);
  });

  it('separates months that are not the anchor month', () => {
    expect(month(8).due.map(entry => entry.task.displayText)).toEqual(['Due next month']);
    expect(month(0).completed).toEqual([]);
  });

  it('marks the current month and the months still ahead', () => {
    expect(month(7).isCurrent).toBe(true);
    expect(month(6).isCurrent).toBe(false);
    expect(month(6).isFuture).toBe(false);
    expect(month(8).isFuture).toBe(true);
  });

  it('reports the peak bar and year totals for scaling and the summary line', () => {
    expect(bars.peak).toBe(10);
    expect(bars.totals).toEqual({ completed: 4, cancelled: 1, due: 6 });
  });

  it('returns an empty year rather than failing on other years or no data', () => {
    const empty = deriveCalendarYearBars(todoData, { year: 2024, today: WEDNESDAY });
    expect(empty.months).toHaveLength(12);
    expect(empty.peak).toBe(0);
    expect(empty.totals).toEqual({ completed: 0, cancelled: 0, due: 0 });
    expect(empty.months.every(bar => bar.isFuture === false)).toBe(true);

    const none = deriveCalendarYearBars(null, { year: 2026, today: WEDNESDAY });
    expect(none.peak).toBe(0);
  });
});

describe('empty and malformed input', () => {
  it('returns a usable model with no data', () => {
    const model = deriveReviewModel(null, { anchor: WEDNESDAY, today: WEDNESDAY });
    expect(model.days.length % 7).toBe(0);
    expect(model.totals.completed).toBe(0);
    expect(model.totals.completionRate).toBe(0);
    expect(model.totals.busiestDayLabel).toBe('—');
  });

  it('ignores raw-text columns and sections', () => {
    const data = parseTodoMdFile('stray line before any column\n\n# WIP\n### CURRENT\n* [x] Real one | Aug 12 2026\nloose text\n');
    const model = deriveReviewModel(data, { anchor: WEDNESDAY, today: WEDNESDAY });
    expect(model.totals.completed).toBe(1);
  });
});

describe('anchorForTask', () => {
  it('anchors terminal tasks on their completion day', () => {
    expect(anchorForTask({ statusChar: 'x', text: 'Done | Aug 12 2026' })).toMatchObject({ kind: 'day', source: 'completion' });
    expect(anchorForTask({ statusChar: '-', text: 'Dropped | Aug 12 2026' }).source).toBe('completion');
  });

  it('anchors open tasks on their due period', () => {
    expect(anchorForTask({ statusChar: '~', text: 'Open ! Aug 2026' })).toMatchObject({ kind: 'month', source: 'due' });
  });

  it('returns null when the authoritative date is missing', () => {
    expect(anchorForTask({ statusChar: 'x', text: 'Done but undated' })).toBeNull();
    expect(anchorForTask({ statusChar: ' ', text: 'Open but undated' })).toBeNull();
  });
});

describe('navigation helpers', () => {
  it('steps by whole months, landing on the first', () => {
    expect(dayKey(shiftAnchor(WEDNESDAY, 1))).toBe('2026-09-01');
    expect(dayKey(shiftAnchor(WEDNESDAY, -8))).toBe('2025-12-01');
    expect(dayKey(shiftAnchor(WEDNESDAY, 0))).toBe('2026-08-01');
  });

  it('labels the month', () => {
    expect(periodLabelFor(WEDNESDAY)).toBe('August 2026');
    expect(periodLabelFor(new Date(2026, 0, 31))).toBe('January 2026');
  });
});

describe('deriveWeeklyTrend', () => {
  const trend = deriveWeeklyTrend(todoData, { anchor: WEDNESDAY, weeks: 4 });

  it('ends on the anchor week and counts backwards', () => {
    expect(trend.buckets).toHaveLength(4);
    expect(dayKey(trend.buckets[3].start)).toBe('2026-08-09');
    expect(dayKey(trend.buckets[0].start)).toBe('2026-07-19');
  });

  it('separates completed from cancelled per week', () => {
    expect(trend.buckets[3]).toMatchObject({ completed: 3, cancelled: 1 });
    expect(trend.buckets[2]).toMatchObject({ completed: 1, cancelled: 0 });
    expect(trend.peak).toBe(4);
  });

  it('ignores open tasks and undated completions', () => {
    const totalCounted = trend.buckets.reduce((sum, week) => sum + week.completed + week.cancelled, 0);
    expect(totalCounted).toBe(5);
  });
});
