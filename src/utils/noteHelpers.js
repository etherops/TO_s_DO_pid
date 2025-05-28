// utils/noteHelpers.js

/**
 * Extract note from task text (content in parentheses, excluding due dates)
 * @param {string} text - Task text
 * @returns {string|null} Extracted note or null
 */
export const extractNoteFromText = (text) => {
    if (!text) return null;

    // First, remove due date patterns to avoid confusion
    const textWithoutDueDate = text.replace(/!!\s*\([^)]*\)/g, '');

    // Find parentheses content that is NOT preceded by !!
    // This regex looks for ( ) that are not part of !!( )
    const noteMatch = textWithoutDueDate.match(/\(([^)]+)\)/);

    if (noteMatch && noteMatch[1]) {
        // Unescape newlines for display
        return noteMatch[1].trim().replace(/\\n/g, '\n');
    }

    return null;
};

/**
 * Check if a task has a note
 * @param {string} text - Task text
 * @returns {boolean} True if has note
 */
export const hasNote = (text) => {
    return extractNoteFromText(text) !== null;
};

/**
 * Remove note from text for display
 * @param {string} text - Task text
 * @returns {string} Text without note
 */
export const getDisplayTextWithoutNote = (text) => {
    if (!text) return text;

    // First, temporarily replace due date patterns to preserve them
    const dueDatePlaceholder = '___DUE_DATE___';
    const dueDates = [];
    let textWithPlaceholders = text.replace(/!!\s*\([^)]*\)/g, (match) => {
        dueDates.push(match);
        return dueDatePlaceholder;
    });

    // Remove notes (parentheses not part of due dates)
    textWithPlaceholders = textWithPlaceholders.replace(/\s*\([^)]+\)/g, '');

    // Restore due dates
    dueDates.forEach((dueDate) => {
        textWithPlaceholders = textWithPlaceholders.replace(dueDatePlaceholder, dueDate);
    });

    return textWithPlaceholders.trim();
};

/**
 * Update note in task text
 * @param {string} text - Original task text
 * @param {string} newNote - New note content
 * @returns {string} Updated task text
 */
export const updateNoteInText = (text, newNote) => {
    if (!text) return text;

    // First, extract due date to preserve it
    const dueDateMatch = text.match(/!!\s*\([^)]*\)/);
    const dueDate = dueDateMatch ? dueDateMatch[0] : '';

    // Remove existing note and due date
    let baseText = text.replace(/!!\s*\([^)]*\)/g, ''); // Remove due date
    baseText = baseText.replace(/\s*\([^)]+\)/g, ''); // Remove note
    baseText = baseText.trim();

    // Rebuild text with new note and preserved due date
    let newText = baseText;
    if (newNote && newNote.trim()) {
        // Escape newlines for storage
        const escapedNote = newNote.trim().replace(/\n/g, '\\n');
        newText += ` (${escapedNote})`;
    }
    if (dueDate) {
        newText += ` ${dueDate}`;
    }

    return newText;
};

/**
 * Get display text without both note and due date
 * @param {string} text - Task text
 * @returns {string} Clean display text
 */
export const getStrippedDisplayText = (text) => {
    if (!text) return text;

    // Remove due dates
    let cleanText = text.replace(/!!\s*\([^)]*\)/g, '');

    // Remove notes
    cleanText = cleanText.replace(/\s*\([^)]+\)/g, '');

    return cleanText.trim();
};