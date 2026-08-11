// utils/focusModeHelpers.js
// Derives the Focus (execution) model from parsed todo data.
// Focus mode pulls only from SELECTED and WIP columns - the staged, committed
// work. What lands on deck for the week is either staged into WIP or carries a
// due date falling on or before the Saturday that closes this week. Four
// buckets: IN PROGRESS / QUEUED (anything underway unless urgent, plus
// non-urgent dated queued work), NOW (undated queued work plus overdue and
// due-today work), UP NEXT (the rest of SELECTED), and DONE. Completed work
// due today stays visible in NOW until tomorrow. Work completed or cancelled
// today also stays in NOW, regardless of its due date.

import { isPast, isToday, extractDateFromText } from './dateHelpers';
import { isCompletedToday } from './completionDateHelpers';

export const UP_NEXT_GROUP_ORDER = ['inflight', 'upcoming', 'undated'];

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
export const isOnDeckThisWeek = (text) => {
  const dueDate = extractDateFromText(text);
  return Boolean(dueDate) && dueDate <= endOfCurrentWeek();
};

// Ordering for the execution panels: today's problems first - what's late,
// then what's due today - followed by undated work you can pick up any time,
// with the days still to come bringing up the rear
const DUE_RANK = { overdue: 0, today: 1, undated: 2, upcoming: 3 };

const dueGrouping = (task) => {
  const dueDate = extractDateFromText(task.text);
  if (!dueDate) return { dueGroup: 'undated', dueRank: DUE_RANK.undated, dueTime: 0 };
  if (isPast(task.text)) return { dueGroup: 'overdue', dueRank: DUE_RANK.overdue, dueTime: dueDate.getTime() };
  if (isToday(task.text)) return { dueGroup: 'today', dueRank: DUE_RANK.today, dueTime: dueDate.getTime() };
  return { dueGroup: `day-${dueDate.getTime()}`, dueRank: DUE_RANK.upcoming, dueTime: dueDate.getTime() };
};

const byDueDate = (a, b) => a.dueRank - b.dueRank || a.dueTime - b.dueTime;

// What's left in SELECTED once this week's work has been pulled out: work
// already underway leads, then dated work by date, then everything undated
const classifyUpNextGroup = (task) => {
  if (task.statusChar === '~') return 'inflight';
  return extractDateFromText(task.text) ? 'upcoming' : 'undated';
};

const dueTimeOf = (entry) => extractDateFromText(entry.task.text)?.getTime() ?? Number.MAX_SAFE_INTEGER;

const eachFocusTask = (todoData, visit) => {
  (todoData?.columnOrder || []).forEach(columnName => {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text' || isIceColumn(columnName)) return;
    if (!FOCUS_STACKS.includes(column.name)) return;

    (column.sections || []).forEach(section => {
      if (section.type === 'raw-text') return;
      (section.items || []).filter(isTaskItem).forEach(task => {
        visit({ task, columnName, stackName: column.name, sectionName: section.name, section });
      });
    });
  });
};

/**
 * Build the focus model from SELECTED and WIP columns.
 * On deck = staged into WIP, or due on or before the end of this week from
 * anywhere. IN PROGRESS / QUEUED holds non-urgent in-progress work and dated
 * queued work. NOW holds undated queued work plus all overdue and due-today work. Both are
 * ordered overdue -> today -> undated ->
 * each upcoming day. UP NEXT keeps the rest of SELECTED and DONE keeps
 * terminal work, except cards due today or completed/cancelled today remain in NOW.
 * @param {Object} todoData - { columnOrder, columnStacks }
 * @returns {{ inProgressQueued: Array, now: Array, upNext: Array, done: Array }}
 *          entries of shape { task, columnName, sectionName, section, dueGroup?, group? }
 */
export const deriveFocusModel = (todoData) => {
  const inProgressQueued = [];
  const now = [];
  const done = [];
  const upNextGroups = { inflight: [], upcoming: [], undated: [] };

  eachFocusTask(todoData, (entry) => {
    const { task, stackName } = entry;

    const isTerminal = task.statusChar === 'x' || task.statusChar === '-';
    if (isTerminal && (isToday(task.text) || isCompletedToday(task.text))) {
      now.push({ ...entry, ...dueGrouping(task) });
      return;
    }
    if (isTerminal) {
      done.push(entry);
      return;
    }
    if (task.statusChar !== ' ' && task.statusChar !== '~') return;

    if (stackName === 'WIP' || isOnDeckThisWeek(task.text)) {
      const onDeckEntry = { ...entry, ...dueGrouping(task) };
      const isUrgent = onDeckEntry.dueGroup === 'today' || onDeckEntry.dueGroup === 'overdue';
      const isDatedQueue = task.statusChar === ' '
          && String(onDeckEntry.dueGroup).startsWith('day-');
      const belongsInProgressQueue = !isUrgent
          && (task.statusChar === '~' || isDatedQueue);
      (belongsInProgressQueue ? inProgressQueued : now).push(onDeckEntry);
      return;
    }

    const group = classifyUpNextGroup(task);
    upNextGroups[group].push({ ...entry, group });
  });

  inProgressQueued.sort(byDueDate);
  now.sort(byDueDate);
  upNextGroups.upcoming.sort((a, b) => dueTimeOf(a) - dueTimeOf(b));

  return {
    inProgressQueued,
    now,
    upNext: UP_NEXT_GROUP_ORDER.flatMap(group => upNextGroups[group]),
    done
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
