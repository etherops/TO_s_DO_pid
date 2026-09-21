import { getStrippedDisplayText } from './taskTextHelpers';
import { removeDueDate } from './dateHelpers';
import { removeCompletionDate } from './completionDateHelpers';

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
