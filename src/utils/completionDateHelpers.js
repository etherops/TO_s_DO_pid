import { MONTH_NAMES, removeDueDate, serializeDuePeriodValue } from './dateHelpers';

const parseDay = (value) => {
  const match = String(value || '').match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_NAMES.findIndex(name => name.toLowerCase() === match[1].slice(0, 3).toLowerCase());
  const date = new Date(Number(match[3]), month, Number(match[2]));
  date.setHours(0, 0, 0, 0);
  return month >= 0 && date.getMonth() === month && date.getDate() === Number(match[2]) ? date : null;
};

export const formatCompletionDate = (date = new Date()) => {
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `| ${serializeDuePeriodValue(value)}`;
};

export const extractCompletionDate = (text) => String(text || '').match(/(?:^|\s)\|\s+([^!|]+?)\s*$/)?.[1]?.trim() || null;
export const extractCompletionDateValue = (text) => parseDay(extractCompletionDate(text));
export const hasCompletionDate = (text) => Boolean(extractCompletionDateValue(text));
export const isCompletedToday = (text, today = new Date()) => extractCompletionDateValue(text)?.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

export const removeCompletionDate = (text) => {
  const value = String(text || '');
  return hasCompletionDate(value) ? value.replace(/\s+\|\s+[^!|]+?\s*$/, '').trim() : value.trim();
};

export const addCompletionDate = (text, date = new Date()) => `${removeCompletionDate(removeDueDate(text))} ${formatCompletionDate(date)}`.trim();

export const setCompletionDate = (text, value) => {
  const base = removeCompletionDate(removeDueDate(text));
  const storage = serializeDuePeriodValue(value);
  return storage && !value.startsWith('week:') && !value.startsWith('month:')
    ? `${base} | ${storage}`
    : base;
};

export const reopenCompletionDate = (text) => {
  const date = extractCompletionDateValue(text);
  const base = removeCompletionDate(text);
  if (!date) return base;
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${base} ! ${serializeDuePeriodValue(value)}`.trim();
};

export const reconcileLifecycleDateForStatus = (text, statusChar, completionDate = new Date()) => {
  const terminal = statusChar === 'x' || statusChar === '-';
  if (terminal) return hasCompletionDate(text) ? text : addCompletionDate(text, completionDate);
  return hasCompletionDate(text) ? reopenCompletionDate(text) : text;
};

export const getCompletionBadgeFromText = (text) => extractCompletionDate(text);
