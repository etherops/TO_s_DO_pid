import {
  extractDuePeriod, formatDuePeriodValue, formatWeekPeriodLabel, getDuePeriodLabel,
  serializeDuePeriodValue, setDuePeriod, startOfSundayWeek
} from './dateHelpers';
import { getStrippedDisplayText } from './taskTextHelpers';
import { extractCompletionDateValue } from './completionDateHelpers';
import { ensureWorkflowRoot, placeDatedTask } from './taskWorkflow';

export const planningColumns = todoData => (todoData.columnOrder || [])
  .filter(key => todoData.columnStacks[key]?.type !== 'raw-text' && todoData.columnStacks[key])
  .map(key => ({ key, ...todoData.columnStacks[key] }));

const isOpen = task => !['x', '-'].includes(task.statusChar);
const isFrozen = column => column.on_ice || column.key.toUpperCase().includes('ICE');
const precision = { day: 0, week: 1, month: 2 };
const compareDuePeriods = (a, b) => a.period.end - b.period.end
  || precision[a.period.kind] - precision[b.period.kind] || a.period.start - b.period.start;

// Keep day, week, and month assignments distinct, even when their dates overlap.
export const groupPlanningEntriesByDuePeriod = entries => {
  const groups = new Map();
  for (const entry of entries) {
    const { period } = entry;
    if (!period) continue;
    const value = formatDuePeriodValue(period);
    if (!groups.has(value)) {
      const label = period.kind === 'week' ? formatWeekPeriodLabel(period.start, { includeYear: true })
        : period.start.toLocaleDateString('en-US', period.kind === 'month'
          ? { month: 'long', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
      groups.set(value, { id: value, value, label, period, entries: [] });
    }
    groups.get(value).entries.push(entry);
  }
  return [...groups.values()].sort(compareDuePeriods);
};

// Week-wide work leads each week; exact days follow without changing stored date precision.
export const groupPlanningFutureByWeek = entries => {
  const weeks = new Map();
  for (const subgroup of groupPlanningEntriesByDuePeriod(entries)) {
    const isMonth = subgroup.period.kind === 'month';
    const start = isMonth ? subgroup.period.start : startOfSundayWeek(subgroup.period.start);
    const value = formatDuePeriodValue({ kind: isMonth ? 'month' : 'week', start });
    if (!weeks.has(value)) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      weeks.set(value, {
        id: value, value,
        label: isMonth ? subgroup.label : formatWeekPeriodLabel(start, { includeYear: true }),
        period: isMonth ? subgroup.period : { kind: 'week', start, end },
        entries: [], subgroups: []
      });
    }
    const group = weeks.get(value);
    group.entries.push(...subgroup.entries);
    group.subgroups.push({ ...subgroup, label: subgroup.period.kind === 'day'
      ? subgroup.period.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      : '' });
  }
  for (const group of weeks.values()) {
    group.subgroups.sort((a, b) => Number(b.period.kind === 'week') - Number(a.period.kind === 'week')
      || a.period.start - b.period.start);
  }
  return [...weeks.values()].sort(compareDuePeriods);
};

export const groupPlanningEntriesByCompletionDay = entries => {
  const groups = new Map();
  for (const entry of entries) {
    const date = entry.completionDate === undefined ? extractCompletionDateValue(entry.task.text) : entry.completionDate;
    const id = date ? formatDuePeriodValue({ kind: 'day', start: date }) : 'undated';
    if (!groups.has(id)) {
      const label = date ? date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      }) : 'No completion date';
      groups.set(id, { id, label, date, entries: [] });
    }
    groups.get(id).entries.push(entry);
  }
  return [...groups.values()].sort((a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity));
};

export const planningArchiveSections = data => planningColumns(data)
  .filter(column => ['SELECTED', 'WIP'].includes(column.name) && !isFrozen(column))
  .flatMap(column => column.sections || [])
  .filter(section => section.type === 'section' && !section.on_ice);

export const planningDateGroups = (referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const dayValue = formatDuePeriodValue({ kind: 'day', start: today });
  const weekValue = formatDuePeriodValue({ kind: 'day', start: startOfSundayWeek(today) });
  return [
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Today', value: dayValue },
    { id: 'week', label: 'Rest of this week', value: `week:${weekValue}` },
    { id: 'month', label: 'Rest of this month', value: `month:${dayValue.slice(0, 7)}` },
    { id: 'future', label: 'Future' }
  ].map(group => ({ ...group, entries: [] }));
};

