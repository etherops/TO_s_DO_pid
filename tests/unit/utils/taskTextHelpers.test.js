import { describe, expect, it } from 'vitest';
import { updateTaskNameAndDueDate } from '../../../src/utils/taskTextHelpers';

describe('updateTaskNameAndDueDate', () => {
  it('updates the visible name while preserving note, due date, and completion metadata', () => {
    const text = 'Old name (important note) !!(Aug 12) | done: 2026-08-10';

    expect(updateTaskNameAndDueDate(text, 'New name', '2026-08-14')).toBe(
      'New name (important note) !!(Aug 14) | done: 2026-08-10'
    );
  });

  it('adds and clears due dates', () => {
    expect(updateTaskNameAndDueDate('Task (note)', 'Task', '2026-09-03')).toBe('Task (note) !!(Sep 3)');
    expect(updateTaskNameAndDueDate('Task (note) !!(Sep 3)', 'Task', '')).toBe('Task (note)');
  });

  it('rejects an empty task name', () => {
    expect(updateTaskNameAndDueDate('Keep me !!(Aug 12)', '  ', '')).toBe('Keep me !!(Aug 12)');
  });
});
