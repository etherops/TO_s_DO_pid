import { taskPriority } from './priorityHelpers';
import { getStrippedDisplayText } from './taskTextHelpers';

// Resolve against the live document for every action, never a stale menu snapshot.
export const subtaskParentEntries = data => (data?.columnOrder || []).flatMap(columnKey => {
  const column = data.columnStacks[columnKey];
  if (!column || column.type === 'raw-text') return [];
  return (column.sections || []).flatMap(section => (section.items || [])
    .filter(task => task.type === 'task')
    .map(task => ({ task, section, columnKey,
      frozen: column.name === 'DONE' || column.on_ice || columnKey.toUpperCase().includes('ICE') || section.on_ice })));
});

export const findSubtask = (data, id) => {
  for (const entry of subtaskParentEntries(data)) {
    const child = entry.task.children?.find(item => item.type === 'subtask' && item.id === id);
    if (child) return { ...entry, parent: entry.task, task: child };
  }
  return null;
};

export const isEligibleSubtaskParent = entry => {
  if (entry.frozen) return false;
  const priority = taskPriority(entry.task);
  return priority === 'high' || (priority === 'normal' && !['x', '-'].includes(entry.task.statusChar));
};

export const eligibleSubtaskParents = (data, childId) => {
  const source = findSubtask(data, childId);
  if (!source || source.frozen) return [];
  return subtaskParentEntries(data).filter(entry => entry.task !== source.parent && isEligibleSubtaskParent(entry));
};

export const applySubtaskAction = (data, childId, action, parentId) => {
  const source = findSubtask(data, childId);
  if (!source || source.frozen) return null;
  const { task, parent, section } = source;
  if (action === 'move') {
    const target = eligibleSubtaskParents(data, childId).find(entry => entry.task.id === parentId);
    if (!target) return null;
    target.task.children = [...(target.task.children || []), task];
  } else if (action === 'detach') {
    Object.assign(task, { type: 'task', listMarker: '*', isLowPriority: false,
      displayText: getStrippedDisplayText(task.text) });
    section.items.splice(section.items.indexOf(parent) + 1, 0, task);
  } else if (action !== 'delete') return null;
  parent.children = parent.children.filter(child => child !== task);
  return source;
};
