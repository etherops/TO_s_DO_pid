// utils/focusModeHelpers.js
// Derives the Focus (execution) model from parsed todo data.
// Focus mode pulls only from SELECTED and WIP columns - the staged, committed
// work. What lands on deck for the week is either staged into WIP or carries a
// due date falling on or before the Saturday that closes this week. Four
// buckets: IN PROGRESS / PARKED (work already underway), NOW
// (overdue and due-today work), UP NEXT (scheduled future work and undated
// queued work), and DONE. Work completed or cancelled today stays in NOW;
// its completion date is authoritative because terminal tasks no longer retain
// a due date.

import { extractDuePeriod, majorityMonthForWeek } from './dateHelpers';
import { extractCompletionDateValue, isCompletedToday } from './completionDateHelpers';

export const UP_NEXT_GROUP_ORDER = ['month', 'week', 'day', 'unscheduled'];

const isLowPriorityEntry = (entry) => entry.task.isLowPriority || entry.task.listMarker === '-';

export const orderEntriesBySourcePosition = (entries) => {
  const sectionGroups = new Map();
  entries.forEach(entry => {
    const key = entry.section;
    if (!sectionGroups.has(key)) sectionGroups.set(key, []);
    sectionGroups.get(key).push(entry);
  });

  return [...sectionGroups.values()].flatMap(sectionEntries => {
    const sectionItems = sectionEntries[0]?.section?.items || [];
    const sourceIndex = new Map(sectionItems.map((item, index) => [item.id, index]));
    return [...sectionEntries].sort((a, b) =>
      (sourceIndex.get(a.task.id) ?? Number.MAX_SAFE_INTEGER)
      - (sourceIndex.get(b.task.id) ?? Number.MAX_SAFE_INTEGER)
    );
  });
};

export const groupInProgressQueuedEntries = (entries) => {
  const lowPriority = entries.filter(isLowPriorityEntry);
  const normalPriority = entries.filter(entry => !isLowPriorityEntry(entry));
  const thisWeek = normalPriority.filter(entry => entry.dueGroup === 'this-week');
  const remaining = normalPriority.filter(entry => entry.dueGroup !== 'this-week');
  const active = remaining.filter(entry => entry.group !== 'waiting');
  const parked = remaining.filter(entry => entry.group === 'waiting');

  return [
    { key: 'this-week', label: 'This Week', entries: orderEntriesBySourcePosition(thisWeek) },
    { key: 'this-month-active', label: 'This Month - Active', entries: orderEntriesBySourcePosition(active) },
    { key: 'this-month-parked', label: 'This Month - Parked', entries: orderEntriesBySourcePosition(parked) },
    { key: 'low-priority', label: 'Low Priority', entries: orderEntriesBySourcePosition(lowPriority) }
  ].filter(group => group.entries.length);
};

export const reorderTaskSubsetInSection = (
  sectionItems,
  eligibleTaskIds,
  sourceTaskId,
  targetTaskId,
  placeAfter = false
) => {
  if (!Array.isArray(sectionItems) || sourceTaskId === targetTaskId) return false;

  const eligibleIds = new Set(eligibleTaskIds);
  if (!eligibleIds.has(sourceTaskId) || !eligibleIds.has(targetTaskId)) return false;

  const slots = sectionItems
    .map((item, index) => eligibleIds.has(item.id) ? index : -1)
    .filter(index => index !== -1);
  const orderedItems = slots.map(index => sectionItems[index]);
  const sourceIndex = orderedItems.findIndex(item => item.id === sourceTaskId);
  if (sourceIndex === -1) return false;

  const [sourceItem] = orderedItems.splice(sourceIndex, 1);
  const targetIndex = orderedItems.findIndex(item => item.id === targetTaskId);
  if (targetIndex === -1) return false;
  orderedItems.splice(targetIndex + (placeAfter ? 1 : 0), 0, sourceItem);

  const changed = slots.some((slot, index) => sectionItems[slot] !== orderedItems[index]);
  if (!changed) return false;
  slots.forEach((slot, index) => {
    sectionItems[slot] = orderedItems[index];
  });
  return true;
};

const FOCUS_STACKS = ['WIP', 'SELECTED'];

const isIceColumn = (columnName) => columnName.toUpperCase().includes('ICE');

const isTaskItem = (item) => item.type === 'task';

/**
 * End of the Sunday-Saturday week containing the given day.
 * @param {Date} from - any day inside the week (defaults to today)
 * @returns {Date} Saturday of that week, at the last millisecond
 */
export const endOfCurrentWeek = (from = new Date()) => {
  const end = new Date(from);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return end;
};

