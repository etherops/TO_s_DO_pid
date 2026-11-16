import { extractDuePeriod, formatDuePeriodValue } from './dateHelpers';
import { ensureColumnRoot } from './columnRootHelpers';

export const taskLocations = data => (data.columnOrder || []).flatMap(columnKey => {
  const column = data.columnStacks[columnKey];
  if (!column || column.type === 'raw-text') return [];
  return (column.sections || []).flatMap(section => (section.items || [])
    .filter(task => task.type === 'task').map(task => ({ columnKey, column, section, task })));
});

export const ensureWorkflowRoot = (data, category) => {
  let columnKey = data.columnOrder.find(key => data.columnStacks[key]?.name === category
    && !/^PROJECTS?$/i.test(key) && !data.columnStacks[key].on_ice && !key.toUpperCase().includes('ICE'));
  if (!columnKey) {
    columnKey = category;
    let suffix = 2;
    while (data.columnStacks[columnKey]) columnKey = `${category} ${suffix++}`;
    data.columnOrder.push(columnKey);
    data.columnStacks[columnKey] = { name: category, sections: [] };
  }
  return ensureColumnRoot(data.columnStacks[columnKey]);
};

// An explicit date edit moves only the top-level task. A child is never detached or relocated.
export const placeDatedTask = (data, task) => {
  const location = taskLocations(data).find(entry => entry.task === task);
  if (!location || location.column.name === 'DONE' || ['x', '-'].includes(task.statusChar)) return false;
  const category = task.listMarker === '+' || !extractDuePeriod(task.text) ? 'SELECTED' : 'WIP';
  if (location.column.name === category && !/^PROJECTS?$/i.test(location.columnKey)) return false;
  location.section.items.splice(location.section.items.indexOf(task), 1);
  ensureWorkflowRoot(data, category).items.push(task);
  return true;
};

export const captureWorkflowState = data => new Map(taskLocations(data).map(({ task }) => [task.id, {
  date: formatDuePeriodValue(extractDuePeriod(task.text)), marker: task.listMarker,
  terminal: ['x', '-'].includes(task.statusChar)
}]));

// Run at the shared edit/save boundary, not on load, navigation, undo, or time changes.
// This covers inline text edits, date pickers, drag scheduling and new tasks in every mode.
export const reconcileWorkflowEdits = (data, previous) => {
  for (const { task } of taskLocations(data)) {
    const before = previous.get(task.id);
    const date = formatDuePeriodValue(extractDuePeriod(task.text));
    const terminal = ['x', '-'].includes(task.statusChar);
    if (terminal || before?.terminal) continue; // Lifecycle timestamps are not scheduling edits.
    const dateChanged = before ? before.date !== date : Boolean(date);
    const priorityChanged = before?.marker !== task.listMarker
      && (task.listMarker === '+' || Boolean(date));
    if (dateChanged || priorityChanged) placeDatedTask(data, task);
  }
};
