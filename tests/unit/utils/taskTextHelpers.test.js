import { describe, expect, it } from 'vitest';
import { updateTaskNameAndDueDate } from '../../../src/utils/taskTextHelpers';

describe('updateTaskNameAndDueDate', () => {
  it('updates the visible name while preserving its note', () => {
    expect(updateTaskNameAndDueDate('Old name (important note) ! Aug 12 2026', 'New name', '2026-08-14'))
      .toBe('New name (important note) ! Aug 14 2026');
  });

  it('adds and clears due dates', () => {
    expect(updateTaskNameAndDueDate('Task (note)', 'Task', '2026-09-03')).toBe('Task (note) ! Sep 3 2026');
    expect(updateTaskNameAndDueDate('Task (note) ! Sep 3 2026', 'Task', '')).toBe('Task (note)');
  });

  it('adds week and month due periods', () => {
    expect(updateTaskNameAndDueDate('Task', 'Task', 'week:2026-08-16')).toBe('Task ! Aug Week #3 2026');
    expect(updateTaskNameAndDueDate('Task', 'Task', 'month:2026-09')).toBe('Task ! Sep 2026');
  });

  it('rejects an empty task name', () => {
    expect(updateTaskNameAndDueDate('Keep me ! Aug 12 2026', '  ', '')).toBe('Keep me ! Aug 12 2026');
  });
});
