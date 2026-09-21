export const taskPriority = (task) => task.listMarker === '+' ? 'high'
  : task.listMarker === '-' || task.isLowPriority ? 'low' : 'normal';

export const cycleTaskPriority = (task) => {
  task.listMarker = { normal: '-', low: '+', high: '*' }[taskPriority(task)];
  task.isLowPriority = task.listMarker === '-';
};
