// utils/reviewModeHelpers.js
// Pure derivation for Review mode - the retrospective counterpart to Focus.
// Focus asks "what do I do now"; Review asks "what actually happened, and what
// is landing". It reads the whole file (every column, including ARCHIVE) and
// buckets tasks onto calendar days by their authoritative date: completion day
// for terminal tasks, due period for everything still open.

import {
  MONTH_NAMES,
  extractDuePeriod,
  formatWeekPeriodLabel,
  majorityMonthForWeek,
  startOfSundayWeek,
  weekIdentity
} from './dateHelpers';
import { extractCompletionDateValue } from './completionDateHelpers';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS_IN_YEAR = 12;

const atStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const atEndOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addDays = (date, days) => {
  const result = atStartOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const dayKey = (date) => {
  const day = atStartOfDay(date);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};

const isTaskItem = (item) => item?.type === 'task';

const statusBucket = (statusChar) => {
  if (statusChar === 'x') return 'completed';
  if (statusChar === '-') return 'cancelled';
  if (statusChar === '~') return 'inProgress';
  return 'queued';
};

const isTerminalBucket = (bucket) => bucket === 'completed' || bucket === 'cancelled';

const eachTask = (todoData, visit) => {
  (todoData?.columnOrder || []).forEach(columnName => {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text') return;

    (column.sections || []).forEach(section => {
      if (section.type === 'raw-text') return;
      (section.items || []).filter(isTaskItem).forEach(task => {
        visit({ task, columnName, stackName: column.name, sectionName: section.name });
      });
    });
  });
};

/**
 * The authoritative calendar anchor for one task.
 * Terminal tasks are anchored on the day they were finished; open tasks are
 * anchored on their due period. Either may be missing, which is itself a fact
 * worth reporting rather than a reason to drop the task.
 */
export const anchorForTask = (task) => {
  const bucket = statusBucket(task.statusChar);
  if (isTerminalBucket(bucket)) {
    const completed = extractCompletionDateValue(task.text);
    return completed ? { kind: 'day', start: completed, end: completed, source: 'completion' } : null;
  }
  const period = extractDuePeriod(task.text);
  return period ? { ...period, source: 'due' } : null;
};

/** The month a due period belongs to: for weeks, the month holding four of its days. */
const owningMonth = (anchor) => anchor.kind === 'week'
  ? majorityMonthForWeek(anchor.start)
  : { year: anchor.start.getFullYear(), monthIndex: anchor.start.getMonth() };

/** The month holding the anchor, padded out to whole Sunday-Saturday weeks. */
const monthBounds = (anchorDate) => {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  return {
    periodStart: atStartOfDay(monthStart),
    periodEnd: atStartOfDay(monthEnd),
    gridStart: startOfSundayWeek(monthStart),
    gridEnd: addDays(startOfSundayWeek(monthEnd), 6)
  };
};

export const shiftAnchor = (anchorDate, steps) =>
  new Date(anchorDate.getFullYear(), anchorDate.getMonth() + steps, 1);

export const periodLabelFor = (anchorDate) =>
  `${anchorDate.toLocaleDateString('en-US', { month: 'long' })} ${anchorDate.getFullYear()}`;

export const periodSubLabelFor = (periodStart, periodEnd) =>
  `${MONTH_NAMES[periodStart.getMonth()]} 1 – ${periodEnd.getDate()}`;

const emptyDay = (date, periodStart, periodEnd, today) => ({
  date,
  key: dayKey(date),
  dayOfMonth: date.getDate(),
  weekdayLabel: DAY_NAMES[date.getDay()],
  label: `${DAY_NAMES[date.getDay()]} ${date.getDate()}`,
  isToday: date.getTime() === today.getTime(),
  isFuture: date > today,
  isOutsidePeriod: date < periodStart || date > periodEnd,
  completed: [],
  cancelled: [],
  due: [],
  inProgress: []
});

const fileEntry = (bucket, entry) => {
  if (entry.bucket === 'completed') bucket.completed.push(entry);
  else if (entry.bucket === 'cancelled') bucket.cancelled.push(entry);
  else {
    bucket.due.push(entry);
    if (entry.bucket === 'inProgress') bucket.inProgress.push(entry);
  }
};

const rankSection = (counts, entry) => {
  const key = `${entry.columnName} › ${entry.sectionName}`;
  counts.set(key, (counts.get(key) || 0) + 1);
};

/**
 * Build the review model for one calendar month.
 * @param {Object} todoData - { columnOrder, columnStacks }
 * @param {Object} [options]
 * @param {Date} [options.anchor] - any day inside the month under review
 * @param {Date} [options.today] - injectable clock for deterministic tests
 * @returns {Object} grid, per-day buckets, totals and highlights
 */
export const deriveReviewModel = (todoData, { anchor = new Date(), today = new Date() } = {}) => {
  const anchorDate = atStartOfDay(anchor);
  const currentDay = atStartOfDay(today);
  const { periodStart, periodEnd, gridStart, gridEnd } = monthBounds(anchorDate);

  const days = [];
  const dayIndex = new Map();
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const day = emptyDay(new Date(cursor), periodStart, periodEnd, currentDay);
    days.push(day);
    dayIndex.set(day.key, day);
  }

  const spanning = [];
  const undated = { completed: [], cancelled: [], open: [] };
  const sectionCounts = new Map();
  const overdueOpen = [];

  eachTask(todoData, (entry) => {
    const bucket = statusBucket(entry.task.statusChar);
    const taskAnchor = anchorForTask(entry.task);
    const enriched = { ...entry, bucket, anchor: taskAnchor };

    if (!taskAnchor) {
      if (bucket === 'completed') undated.completed.push(enriched);
      else if (bucket === 'cancelled') undated.cancelled.push(enriched);
      else undated.open.push(enriched);
      return;
    }

    if (!isTerminalBucket(bucket) && taskAnchor.end < currentDay) overdueOpen.push(enriched);
    if (taskAnchor.start > atEndOfDay(gridEnd) || taskAnchor.end < gridStart) return;

    // Week and month due periods have no honest single-day slot; they belong to
    // the period as a whole and are listed alongside the grid instead.
    if (taskAnchor.kind !== 'day') {
      spanning.push(enriched);
      return;
    }

    const day = dayIndex.get(dayKey(taskAnchor.start));
    if (!day) return;

    fileEntry(day, enriched);
    if (bucket === 'completed') rankSection(sectionCounts, entry);
  });

  const inPeriod = days.filter(day => !day.isOutsidePeriod);
  const sum = (pick) => inPeriod.reduce((total, day) => total + pick(day).length, 0);

  const completed = sum(day => day.completed);
  const cancelled = sum(day => day.cancelled);
  const due = sum(day => day.due);
  const inProgress = sum(day => day.inProgress);
  const spanningDue = spanning.filter(entry => !isTerminalBucket(entry.bucket)).length;
  const commitments = completed + cancelled + due + spanningDue;

  const elapsedDays = inPeriod.filter(day => !day.isFuture).length;
  const activeDays = inPeriod.filter(day => day.completed.length > 0).length;
  const peakDay = inPeriod.reduce(
    (best, day) => (day.completed.length > (best?.completed.length ?? 0) ? day : best),
    null
  );

  return {
    anchor: anchorDate,
    today: currentDay,
    periodStart,
    periodEnd,
    gridStart,
    gridEnd,
    label: periodLabelFor(anchorDate),
    subLabel: periodSubLabelFor(periodStart, periodEnd),
    isCurrentPeriod: currentDay >= periodStart && currentDay <= periodEnd,
    days,
    weeks: Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7)),
    weekdayLabels: DAY_NAMES,
    spanning,
    undated,
    overdueOpen,
    totals: {
      completed,
      cancelled,
      due,
      inProgress,
      spanningDue,
      resolved: completed + cancelled,
      commitments,
      overdueOpen: overdueOpen.length,
      completionRate: commitments ? Math.round((completed / commitments) * 100) : 0,
      dailyAverage: elapsedDays ? Math.round((completed / elapsedDays) * 10) / 10 : 0,
      activeDays,
      elapsedDays,
      busiestDayLabel: peakDay?.completed.length ? peakDay.label : '—',
      busiestDayCount: peakDay?.completed.length || 0,
      peakDayCount: inPeriod.reduce(
        (max, day) => Math.max(max, day.completed.length + day.cancelled.length + day.due.length),
        0
      )
    },
    topSections: [...sectionCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5)
  };
};

