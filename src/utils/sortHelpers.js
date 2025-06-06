// Shared sorting utilities for task priority management

// Get priority value for status character (higher number = higher priority)
export const getStatusPriority = (statusChar) => {
  switch (statusChar) {
    case 'x': return 4; // Completed - highest priority
    case '-': return 3; // Cancelled - second highest
    case '~': return 2; // In progress - third highest  
    case ' ': return 1; // Unchecked - lowest priority
    default: return 0;
  }
};

// Find the correct target index for a task based on its priority
export const findTargetIndex = (items, taskIndex, targetPriority) => {
  let targetIndex = taskIndex;
  
  // Check if we need to move UP (higher priority)
  for (let i = taskIndex - 1; i >= 0; i--) {
    const currentItem = items[i];
    
    // Skip raw-text items
    if (currentItem.type === 'raw-text') continue;
    
    const currentPriority = getStatusPriority(currentItem.statusChar);
    
    // If current item has higher priority, we can't go above it
    if (currentPriority > targetPriority) {
      targetIndex = i + 1;
      break;
    }
    
    // If current item has same priority, we can't go above it (same status groups together)
    if (currentPriority === targetPriority) {
      targetIndex = i + 1;
      break;
    }
    
    // If current item has lower priority, we can move above it
    targetIndex = i;
  }
  
  // If no upward movement found, check if we need to move DOWN (lower priority)
  if (targetIndex === taskIndex) {
    for (let i = taskIndex + 1; i < items.length; i++) {
      const currentItem = items[i];
      
      // Skip raw-text items
      if (currentItem.type === 'raw-text') continue;
      
      const currentPriority = getStatusPriority(currentItem.statusChar);
      
      // If current item has higher priority, we should move below it
      if (currentPriority > targetPriority) {
        targetIndex = i;
        continue;
      }
      
      // If current item has same or lower priority, stop here (we found our position)
      break;
    }
  }
  
  return targetIndex;
};

// Perform the actual array swaps to move a task to its target position
export const performTaskSwaps = (items, taskIndex, targetIndex) => {
  if (targetIndex < taskIndex) {
    // Moving UP - swap with items above
    const positionsToMove = taskIndex - targetIndex;
    for (let moveStep = 0; moveStep < positionsToMove; moveStep++) {
      const currentIndex = taskIndex - moveStep;
      [items[currentIndex], items[currentIndex - 1]] = [items[currentIndex - 1], items[currentIndex]];
    }
  } else if (targetIndex > taskIndex) {
    // Moving DOWN - swap with items below
    const positionsToMove = targetIndex - taskIndex;
    for (let moveStep = 0; moveStep < positionsToMove; moveStep++) {
      const currentIndex = taskIndex + moveStep;
      [items[currentIndex], items[currentIndex + 1]] = [items[currentIndex + 1], items[currentIndex]];
    }
  }
};

// Set up the visual animation for a task movement
export const setupTaskAnimation = (task, taskIndex, targetIndex) => {
  const positionsToMove = Math.abs(targetIndex - taskIndex);
  
  if (targetIndex < taskIndex) {
    // Moving UP
    task.isFloatingUp = true;
    task.floatDistance = positionsToMove;
  } else if (targetIndex > taskIndex) {
    // Moving DOWN
    task.isFloatingDown = true;
    task.floatDistance = positionsToMove;
  }
};

// Clean up animation state after animation completes
export const cleanupTaskAnimation = (task, animationDuration = 300) => {
  setTimeout(() => {
    if (task.isFloatingUp) {
      task.isFloatingUp = false;
    }
    if (task.isFloatingDown) {
      task.isFloatingDown = false;
    }
    if (task.floatDistance) {
      delete task.floatDistance;
    }
  }, animationDuration);
};

// Complete task sorting process (find position, animate, swap, cleanup)
export const sortTaskToCorrectPosition = async (items, task, emit, options = {}) => {
  const taskIndex = items.findIndex(item => item.id === task.id);
  
  if (taskIndex === -1) return false; // Not found
  
  const targetPriority = getStatusPriority(task.statusChar);
  const targetIndex = findTargetIndex(items, taskIndex, targetPriority);
  
  // Move the task if we found a different position
  if (targetIndex !== taskIndex) {
    // Set up animation
    setupTaskAnimation(task, taskIndex, targetIndex);
    
    // Perform the swaps
    performTaskSwaps(items, taskIndex, targetIndex);
    
    // Emit update to trigger re-render
    emit('task-updated');
    
    // Handle overlapping animations for manual sorts
    if (options.allowOverlap) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Clean up animation
    cleanupTaskAnimation(task, options.animationDuration || 300);
    
    // Additional delay for overlapping animations
    if (options.allowOverlap) {
      setTimeout(() => {
        if (task.isFloatingUp) task.isFloatingUp = false;
        if (task.isFloatingDown) task.isFloatingDown = false;
        if (task.floatDistance) delete task.floatDistance;
      }, 150);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return true; // Indicates a swap occurred
  }
  
  return false; // No swap needed
};