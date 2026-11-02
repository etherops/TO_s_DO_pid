import { extractCompletionDateValue } from './completionDateHelpers';
import { formatWeekPeriodLabel, startOfSundayWeek } from './dateHelpers';

export const groupTasksForArchive = (items, fallbackDate = new Date()) => {
  const groups = new Map();
  for (const task of items) {
    if (task.type !== 'task' || !['x', '-'].includes(task.statusChar)) continue;
    const completed = extractCompletionDateValue(task.text);
    const weekStart = startOfSundayWeek(completed || fallbackDate);
    const name = formatWeekPeriodLabel(weekStart, { includeYear: true });
    if (!groups.has(name)) groups.set(name, {
      name, weekStart, closed: weekStart < startOfSundayWeek(fallbackDate), tasks: [], undatedCount: 0
    });
    const group = groups.get(name);
    group.tasks.push(task);
    if (!completed) group.undatedCount++;
  }
  return [...groups.values()].sort((a, b) => a.weekStart - b.weekStart);
};

export const wipArchiveSections = todoData => (todoData.columnOrder || [])
  .flatMap(key => todoData.columnStacks[key]?.name === 'WIP'
    ? todoData.columnStacks[key].sections || [] : [])
  .filter(section => section.type !== 'raw-text');

const normalizeHeading = name => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const matchingArchiveSections = (sections, group) => (sections || []).filter(section => {
  if (section.type !== 'section') return false;
  const heading = normalizeHeading(section.name);
  if (heading === normalizeHeading(group.name)) return true;
  if (heading !== normalizeHeading(formatWeekPeriodLabel(group.weekStart))) return false;
  // Legacy yearless headings are reused only when dated contents identify this exact week.
  // Never guess the year of an empty/undated section or combine different years.
  const dates = (section.items || []).filter(item => item.type === 'task')
    .map(item => extractCompletionDateValue(item.text)).filter(Boolean);
  return dates.length > 0 && dates.every(date => startOfSundayWeek(date).getTime() === group.weekStart.getTime());
});

// Move the original objects, including children and unsupported Markdown metadata.
export const archiveTaskGroups = (todoData, sections, destination, weekNames, fallbackDate = new Date()) => {
  if (todoData.columnStacks[destination] && todoData.columnStacks[destination].name !== 'DONE') return false;
  const target = todoData.columnStacks[destination];
  const sources = sections.filter(section => !target?.sections.includes(section));
  const groups = groupTasksForArchive(sources.flatMap(section => section.items || []), fallbackDate)
    .filter(group => weekNames.includes(group.name));
  if (!groups.length) return false;
  if (!target) {
    todoData.columnStacks[destination] = { name: 'DONE', sections: [] };
    todoData.columnOrder.push(destination);
  }
  const targetSections = todoData.columnStacks[destination].sections;
  for (const group of groups) {
    const existing = matchingArchiveSections(targetSections, group)[0];
    if (existing) existing.items.push(...group.tasks);
    else targetSections.unshift({
      name: group.name, type: 'section', headerStyle: 'SMALL', archivable: false,
      on_ice: false, items: [...group.tasks]
    });
  }
  const moved = new Set(groups.flatMap(group => group.tasks));
  sources.forEach(section => { section.items = (section.items || []).filter(item => !moved.has(item)); });
  return true;
};