/**
 * Is this task's due date within reach of this week? Anything already overdue
 * counts too - it was due by now, so it is very much this week's problem.
 */
export const isOnDeckThisWeek = (text, today = new Date()) => {
  const period = extractDuePeriod(text);
  if (!period || period.kind === 'month') return false;
  return period.start <= endOfCurrentWeek(today);
};

// Ordering for the execution panels: today's problems first - what's late,
// then what's due today - followed by undated work you can pick up any time,
// with the days still to come bringing up the rear
const DUE_RANK = { thisWeek: -1, overdue: 0, today: 1, undated: 2, upcoming: 3 };

const isCurrentWholeWeek = (period, today = new Date()) => {
  if (period?.kind !== 'week') return false;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return period.start.getTime() === start.getTime();
};

const dueGrouping = (task, today) => {
  const period = extractDuePeriod(task.text);
  if (!period) return { dueGroup: 'undated', dueRank: DUE_RANK.undated, dueTime: 0 };
  if (period.end < today) return { dueGroup: 'overdue', dueRank: DUE_RANK.overdue, dueTime: period.start.getTime() };
  if (period.kind === 'day' && period.start.getTime() === today.getTime()) {
    return { dueGroup: 'today', dueRank: DUE_RANK.today, dueTime: period.start.getTime() };
  }
  const periodGroup = period.kind === 'day' ? `day-${period.start.getTime()}` : `${period.kind}-${period.start.getTime()}`;
  return { dueGroup: periodGroup, dueRank: DUE_RANK.upcoming, dueTime: period.start.getTime() };
};

const byDueDate = (a, b) => a.dueRank - b.dueRank || a.dueTime - b.dueTime;

// What's left in SELECTED once this week's work has been pulled out: work
// already underway leads, then dated work by date, then everything undated
const dueTimeOf = (entry) => extractDuePeriod(entry.task.text)?.start.getTime() ?? Number.MAX_SAFE_INTEGER;

const isDueNextMonthOrLater = (period, today = new Date()) => {
  if (!period) return false;
  const owner = period.kind === 'week'
    ? majorityMonthForWeek(period.start)
    : { year: period.start.getFullYear(), monthIndex: period.start.getMonth() };
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return new Date(owner.year, owner.monthIndex, 1) >= nextMonth;
};

const isDueAfterCurrentWeek = (period, today = new Date()) =>
  period?.kind !== 'month' && period?.start > endOfCurrentWeek(today);

const eachFocusTask = (todoData, visit) => {
  (todoData?.columnOrder || []).forEach(columnName => {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text' || isIceColumn(columnName)) return;
    if (!FOCUS_STACKS.includes(column.name)) return;

    (column.sections || []).forEach(section => {
      if (section.type === 'raw-text') return;
      (section.items || []).filter(isTaskItem).forEach(task => {
        visit({ task, columnName, stackName: column.name, sectionName: section.name, section });
        (task.children || []).filter(child => child.type === 'subtask'
          && (extractDuePeriod(child.text) || extractCompletionDateValue(child.text))).forEach(child => {
          visit({ task: child, parentTask: task, columnName, stackName: column.name, sectionName: section.name, section });
        });
      });
    });
  });
};

/**
 * Build the focus model from SELECTED and WIP columns.
 * On deck = staged into WIP, or due on or before the end of this week from
 * anywhere. IN PROGRESS / PARKED holds non-urgent in-progress work. NOW holds
 * overdue and due-today work and terminal work completed today. UP NEXT keeps
 * future or unstarted work and DONE keeps earlier terminal work.
 * @param {Object} todoData - { columnOrder, columnStacks }
 * @returns {{ inProgressQueued: Array, now: Array, upNext: Array, done: Array }}
 *          entries of shape { task, columnName, sectionName, section, dueGroup?, group? }
 */
