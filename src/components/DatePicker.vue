<!-- components/DatePicker.vue -->
<template>
  <div
      class="date-picker-container"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
  >
    <input
        type="date"
        class="date-picker-input"
        @keydown="handleDatePickerKeydown"
        ref="datePickerInput"
        v-model="selectedDateValue"
    />
    <div class="date-picker-actions">
      <button class="date-picker-confirm-btn" @click="confirmDateSelection" title="Confirm (Enter)">
        <span class="confirm-icon">✓</span> Set
      </button>
      <button class="date-picker-clear-btn" @click="clearDateSelection" title="Clear date">
        <span class="clear-icon">✗</span> Clear
      </button>
      <button class="date-picker-close-btn" @click="closeDatePicker" title="Cancel (Esc)">
        <span class="cancel-icon">×</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const props = defineProps({
  taskId: {
    type: Number,
    required: true
  },
  position: {
    type: Object,
    required: true,
    default: () => ({ top: 0, left: 0 })
  },
  initialDate: {
    type: Date,
    default: null
  }
});

const emit = defineEmits(['confirm', 'clear', 'close']);

// Date picker state
const selectedDateValue = ref('');
const datePickerInput = ref(null);

// Initialize date picker
onMounted(() => {
  // Set initial date value
  if (props.initialDate) {
    const year = props.initialDate.getFullYear();
    const month = String(props.initialDate.getMonth() + 1).padStart(2, '0');
    const day = String(props.initialDate.getDate()).padStart(2, '0');
    selectedDateValue.value = `${year}-${month}-${day}`;
  } else {
    // Default to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    selectedDateValue.value = `${year}-${month}-${day}`;
  }

  // Focus the input
  nextTick(() => {
    if (datePickerInput.value) {
      datePickerInput.value.focus();
    }
  });
});

// Handle keyboard events
const handleDatePickerKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    confirmDateSelection();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeDatePicker();
  }
};

// Confirm date selection
const confirmDateSelection = () => {
  if (!selectedDateValue.value) {
    closeDatePicker();
    return;
  }

  // Parse the selected date
  const [year, month, day] = selectedDateValue.value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  emit('confirm', { taskId: props.taskId, date });
};

// Clear date selection
const clearDateSelection = () => {
  emit('clear', { taskId: props.taskId });
};

// Close date picker
const closeDatePicker = () => {
  emit('close');
};
</script>

<style scoped>
.date-picker-container {
  position: absolute;
  z-index: 1000;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.date-picker-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 8px;
}

.date-picker-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.date-picker-confirm-btn {
  background-color: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 4px;
  cursor: pointer;
  color: #2e7d32;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.date-picker-confirm-btn:hover {
  background-color: #c8e6c9;
  transform: scale(1.05);
}

.date-picker-clear-btn {
  background-color: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 4px;
  cursor: pointer;
  color: #f57c00;
  padding: 4px 10px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.date-picker-clear-btn:hover {
  background-color: #ffecb3;
  transform: scale(1.05);
}

.date-picker-close-btn {
  background: none;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.date-picker-close-btn:hover {
  background-color: #f0f0f0;
  color: #e53935;
  transform: scale(1.05);
}

.confirm-icon,
.clear-icon,
.cancel-icon {
  margin-right: 4px;
}
</style>