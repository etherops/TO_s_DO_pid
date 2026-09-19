export const TASK_STATUS_CYCLE = Object.freeze({
  ' ': 'x',
  x: '~',
  '~': '-',
  '-': ' '
});

const PARTIAL_START_CYCLE = Object.freeze({ '~': 'x', x: '-', '-': ' ', ' ': '~' });

export const nextTaskStatus = (statusChar, initialStatus = statusChar) =>
  (initialStatus === '~' ? PARTIAL_START_CYCLE : TASK_STATUS_CYCLE)[statusChar] || 'x';