const scheduleGroup = (period, today) => {
  const nextWeek = startOfSundayWeek(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  if (period.end < today) return 'overdue';
  if (period.kind === 'day' && period.start <= today) return 'today';
  if (period.kind !== 'month' && period.start < nextWeek) return 'week';
  if (period.start < nextMonth) return 'month';
  return 'future';
};

// A projection of original objects, never filtered copies of writable section.items arrays.
export const derivePlanningModel = (todoData, referenceDate = new Date(), pendingStatuses = new Map()) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const schedule = planningDateGroups(today);
  const backlog = [];
  const needsDate = [];
  const completed = [];
  const projects = [];
  const columns = planningColumns(todoData);
  const addScheduled = entry => schedule.find(group => group.id === scheduleGroup(entry.period, today))
    .entries.push(entry);

  for (const column of columns) {
    if (column.name === 'DONE') continue;
    const sections = [];
    const activeColumn = ['SELECTED', 'WIP'].includes(column.name);
    (column.sections || []).forEach((section, sectionIndex) => {
      const frozen = Boolean(isFrozen(column) || section.on_ice);
      const entries = [];
      const raw = [];
      for (const task of section.items || []) {
        if (task.type !== 'task') { raw.push(task); continue; }
        const pending = pendingStatuses.get(task.id);
        const entry = {
          task, columnKey: column.key, columnType: column.name, section, sectionIndex, frozen,
          period: pending ? pending.period : extractDuePeriod(task.text),
          completionDate: pending ? pending.completionDate : extractCompletionDateValue(task.text),
          layoutStatus: pending ? pending.status : task.statusChar, title: getStrippedDisplayText(task.text),
          dateLabel: getDuePeriodLabel(task.text), parent: null
        };
        if (task.listMarker === '+') projects.push(entry);
        if (frozen) entries.push(entry);
        else if (['x', '-'].includes(entry.layoutStatus)) completed.push(entry);
        else if (entry.period) addScheduled(entry);
        else if (activeColumn) needsDate.push(entry);
        else entries.push(entry);
        if (frozen) continue;
        for (const child of task.children || []) {
          const held = pendingStatuses.get(child.id);
          const status = held ? held.status : child.statusChar;
          const period = child.type === 'subtask' && !['x', '-'].includes(status)
            && (held ? held.period : extractDuePeriod(child.text));
          if (!period) continue;
          const childEntry = { ...entry, task: child, parent: task, period, layoutStatus: status,
            title: getStrippedDisplayText(child.text), dateLabel: getDuePeriodLabel(child.text) };
          addScheduled(childEntry);
        }
      }
      if (entries.length || raw.length || section.type === 'raw-text' || !['SELECTED', 'WIP'].includes(column.name)) {
        sections.push({ section, sectionIndex, entries, raw, frozen });
      }
    });
    if (sections.length) backlog.push({ ...column, sections });
  }
  schedule.forEach(group => group.entries.sort(compareDuePeriods));
  return { backlog, schedule, needsDate, completed, projects,
    archives: columns.filter(column => column.name === 'DONE') };
};

export const derivePlanningSchedule = (data, date) => derivePlanningModel(data, date).schedule
  .filter(group => group.entries.length);

// Called only on an explicit date edit, never on load or as the calendar advances.
export const reconcilePlanningDate = (data, entry, forceBacklog = false, targetCategory = null) => {
  if (entry.parent || entry.frozen || !isOpen(entry.task)) return false;
  const period = extractDuePeriod(entry.task.text);
  if (!forceBacklog && !targetCategory && formatDuePeriodValue(period) === formatDuePeriodValue(entry.period)) return false;
  return placeDatedTask(data, entry.task);
};

export const schedulePlanningEntry = (data, entry, value, targetCategory = null) => {
  if (entry.frozen || !isOpen(entry.task)) return false;
  if (targetCategory && !['SELECTED', 'WIP'].includes(targetCategory)) return false;
  if (value && !serializeDuePeriodValue(value)) return false;
  if (!(entry.parent ? entry.parent.children : entry.section.items)?.includes(entry.task)) return false;
  const text = setDuePeriod(entry.task.text, value);
  if (value && !extractDuePeriod(text)) return false;
  const changed = text !== entry.task.text;
  entry.task.text = text;
  entry.task.displayText = getStrippedDisplayText(text);
  const moved = reconcilePlanningDate(data, entry, !value && ['SELECTED', 'WIP'].includes(entry.columnType), targetCategory);
  return changed || moved;
};

export const addPlanningTask = (data, section = null) => {
  const target = section || ensureWorkflowRoot(data, 'TODO');
  const task = { type: 'task', id: `task-${crypto.randomUUID()}`, text: '', displayText: '',
    listMarker: '*', statusChar: ' ', isNew: true };
  target.items.push(task);
  return task;
};
