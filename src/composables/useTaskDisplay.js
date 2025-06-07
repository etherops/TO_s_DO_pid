// composables/useTaskDisplay.js
import { getStrippedDisplayText } from '../utils/taskTextHelpers';

/**
 * Update task display text by removing notes and due dates
 * @param {Object} task - Task object to update
 */
export const updateTaskDisplayText = (task) => {
    if (!task || !task.text) return;

    // Use the consolidated helper to get clean display text
    task.displayText = getStrippedDisplayText(task.text);
};

/**
 * Process all tasks in sections to update display text
 * @param {Array} sections - Array of sections containing tasks
 */
export const processAllTasksDisplayText = (sections) => {
    sections.forEach(section => {
        if (section.items && section.items.length > 0) {
            section.items.forEach(task => {
                updateTaskDisplayText(task);
            });
        }
    });
};