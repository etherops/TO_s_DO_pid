<!-- components/CompactDatePicker.vue -->
<template>
  <div class="compact-date-picker">
    <label class="date-label">Due Date</label>
    <div class="period-kind-tabs">
      <button v-for="kind in ['day', 'week', 'month']" :key="kind" type="button"
              class="period-kind-btn" :class="{ active: selectedKind === kind }"
              @click="setKind(kind)">{{ kind }}</button>
    </div>
    <input
        v-if="selectedKind === 'day'"
        type="date"
        class="date-input"
        v-model="selectedDateValue"
        ref="dateInput"
        @keydown="handleKeydown"
        @change="handleChange"
    />
    <input v-else-if="selectedKind === 'week'" type="week" class="date-input"
           v-model="selectedInputValue" @change="handlePeriodChange" />
    <input v-else type="month" class="date-input"
           v-model="selectedInputValue" @change="handlePeriodChange" />
    <div class="date-controls">
      <button class="nav-btn" @click="adjustPeriod(-1)" title="Previous period" :disabled="!selectedDateValue">
        <span class="nav-icon">‹</span>
      </button>
      <button class="today-btn" @click="setCurrent" title="Set current period">
        {{ selectedKind === 'day' ? 'Today' : selectedKind === 'week' ? 'This week' : 'This month' }}
      </button>
      <button class="nav-btn" @click="adjustPeriod(1)" title="Next period" :disabled="!selectedDateValue">
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
const selectedKind = ref('day');
const selectedInputValue = ref('');
const dateInput = ref(null);

// Initialize from modelValue or current date in task
onMounted(() => {
  syncFromModel(props.modelValue);
});

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  syncFromModel(newVal);
});

const weekInputFromSunday = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + 3);
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
  const weekYear = thursday.getFullYear();
  const yearStart = new Date(weekYear, 0, 1);
  const week = Math.ceil((((thursday - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

const sundayFromWeekInput = (value) => {
  const [yearText, weekText] = value.split('-W');
  const year = Number(yearText);
  const week = Number(weekText);
  const januaryFourth = new Date(year, 0, 4);
  const monday = new Date(januaryFourth);
  monday.setDate(januaryFourth.getDate() - ((januaryFourth.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  return formatDateValue(sunday);
};

const formatDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const syncFromModel = (value) => {
  selectedDateValue.value = value || '';
  selectedKind.value = value?.startsWith('week:') ? 'week' : value?.startsWith('month:') ? 'month' : 'day';
  const raw = value?.replace(/^(week|month):/, '') || '';
  selectedInputValue.value = selectedKind.value === 'week' && raw ? weekInputFromSunday(raw) : raw;
};

const emitValue = (value) => {
  selectedDateValue.value = value;
  emit('update:modelValue', value);
};

const setKind = (kind) => {
  selectedKind.value = kind;
  setCurrent();
};

const handlePeriodChange = () => {
  if (!selectedInputValue.value) return clearDate();
  emitValue(selectedKind.value === 'week'
      ? `week:${sundayFromWeekInput(selectedInputValue.value)}`
      : `month:${selectedInputValue.value}`);
};

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

const adjustPeriod = (amount) => {
  if (selectedKind.value === 'day') return adjustDate(amount);
  if (!selectedDateValue.value) return;
  const raw = selectedDateValue.value.replace(/^(week|month):/, '');
  const [year, month, day = 1] = raw.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (selectedKind.value === 'week') date.setDate(date.getDate() + amount * 7);
  else date.setMonth(date.getMonth() + amount);
  const value = selectedKind.value === 'week'
      ? `week:${formatDateValue(date)}`
      : `month:${formatDateValue(date).slice(0, 7)}`;
  syncFromModel(value);
  emitValue(value);
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

const setCurrent = () => {
  const today = new Date();
  let value = formatDateValue(today);
  if (selectedKind.value === 'week') {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    value = `week:${formatDateValue(sunday)}`;
  } else if (selectedKind.value === 'month') value = `month:${value.slice(0, 7)}`;
  syncFromModel(value);
  emitValue(value);
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

.period-kind-tabs { display: flex; gap: 3px; }
.period-kind-btn { flex: 1; border: 1px solid #ddd; background: #f5f5f5; color: #666; border-radius: 3px; padding: 3px 5px; text-transform: capitalize; cursor: pointer; }
.period-kind-btn.active { color: #f57c00; border-color: #ff9800; background: #fff8e1; }

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
