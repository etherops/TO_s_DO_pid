// utils/dateHelpers.js

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const atStartOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const atEndOfDay = (date) => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
};

const parseMonth = (name) => MONTH_NAMES.findIndex(month =>
    month.toLowerCase() === name.substring(0, 3).toLowerCase()
);

/** Parse an exact day, Sunday-Saturday week, or calendar month from !!(...). */
export const extractDuePeriod = (text) => {
    if (!text || !text.includes('!!(')) return null;

    // Extract the text after !!
    const dueDatePart = text.match(/!!\s*\((.*?)\)/)?.[1].trim();
    if (!dueDatePart) return null;

    let periodMatch = dueDatePart.match(/^week\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/i);
    if (periodMatch) {
        const monthIndex = parseMonth(periodMatch[1]);
        if (monthIndex === -1) return null;
        const start = atStartOfDay(new Date(Number(periodMatch[3]), monthIndex, Number(periodMatch[2])));
        if (start.getDay() !== 0) return null;
        const end = atEndOfDay(new Date(start));
        end.setDate(end.getDate() + 6);
        return { kind: 'week', start, end, raw: dueDatePart };
    }

    periodMatch = dueDatePart.match(/^month\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (periodMatch) {
        const monthIndex = parseMonth(periodMatch[1]);
        if (monthIndex === -1) return null;
        const year = Number(periodMatch[2]);
        const start = atStartOfDay(new Date(year, monthIndex, 1));
        const end = atEndOfDay(new Date(year, monthIndex + 1, 0));
        return { kind: 'month', start, end, raw: dueDatePart };
    }

    // Try to find a date pattern in various formats
    // Format: Month Day (e.g., "May 15")
    const monthDayPattern = /([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?/i;
    // Format: Day Month (e.g., "15 May")
    const dayMonthPattern = /(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+)/i;
    // Format: Month-Day (e.g., "May-15")
    const monthDayDashPattern = /([A-Za-z]+)-(\d+)/i;
    // Format: Day-Month (e.g., "15-May")
    const dayMonthDashPattern = /(\d+)-([A-Za-z]+)/i;

    let match;
    let month, day;

    if (match = dueDatePart.match(monthDayPattern)) {
        month = match[1];
        day = parseInt(match[2], 10);
    } else if (match = dueDatePart.match(dayMonthPattern)) {
        day = parseInt(match[1], 10);
        month = match[2];
    } else if (match = dueDatePart.match(monthDayDashPattern)) {
        month = match[1];
        day = parseInt(match[2], 10);
    } else if (match = dueDatePart.match(dayMonthDashPattern)) {
        day = parseInt(match[1], 10);
        month = match[2];
    } else {
        return null; // No recognized date format
    }

    // Create a date object - always use current year when no year is specified
    const year = new Date().getFullYear();
    const monthIndex = parseMonth(month);
    
    if (monthIndex === -1) return null;
    
    const date = new Date(year, monthIndex, day);
    date.setHours(0, 0, 0, 0);

    return { kind: 'day', start: date, end: atEndOfDay(date), raw: dueDatePart };
};

/** Compatibility helper for code that needs a single sortable date. */
export const extractDateFromText = (text) => {
    return extractDuePeriod(text)?.start || null;
};

export const formatDuePeriodValue = (period) => {
    if (!period) return '';
    const year = period.start.getFullYear();
    const month = String(period.start.getMonth() + 1).padStart(2, '0');
    const day = String(period.start.getDate()).padStart(2, '0');
    if (period.kind === 'month') return `month:${year}-${month}`;
    if (period.kind === 'week') return `week:${year}-${month}-${day}`;
    return `${year}-${month}-${day}`;
};

export const serializeDuePeriodValue = (value) => {
    if (!value) return '';
    const monthNames = MONTH_NAMES;
    if (value.startsWith('month:')) {
        const [year, month] = value.slice(6).split('-').map(Number);
        return month >= 1 && month <= 12 ? `month ${monthNames[month - 1]} ${year}` : '';
    }
    if (value.startsWith('week:')) {
        const [year, month, day] = value.slice(5).split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDay() === 0 ? `week ${monthNames[month - 1]} ${day} ${year}` : '';
    }
    const [, month, day] = value.split('-').map(Number);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? `${monthNames[month - 1]} ${day}` : '';
};

export const getDuePeriodLabel = (text, { long = false } = {}) => {
    const period = extractDuePeriod(text);
    if (!period) return '';
    if (period.kind === 'month') {
        return period.start.toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
    }
    if (period.kind === 'week') {
        const start = period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = period.end.toLocaleDateString('en-US', {
            month: period.start.getMonth() === period.end.getMonth() ? undefined : 'short', day: 'numeric',
            year: long ? 'numeric' : undefined
        });
        return `${start}–${end}`;
    }
    return long ? formatDateForTooltip(period.start) : period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Check if the task is past due
 * @param {string} text - Task text
 * @returns {boolean} True if past due
 */
export const isPast = (text) => {
    const period = extractDuePeriod(text);
    if (!period) return false;

    const today = new Date(new Date().setHours(0, 0, 0, 0));
    return period.end < today;
};

/**
 * Check if the task is due today
 * @param {string} text - Task text
 * @returns {boolean} True if due today
 */
export const isToday = (text) => {
    const period = extractDuePeriod(text);
    if (!period || period.kind !== 'day') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return period.start.getTime() === today.getTime();
};

/**
 * Check if the task is due soon (within 3 days)
 * @param {string} text - Task text
 * @returns {boolean} True if due soon
 */
export const isSoon = (text) => {
    const date = extractDateFromText(text);
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    // Only include future dates within the next 3 days, excluding today and past dates
    return date >= tomorrow && date <= threeDaysFromNow;
};

/**
 * Check if a task has a due date
 * @param {string} text - Task text
 * @returns {boolean} True if has due date
 */
export const hasDueDate = (text) => {
    return text && text.includes('!!(');
};

/**
 * Format a date for display in tooltip
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForTooltip = (date) => {
    if (!date) return '';

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
};

/**
 * Get formatted due date for tooltip
 * @param {string} text - Task text
 * @returns {string} Formatted tooltip text
 */
export const getDueDateTooltip = (text) => {
    const period = extractDuePeriod(text);
    if (!period) return 'No due date';
    if (period.kind === 'day') return formatDateForTooltip(period.start);
    return period.kind === 'week'
        ? `Due during ${getDuePeriodLabel(text, { long: true })}`
        : `Due during ${period.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
};

/**
 * Remove due date from text for display
 * @param {string} text - Task text
 * @returns {string} Text without due date
 */
export const getDisplayTextWithoutDueDate = (text) => {
    if (!text || !text.includes('!!(')) return text;

    // Remove the due date pattern and trim
    return text.replace(/!!\s*\([^)]*\)/g, '').trim();
};

/**
 * Get month and year from task text for mini calendar
 * @param {string} text - Task text with due date
 * @returns {string} Formatted month and year (e.g., "May 2024")
 */
export const getMonthYear = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  if (period.kind !== 'day') return period.kind === 'week' ? 'WEEK' : 'MONTH';
  const dateStr = period.start;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/**
 * Get day number from task text for mini calendar
 * @param {string} text - Task text with due date
 * @returns {number|string} Day number or original string if invalid
 */
export const getDayNumber = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  if (period.kind !== 'day') return getDuePeriodLabel(text);
  const dateStr = period.start;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.getDate();
};

/**
 * Get weekday from task text for mini calendar
 * @param {string} text - Task text with due date
 * @returns {string} Abbreviated weekday (e.g., "Mon", "Tue")
 */
export const getWeekday = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  if (period.kind !== 'day') return period.kind === 'week' ? 'SUN–SAT' : 'ANY DAY';
  const dateStr = period.start;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};
