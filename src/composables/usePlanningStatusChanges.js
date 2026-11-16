import { onScopeDispose, reactive } from 'vue';
import { extractDuePeriod, formatDuePeriodValue, removeDueDate, setDuePeriod } from '../utils/dateHelpers';
import { extractCompletionDateValue, reconcileLifecycleDateForStatus, removeCompletionDate } from '../utils/completionDateHelpers';
import { nextTaskStatus } from '../utils/statusHelpers';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { findTargetIndex, getBoardTaskSortPriority, performTaskSwaps } from '../utils/sortHelpers';

// One cycle per task, shared by its source card and every Plan projection.
// Save status/date immediately; defer only position, group membership and source sorting.
export const usePlanningStatusChanges = onChange => {
  const pending = reactive(new Map());
  const timers = new Map();
  const reset = () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    pending.clear();
  };
  onScopeDispose(reset);

  const cycle = (task, section) => {
    if (!pending.has(task.id)) pending.set(task.id, {
      status: task.statusChar, period: extractDuePeriod(task.text),
      completionDate: extractCompletionDateValue(task.text), text: task.text
    });
    const start = pending.get(task.id);
    clearTimeout(timers.get(task.id));
    task.statusChar = nextTaskStatus(task.statusChar, start.status);
    const period = start.period || (start.completionDate ? { kind: 'day', start: start.completionDate } : null);
    const base = removeCompletionDate(removeDueDate(task.text));
    task.text = ['x', '-'].includes(task.statusChar)
      ? reconcileLifecycleDateForStatus(base, task.statusChar, start.completionDate || new Date())
      : setDuePeriod(base, period ? formatDuePeriodValue(period) : '');
    task.displayText = getStrippedDisplayText(task.text);
    timers.set(task.id, setTimeout(() => {
      timers.delete(task.id);
      pending.delete(task.id);
      const index = section.items.indexOf(task);
      if (index >= 0) {
        const target = findTargetIndex(section.items, index, getBoardTaskSortPriority(task), item => {
          const held = pending.get(item.id);
          return getBoardTaskSortPriority(held ? { ...item, statusChar: held.status } : item);
        });
        performTaskSwaps(section.items, index, target);
      }
      onChange();
    }, 1500));
    onChange();
  };

  return { pending, cycle, reset, layoutStatus: task => pending.get(task.id)?.status ?? task.statusChar };
};