/**
 * January-to-December bars for one calendar year, for the strip above the month
 * grid. Month buckets can hold week and month due periods honestly - a week
 * belongs to the month holding four of its days - so nothing is set aside here.
 * @param {Object} todoData - { columnOrder, columnStacks }
 * @param {Object} [options]
 * @param {number} [options.year] - calendar year to chart
 * @param {Date} [options.today] - injectable clock for deterministic tests
 * @returns {{ year: number, months: Array, peak: number, totals: Object }}
 */
export const deriveCalendarYearBars = (todoData, { year = new Date().getFullYear(), today = new Date() } = {}) => {
  const currentDay = atStartOfDay(today);

  const months = Array.from({ length: MONTHS_IN_YEAR }, (_, monthIndex) => ({
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    year,
    monthIndex,
    date: new Date(year, monthIndex, 1),
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    monthLabel: MONTH_NAMES[monthIndex],
    isCurrent: year === currentDay.getFullYear() && monthIndex === currentDay.getMonth(),
    isFuture: new Date(year, monthIndex, 1) > new Date(currentDay.getFullYear(), currentDay.getMonth(), 1),
    completed: [],
    cancelled: [],
    due: [],
    inProgress: []
  }));

  eachTask(todoData, (entry) => {
    const bucket = statusBucket(entry.task.statusChar);
    const taskAnchor = anchorForTask(entry.task);
    if (!taskAnchor) return;

    const owner = owningMonth(taskAnchor);
    if (owner.year !== year) return;
    fileEntry(months[owner.monthIndex], { ...entry, bucket, anchor: taskAnchor });
  });

  const totalOf = (month) => month.completed.length + month.cancelled.length + month.due.length;

  return {
    year,
    months,
    peak: months.reduce((max, month) => Math.max(max, totalOf(month)), 0),
    totals: {
      completed: months.reduce((total, month) => total + month.completed.length, 0),
      cancelled: months.reduce((total, month) => total + month.cancelled.length, 0),
      due: months.reduce((total, month) => total + month.due.length, 0)
    }
  };
};

/**
 * Completions per Sunday-Saturday week across the trailing weeks ending with
 * the review period, for the sparkline strip.
 */
export const deriveWeeklyTrend = (todoData, { anchor = new Date(), weeks = 8 } = {}) => {
  const anchorSunday = startOfSundayWeek(anchor);
  const buckets = Array.from({ length: weeks }, (_, offset) => {
    const start = addDays(anchorSunday, (offset - (weeks - 1)) * 7);
    return { start, end: addDays(start, 6), label: formatWeekPeriodLabel(start), completed: 0, cancelled: 0 };
  });

  eachTask(todoData, ({ task }) => {
    const bucket = statusBucket(task.statusChar);
    if (!isTerminalBucket(bucket)) return;
    const completedOn = extractCompletionDateValue(task.text);
    if (!completedOn) return;
    const slot = buckets.find(week => completedOn >= week.start && completedOn <= week.end);
    if (slot) slot[bucket] += 1;
  });

  const peak = buckets.reduce((max, week) => Math.max(max, week.completed + week.cancelled), 0);
  return { buckets, peak, currentWeekNumber: weekIdentity(anchorSunday).number };
};
