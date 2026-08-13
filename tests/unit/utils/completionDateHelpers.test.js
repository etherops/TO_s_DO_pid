import { describe, expect, it } from 'vitest';
import {
  addCompletionDate,
  extractCompletionDateValue,
  reconcileLifecycleDateForStatus,
  reopenCompletionDate,
  setCompletionDate
} from '../../../src/utils/completionDateHelpers';

describe('canonical lifecycle dates', () => {
  it('replaces a due period with the exact completion day', () => {
    expect(addCompletionDate('Task ! Aug 2026', new Date(2026, 7, 13))).toBe('Task | Aug 13 2026');
  });

  it('turns a completion day into the new due day when reopened', () => {
    expect(reopenCompletionDate('Task | Aug 13 2026')).toBe('Task ! Aug 13 2026');
  });

  it('edits and parses a completion day', () => {
    expect(setCompletionDate('Task | Aug 12 2026', '2026-08-11')).toBe('Task | Aug 11 2026');
    expect(extractCompletionDateValue('Task | Aug 11 2026')).toEqual(new Date(2026, 7, 11));
  });

  it('does not accept week or month precision for completion', () => {
    expect(setCompletionDate('Task | Aug 12 2026', 'month:2026-08')).toBe('Task');
  });

  it('changes lifecycle ownership only when crossing the terminal boundary', () => {
    const due = 'Task ! Aug 14 2026';
    const completed = 'Task | Aug 13 2026';
    const today = new Date(2026, 7, 13);

    expect(reconcileLifecycleDateForStatus(due, '~', today)).toBe(due);
    expect(reconcileLifecycleDateForStatus(due, 'x', today)).toBe(completed);
    expect(reconcileLifecycleDateForStatus(completed, '-', today)).toBe(completed);
    expect(reconcileLifecycleDateForStatus(completed, '~', today)).toBe('Task ! Aug 13 2026');
  });
});
