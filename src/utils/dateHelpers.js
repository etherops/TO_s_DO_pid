// utils/dateHelpers.js

/**
 * Extract date from task text with due date format !!(date)
 * @param {string} text - Task text
 * @returns {Date|null} Extracted date or null
 */
export const extractDateFromText = (text) => {
    if (!text || !text.includes('!!(')) return null;

    // Extract the text after !!
    const dueDatePart = text.match(/!!\s*\((.*?)\)/)?.[1].trim();
    if (!dueDatePart) return null;

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

    // Create a date object
    const date = new Date(`${month} ${day}, ${new Date().getFullYear()}`);

    // If the date is in the past (e.g., "May 1" when it's already December),
    // assume it's for next year
    if (date < new Date() && date.getMonth() < new Date().getMonth()) {
        date.setFullYear(date.getFullYear() + 1);
    }

    return date;
};

/**
 * Check if the task is past due
 * @param {string} text - Task text
 * @returns {boolean} True if past due
 */
export const isPast = (text) => {
    const date = extractDateFromText(text);
    if (!date) return false;

    const today = new Date(new Date().setHours(0, 0, 0, 0));
    return date < today;
};

/**
 * Check if the task is due today
 * @param {string} text - Task text
 * @returns {boolean} True if due today
 */
export const isToday = (text) => {
    const date = extractDateFromText(text);
    if (!date) return false;

    const today = new Date();
    return (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear());
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
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

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
    const date = extractDateFromText(text);
    return date ? formatDateForTooltip(date) : 'No due date';
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