export const deriveFocusModel = (todoData, referenceDate = new Date(), { hideOverdue = false } = {}) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const inProgressQueued = [];
  const now = [];
  const done = [];
  const upNextGroups = { month: [], week: [], day: [], unscheduled: [] };

  eachFocusTask(todoData, (entry) => {
    const { task, stackName } = entry;

    const isTerminal = task.statusChar === 'x' || task.statusChar === '-';
    // Terminal tasks have a completion day instead of a due period.
    if (isTerminal && isCompletedToday(task.text, today)) {
      const completed = extractCompletionDateValue(task.text);
      now.push({
        ...entry,
        ...dueGrouping(task, today),
        dueGroup: 'today',
        dueRank: DUE_RANK.today,
        dueTime: completed?.getTime() || extractDuePeriod(task.text)?.start.getTime() || 0
      });
      return;
    }
    if (isTerminal) {
      done.push(entry);
      return;
    }
    if (task.statusChar !== ' ' && task.statusChar !== '~') return;

    const routedEntry = { ...entry, ...dueGrouping(task, today) };
    if (hideOverdue && routedEntry.dueGroup === 'overdue') return;
    const period = extractDuePeriod(task.text);
    const wasOnDeck = stackName === 'WIP' || isOnDeckThisWeek(task.text, today);

    // Whole-current-week commitments share NOW regardless of active status.
    if (isCurrentWholeWeek(period, today)) {
      const wholeWeekEntry = {
        ...routedEntry,
        dueGroup: 'this-week',
        dueRank: DUE_RANK.thisWeek,
        dueTime: period.start.getTime()
      };
      now.push(wholeWeekEntry);
      return;
    }

    // Anything beyond the current week is planning context even when already
    // in progress. Month-level commitments stay active through their owner month.
    if (task.statusChar === '~' && period
        && (isDueAfterCurrentWeek(period, today) || isDueNextMonthOrLater(period, today))) {
      upNextGroups[period.kind].push({ ...routedEntry, group: period.kind });
      return;
    }

    if (wasOnDeck) {
      const isUrgent = routedEntry.dueGroup === 'today' || routedEntry.dueGroup === 'overdue';
      if (isUrgent) {
        now.push(routedEntry);
        return;
      }

      // A future exact day this week is already represented in Week at a
      // glance. Keep it in the source model for that strip, but the upper Up
      // Next display intentionally filters current-week dates out.
      if (task.statusChar === '~' && period?.kind === 'day' && period.start <= endOfCurrentWeek(today)) {
        upNextGroups.day.push({ ...routedEntry, group: 'day' });
        return;
      }

      // Status owns execution routing through the current calendar month.
      if (task.statusChar === '~') {
        const group = stackName === 'WIP' ? 'inProgress' : 'waiting';
        inProgressQueued.push({ ...routedEntry, group });
        return;
      }

      if (period) upNextGroups[period.kind].push({ ...routedEntry, group: period.kind });
      else upNextGroups.unscheduled.push({ ...routedEntry, group: 'unscheduled' });
      return;
    }

    // Starting anything in Up Next moves it into Waiting / Blocked. Its due
    // period remains intact and continues to appear in Week at a glance when
    // applicable; only urgent work is promoted to NOW instead.
    if (task.statusChar === '~') inProgressQueued.push({ ...routedEntry, group: 'waiting' });
    else if (period) upNextGroups[period.kind].push({ ...routedEntry, group: period.kind });
    else upNextGroups.unscheduled.push({ ...routedEntry, group: 'unscheduled' });
  });

  inProgressQueued.sort(byDueDate);
  now.sort(byDueDate);
  Object.values(upNextGroups).forEach(entries => entries.sort((a, b) => dueTimeOf(a) - dueTimeOf(b)));

  return {
    inProgressQueued,
    now,
    upNext: UP_NEXT_GROUP_ORDER.flatMap(group => upNextGroups[group]).filter(entry => !entry.parentTask),
    done: done.filter(entry => !entry.parentTask)
  };
};

/**
 * Find the WIP section where active work happens, without hardcoding section
 * names: the section holding the most [~] tasks, falling back to the first
 * WIP section. Null when no WIP column exists.
 */
export const findActiveWipSection = (todoData) => {
  let best = null;
  let bestCount = -1;

  (todoData?.columnOrder || []).forEach(columnName => {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text' || isIceColumn(columnName)) return;
    if (column.name !== 'WIP') return;

    (column.sections || []).forEach(section => {
      if (section.type === 'raw-text') return;
      const inflightCount = (section.items || []).filter(item => isTaskItem(item) && item.statusChar === '~').length;
      if (inflightCount > bestCount) {
        best = { columnName, section };
        bestCount = inflightCount;
      }
    });
  });

  return best;
};

/**
 * Find where quick-added tasks should land: the active WIP section, falling
 * back to the first SELECTED section. Null when neither exists.
 */
export const findQuickAddTarget = (todoData) => {
  const wipTarget = findActiveWipSection(todoData);
  if (wipTarget) return wipTarget;

  for (const columnName of (todoData?.columnOrder || [])) {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text' || isIceColumn(columnName)) continue;
    if (column.name !== 'SELECTED') continue;

    const section = (column.sections || []).find(s => s.type !== 'raw-text');
    if (section) return { columnName, section };
  }
  return null;
};
