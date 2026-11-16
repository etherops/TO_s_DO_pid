// Focus derives scheduled task/child projections without changing Markdown or parent ownership.
import { extractDuePeriod } from './dateHelpers';
import { extractCompletionDateValue, isCompletedToday } from './completionDateHelpers';

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

export const reorderTaskSubsetInSection = (
  sectionItems, eligibleTaskIds, sourceTaskId, targetTaskId, placeAfter = false
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
  if (!slots.some((slot, index) => sectionItems[slot] !== orderedItems[index])) return false;
  slots.forEach((slot, index) => { sectionItems[slot] = orderedItems[index]; });
  return true;
};

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

const eachFocusTask = (todoData, visit) => {
  (todoData?.columnOrder || []).forEach(columnName => {
    const column = todoData.columnStacks?.[columnName];
    if (!column || column.type === 'raw-text' || isIceColumn(columnName)) return;
    if (column.name === 'DONE' || column.on_ice) return;

    (column.sections || []).forEach(section => {
      if (section.type === 'raw-text' || section.on_ice) return;
      (section.items || []).filter(isTaskItem).forEach(task => {
        visit({ task, columnName, stackName: column.name, sectionName: section.name, section });
        (task.children || []).filter(child => child.type === 'subtask'
          && (child.statusChar === '!' || extractDuePeriod(child.text)
            || extractCompletionDateValue(child.text))).forEach(child => {
          visit({ task: child, parentTask: task, columnName, stackName: column.name, sectionName: section.name, section });
        });
      });
    });
  });
};

/**
 * Build the focus model from SELECTED and WIP columns.
 * Whole-week work goes left, today/overdue stays central, and exact future days go right.
 * Earlier completed work is represented only by the read-only calendar.
 * @param {Object} todoData - { columnOrder, columnStacks }
 * @returns {{ inProgressQueued: Array, now: Array, upNext: Array, done: Array }}
 *          entries of shape { task, columnName, sectionName, section, dueGroup?, group? }
 */
export const deriveFocusModel = (todoData, referenceDate = new Date(), {
  hideOverdue = false
} = {}) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const inProgressQueued = [];
  const now = [];
  const upNextGroups = { month: [], week: [], day: [], unscheduled: [] };

  eachFocusTask(todoData, (entry) => {
    const { task } = entry;

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
    if (isTerminal) return;
    if (![' ', '~', '!'].includes(task.statusChar)) return;

    const routedEntry = { ...entry, ...dueGrouping(task, today) };
    if (hideOverdue && routedEntry.dueGroup === 'overdue') return;
    const period = extractDuePeriod(task.text);
    if (['today', 'overdue'].includes(routedEntry.dueGroup)) now.push(routedEntry);
    else if (isCurrentWholeWeek(period, today)) {
      upNextGroups.week.push({ ...routedEntry, dueGroup: 'this-week', group: 'week' });
    } else if (period?.kind === 'day' && period.start <= endOfCurrentWeek(today)) {
      inProgressQueued.push(routedEntry);
    }
  });

  inProgressQueued.sort(byDueDate);
  now.sort(byDueDate);
  Object.values(upNextGroups).forEach(entries => entries.sort((a, b) => dueTimeOf(a) - dueTimeOf(b)));

  return {
    inProgressQueued,
    now,
    upNext: upNextGroups.week,
    done: []
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
