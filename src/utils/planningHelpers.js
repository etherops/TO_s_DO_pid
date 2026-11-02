import { extractDuePeriod, getDuePeriodLabel, startOfSundayWeek } from './dateHelpers';
import { getStrippedDisplayText } from './taskTextHelpers';

export const planningColumns = (todoData) => (todoData.columnOrder || [])
  .filter(key => todoData.columnStacks[key]?.type !== 'raw-text' && todoData.columnStacks[key])
  .map(key => ({ key, ...todoData.columnStacks[key] }));

const isOpen = task => !['x', '-'].includes(task.statusChar);

export const derivePlanningSchedule = (todoData, referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = startOfSundayWeek(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const followingWeek = new Date(nextWeek);
  followingWeek.setDate(followingWeek.getDate() + 7);
  const groups = ['Overdue', 'Today', 'This week', 'Next week', 'This month', 'Later']
    .map(label => ({ label, entries: [] }));

  const addEntry = (task, column, section, sectionIndex, parent = null) => {
    if (!isOpen(task)) return;
    const period = extractDuePeriod(task.text);
    if (!period) return;
    let group = 'Later';
    if (period.end < today) group = 'Overdue';
    else if (period.kind === 'day' && period.start < tomorrow) group = 'Today';
    else if (period.kind !== 'month' && period.start < nextWeek) group = 'This week';
    else if (period.kind !== 'month' && period.start < followingWeek) group = 'Next week';
    else if (period.start.getMonth() === today.getMonth()
      && period.start.getFullYear() === today.getFullYear()) group = 'This month';
    groups.find(candidate => candidate.label === group).entries.push({
      task, columnKey: column.key, section, sectionIndex, parent, period,
      title: getStrippedDisplayText(task.text), dateLabel: getDuePeriodLabel(task.text)
    });
  };

  for (const column of planningColumns(todoData)) {
    if (column.name === 'DONE' || column.on_ice || column.key.toUpperCase().includes('ICE')) continue;
    (column.sections || []).forEach((section, sectionIndex) => {
      if (section.type === 'raw-text' || section.on_ice) return;
      for (const task of section.items || []) {
        if (task.type !== 'task' || !isOpen(task)) continue;
        addEntry(task, column, section, sectionIndex);
        for (const child of task.children || []) {
          if (child.type === 'subtask') addEntry(child, column, section, sectionIndex, task);
        }
      }
    });
  }
  groups.forEach(group => group.entries.sort((a, b) => a.period.end - b.period.end));
  return groups.filter(group => group.entries.length);
};
