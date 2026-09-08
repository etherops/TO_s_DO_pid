import { describe, expect, it } from 'vitest';
import { nextTaskStatus, TASK_STATUS_CYCLE } from '../../../src/utils/statusHelpers';

describe('task status cycle', () => {
  it('cycles not started, done, in progress, will not do, then back to not started', () => {
    expect(TASK_STATUS_CYCLE).toEqual({ ' ': 'x', x: '~', '~': '-', '-': ' ' });
    expect(nextTaskStatus(' ')).toBe('x');
    expect(nextTaskStatus('x')).toBe('~');
    expect(nextTaskStatus('~')).toBe('-');
    expect(nextTaskStatus('-')).toBe(' ');
  });

  it('treats an unknown status as not started', () => {
    expect(nextTaskStatus('?')).toBe('x');
  });
});
