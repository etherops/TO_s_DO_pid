<!-- components/CompactDatePicker.vue -->
<template>
  <div class="compact-date-picker">
    <label class="date-label">Due Date</label>
    <input
        type="date"
        class="date-input"
        v-model="selectedDateValue"
        ref="dateInput"
        @keydown="handleKeydown"
        @change="handleChange"
    />
    <div class="date-controls">
      <button class="nav-btn" @click="adjustDate(-1)" title="Previous day" :disabled="!selectedDateValue">
        <span class="nav-icon">‹</span>
      </button>
      <button class="today-btn" @click="setToday" title="Set to today">
        Today
      </button>
      <button class="nav-btn" @click="adjustDate(1)" title="Next day" :disabled="!selectedDateValue">
        <span class="nav-icon">›</span>
      </button>
      <button class="clear-btn" @click="clearDate" title="Clear date">
        <span class="icon">×</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const selectedDateValue = ref('');
const dateInput = ref(null);

// Initialize from modelValue or current date in task
onMounted(() => {
  if (props.modelValue) {
    selectedDateValue.value = props.modelValue;
  }
});

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  selectedDateValue.value = newVal || '';
});

const handleKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    // Just prevent default, the value is already bound via v-model
  }
};

const handleChange = () => {
  emit('update:modelValue', selectedDateValue.value);
};

const clearDate = () => {
  selectedDateValue.value = '';
  emit('update:modelValue', '');
};

const adjustDate = (days) => {
  if (!selectedDateValue.value) return;
  
  // Parse the date components to avoid timezone issues
  const [year, month, day] = selectedDateValue.value.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);
  
  // Adjust the date
  currentDate.setDate(currentDate.getDate() + days);
  
  // Format back to YYYY-MM-DD
  const newYear = currentDate.getFullYear();
  const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const newDay = String(currentDate.getDate()).padStart(2, '0');
  selectedDateValue.value = `${newYear}-${newMonth}-${newDay}`;
  
  emit('update:modelValue', selectedDateValue.value);
};

const setToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  selectedDateValue.value = `${year}-${month}-${day}`;
  
  emit('update:modelValue', selectedDateValue.value);
};

const focus = () => {
  dateInput.value?.focus();
};

// Expose focus method for parent component
defineExpose({ focus });
</script>

<style scoped>
.compact-date-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 13px;
  border: 1px solid #ff9800;
  border-radius: 3px;
  background-color: #fff8e1;
  outline: none;
  box-sizing: border-box;
}

.date-input:focus {
  border-color: #f57c00;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
}

.nav-btn, .today-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
}

.nav-btn {
  min-width: 20px;
}

.nav-btn:hover:not(:disabled), 
.today-btn:hover {
  background-color: #e0e0e0;
  border-color: #bbb;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-icon {
  font-weight: bold;
  line-height: 1;
  font-size: 14px;
}

.today-btn {
  padding: 2px 8px;
  font-weight: 500;
}

.clear-btn {
  background-color: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 3px;
  cursor: pointer;
  color: #f57c00;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 20px;
}

.clear-btn:hover {
  background-color: #ffecb3;
  border-color: #ff9800;
  transform: scale(1.02);
}

.icon {
  font-weight: bold;
  line-height: 1;
  font-size: 14px;
}
</style>