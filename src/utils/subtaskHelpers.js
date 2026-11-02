import { getStrippedDisplayText } from './taskTextHelpers';
import { removeDueDate } from './dateHelpers';
import { removeCompletionDate } from './completionDateHelpers';

export const saveSubtaskEdits = (parent, rows) => {
  const children = rows.filter(row => row.type !== 'subtask' || row.text.trim()).map(row => ({ ...row }));
  if (JSON.stringify(parent.children || []) === JSON.stringify(children)) return false;
  parent.children = children;
  return true;
};

export const detachAllSubtasks = (parent, section) => {
  const parentIndex = section.items.indexOf(parent);
  if (parentIndex < 0) return;
  const children = parent.children || [];
  const subtasks = children.filter(child => child.type === 'subtask');
  subtasks.forEach(child => Object.assign(child, {
    type: 'task', listMarker: '*', isLowPriority: false,
    displayText: getStrippedDisplayText(child.text)
  }));
  parent.children = children.filter(child => !subtasks.includes(child));
  section.items.splice(parentIndex + 1, 0, ...subtasks);
};

// Edit only the visible title. Keep hidden notes and lifecycle suffixes verbatim.
export const updateSubtaskTitle = (text, title) => {
  if (title === getStrippedDisplayText(text)) return text;
  const body = removeDueDate(removeCompletionDate(text));
  const suffix = text.slice(body.length);
  const parts = body.split(/(\([^)]*\))/g);
  let inserted = false;
  const updated = parts.map((part, index) => {
    if (index % 2) return part;
    if (!inserted && part.trim()) { inserted = true; return `${title}${part.endsWith(' ') ? ' ' : ''}`; }
    return part.trim() ? ' ' : part;
  }).join('');
  return `${inserted ? updated.trim() : `${title} ${body}`.trim()}${suffix}`;
};
