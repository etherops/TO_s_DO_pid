<template>
  <div class="subtask-date-picker" aria-label="Subtask due date" @keydown.esc.stop="$emit('close')">
    <div class="shortcuts">
      <button v-for="option in shortcuts" :key="option.label" type="button"
              @click="choose(option.value)">{{ option.label }}</button>
      <button type="button" @click="choose('')">Clear</button>
      <button type="button" aria-label="Close date picker" @click="$emit('close')">×</button>
    </div>
    <div class="custom-date">
      <button v-for="option in ['day', 'week', 'month']" :key="option" type="button"
              :class="{ active: kind === option }" @click="kind = option">{{ option }}</button>
      <input :type="kind === 'day' ? 'date' : kind" :value="inputValue"
             :aria-label="`Subtask due ${kind}`" @change="chooseInput($event.target.value)" />
    </div>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { isoWeekInputFromSunday, sundayValueFromIsoWeekInput } from '../utils/dateHelpers';
const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'close']);
const kind = ref(props.modelValue.startsWith('week:') ? 'week'
  : props.modelValue.startsWith('month:') ? 'month' : 'day');
const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortcuts = computed(() => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const next = new Date(sunday);
  next.setDate(next.getDate() + 7);
  return [
    { label: 'Today', value: format(today) }, { label: 'Tomorrow', value: format(tomorrow) },
    { label: 'This week', value: `week:${format(sunday)}` },
    { label: 'Next week', value: `week:${format(next)}` },
    { label: 'This month', value: `month:${format(today).slice(0, 7)}` },
    { label: 'Next month', value: `month:${format(new Date(today.getFullYear(), today.getMonth() + 1, 1)).slice(0, 7)}` }
  ];
});
const inputValue = computed(() => {
  if (kind.value === 'month') return props.modelValue.startsWith('month:') ? props.modelValue.slice(6) : '';
  if (kind.value === 'week') return props.modelValue.startsWith('week:')
    ? isoWeekInputFromSunday(props.modelValue.slice(5)) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue) ? props.modelValue : '';
});
const choose = value => { emit('update:modelValue', value); emit('close'); };
const chooseInput = value => {
  if (value) choose(kind.value === 'week' ? `week:${sundayValueFromIsoWeekInput(value)}`
    : kind.value === 'month' ? `month:${value}` : value);
};
</script>
<style scoped>
.subtask-date-picker { margin: 4px 0 6px auto; width: fit-content; max-width: 100%; padding: 6px;
  border: 1px solid var(--subtask-border); border-radius: 7px; background: var(--subtask-fill); }
.shortcuts, .custom-date { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.custom-date { margin-top: 5px; }
button, input { font: inherit; font-size: 11px; color: inherit; border: 1px solid var(--subtask-border);
  background: transparent; border-radius: 4px; padding: 3px 6px; }
button { cursor: pointer; }
.custom-date button { text-transform: capitalize; }
button:hover, button.active { background: var(--ui-blue-soft); color: var(--ui-blue); border-color: var(--ui-blue); }
input { flex: 1; min-width: 120px; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 1px; }
</style>
