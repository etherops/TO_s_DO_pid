export const TASK_STATUS_CYCLE = Object.freeze({
  ' ': 'x',
  x: '~',
  '~': '-',
  '-': ' '
});

export const nextTaskStatus = (statusChar) => TASK_STATUS_CYCLE[statusChar] || 'x';
