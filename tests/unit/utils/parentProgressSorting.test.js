import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBoardTaskSortPriority, getStatusPriority, sortTaskToCorrectPosition } from '../../../src/utils/sortHelpers';

const parent = (statusChar = ' ', childStatuses = [], listMarker = '+') => ({
  id: 'parent', type: 'task', statusChar, listMarker, text: 'Parent (keep note) ! Nov 2026',
  children: childStatuses.map((status, index) => ({
    type: 'subtask', id: `child-${index}`, statusChar: status, text: `Child ${index} (hidden note)`
  }))
});

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Board sorting by parent progress', () => {
  it.each(['+', '*', '-'])('uses child progress for %s parents without changing data', marker => {
    for (const status of ['x', '~', '!', '-']) {
      const task = parent(' ', [' ', status], marker);
      const original = JSON.stringify(task);
      expect(getBoardTaskSortPriority(task)).toBe(getStatusPriority('~'));
      expect(JSON.stringify(task)).toBe(original);
    }
  });

  it('keeps untouched children and unsupported lines unstarted', () => {
    const task = parent(' ', [' ', ' ']);
    task.children.push({ type: 'raw-text', statusChar: 'x', text: '  * [x] unsupported' });
    expect(getBoardTaskSortPriority(task)).toBe(1);
    expect(getBoardTaskSortPriority(parent())).toBe(1);
    expect(getBoardTaskSortPriority({ statusChar: ' ' })).toBe(1);
  });

  it.each(['x', '-', '~', '!'])('honors explicit parent status %s', status => {
    expect(getBoardTaskSortPriority(parent(status, [' ', '~']))).toBe(getStatusPriority(status));
  });

  it('does not automatically complete a parent when all children are terminal', () => {
    expect(getBoardTaskSortPriority(parent(' ', ['x', 'x', '-']))).toBe(2);
  });

  it('moves a partial parent above unstarted work, preserving its children and equal-ranked order', async () => {
    vi.useFakeTimers();
    const task = parent(' ', ['x', ' ', '~']);
    const children = JSON.stringify(task.children);
    const active = { id: 'active', type: 'task', statusChar: '~' };
    const queued = { id: 'queued', type: 'task', statusChar: ' ' };
    const items = [active, queued, task];
    const options = { getPriority: getBoardTaskSortPriority };
    await sortTaskToCorrectPosition(items, task, vi.fn(), options);
    expect(items.map(item => item.id)).toEqual(['active', 'parent', 'queued']);
    await sortTaskToCorrectPosition(items, queued, vi.fn(), options);
    expect(items.map(item => item.id)).toEqual(['active', 'parent', 'queued']);
    expect(task.statusChar).toBe(' ');
    expect(JSON.stringify(task.children)).toBe(children);
    expect(task.text).toBe('Parent (keep note) ! Nov 2026');
  });

  it('leaves the shared default used by Focus based on the stored parent status', async () => {
    vi.useFakeTimers();
    const task = parent(' ', ['x']);
    const items = [{ id: 'queued', type: 'task', statusChar: ' ' }, task];
    expect(await sortTaskToCorrectPosition(items, task, vi.fn())).toBe(false);
    expect(items[1]).toBe(task);
  });
});
