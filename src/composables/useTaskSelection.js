// composables/useTaskSelection.js
import { ref, computed } from 'vue';

export function useTaskSelection() {
    const selectedTaskIds = ref(new Set());
    const lastSelectedTaskId = ref(null);
    
    // Check if a task is selected
    const isTaskSelected = (taskId) => {
        return selectedTaskIds.value.has(taskId);
    };
    
    // Get count of selected tasks
    const selectedCount = computed(() => selectedTaskIds.value.size);
    
    // Get array of selected task IDs
    const selectedTasksArray = computed(() => Array.from(selectedTaskIds.value));
    
    // Clear all selections
    const clearSelection = () => {
        selectedTaskIds.value.clear();
        lastSelectedTaskId.value = null;
    };
    
    // Toggle single task selection
    const toggleTaskSelection = (taskId) => {
        if (selectedTaskIds.value.has(taskId)) {
            selectedTaskIds.value.delete(taskId);
            if (lastSelectedTaskId.value === taskId) {
                lastSelectedTaskId.value = null;
            }
        } else {
            selectedTaskIds.value.add(taskId);
            lastSelectedTaskId.value = taskId;
        }
    };
    
    // Select single task (clear others)
    const selectTask = (taskId) => {
        selectedTaskIds.value.clear();
        selectedTaskIds.value.add(taskId);
        lastSelectedTaskId.value = taskId;
    };
    
    // Handle task click with modifiers
    const handleTaskClick = (taskId, event) => {
        const isCtrlOrCmd = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;
        
        if (isShift || isCtrlOrCmd) {
            // Shift-click or Ctrl/Cmd-click: toggle selection
            toggleTaskSelection(taskId);
        } else {
            // Regular click: select only this task
            selectTask(taskId);
        }
    };
    
    // Check if all tasks in a list are selected
    const areAllTasksSelected = (taskIds) => {
        if (taskIds.length === 0) return false;
        return taskIds.every(id => selectedTaskIds.value.has(id));
    };
    
    // Select all tasks in a list
    const selectAllTasks = (taskIds) => {
        taskIds.forEach(id => selectedTaskIds.value.add(id));
        if (taskIds.length > 0) {
            lastSelectedTaskId.value = taskIds[taskIds.length - 1];
        }
    };
    
    // Deselect all tasks in a list
    const deselectAllTasks = (taskIds) => {
        taskIds.forEach(id => selectedTaskIds.value.delete(id));
        if (taskIds.includes(lastSelectedTaskId.value)) {
            lastSelectedTaskId.value = null;
        }
    };
    
    return {
        selectedTaskIds,
        selectedCount,
        selectedTasksArray,
        lastSelectedTaskId,
        isTaskSelected,
        clearSelection,
        toggleTaskSelection,
        selectTask,
        handleTaskClick,
        areAllTasksSelected,
        selectAllTasks,
        deselectAllTasks
    };
}