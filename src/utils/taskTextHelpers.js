// utils/noteHelpers.js

import { extractDuePeriod, removeDueDate, serializeDuePeriodValue } from './dateHelpers';
import { extractCompletionDate, removeCompletionDate } from './completionDateHelpers';

/**
 * Extract note from task text (content in parentheses, excluding due dates)
 * @param {string} text - Task text
 * @returns {string|null} Extracted note or null
 */
export const extractNoteFromText = (text) => {
    if (!text) return null;

    const textWithoutDueDate = removeDueDate(removeCompletionDate(text));

    // Lifecycle dates are removed first, leaving parentheses as task notes.
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

    const due = extractDuePeriod(text);
    const completion = extractCompletionDate(text);
    let textWithPlaceholders = removeDueDate(removeCompletionDate(text));

    // Remove notes (parentheses not part of due dates)
    textWithPlaceholders = textWithPlaceholders.replace(/\s*\([^)]+\)/g, '');

    if (due) textWithPlaceholders += ` ! ${due.raw}`;
    if (completion) textWithPlaceholders += ` | ${completion}`;

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

    const due = extractDuePeriod(text);
    const completion = extractCompletionDate(text);
    let baseText = removeDueDate(removeCompletionDate(text));
    baseText = baseText.replace(/\s*\([^)]+\)/g, ''); // Remove note
    baseText = baseText.trim();

    // Rebuild text with new note and preserved due date
    let newText = baseText;
    if (newNote && newNote.trim()) {
        // Escape newlines for storage
        const escapedNote = newNote.trim().replace(/\n/g, '\\n');
        newText += ` (${escapedNote})`;
    }
    if (due) newText += ` ! ${due.raw}`;
    if (completion) newText += ` | ${completion}`;

    return newText;
};

/**
 * Get display text without both note and due date
 * @param {string} text - Task text
 * @returns {string} Clean display text
 */
export const getStrippedDisplayText = (text) => {
    if (!text) return text;

    let cleanText = removeDueDate(removeCompletionDate(text));

    // Remove notes
    cleanText = cleanText.replace(/\s*\([^)]+\)/g, '');

    return cleanText.trim();
};

/**
 * Replace a task's visible name and due date while preserving its note and
 * completion metadata.
 * @param {string} text - Original task text
 * @param {string} name - New visible task name
 * @param {string} dueDateValue - Optional YYYY-MM-DD value from a date input
 * @returns {string} Updated task text
 */
export const updateTaskNameAndDueDate = (text, name, dueDateValue = '') => {
    const trimmedName = name.trim();
    if (!trimmedName) return text;

    const currentName = getStrippedDisplayText(text);
    const nameIndex = text.indexOf(currentName);
    let updatedText = nameIndex === -1
        ? trimmedName
        : `${text.slice(0, nameIndex)}${trimmedName}${text.slice(nameIndex + currentName.length)}`;

    const completion = extractCompletionDate(updatedText);
    updatedText = removeDueDate(removeCompletionDate(updatedText));

    if (dueDateValue) {
        const dueText = serializeDuePeriodValue(dueDateValue);
        if (dueText) updatedText += ` ! ${dueText}`;
    }

    if (completion) updatedText += ` | ${completion}`;
    return updatedText;
};
