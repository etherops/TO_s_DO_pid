<template>
  <div ref="editorRoot" class="subtask-editor" @click.stop @keydown.stop>
    <div class="subtask-heading">
      <span>Subtasks</span>
    </div>
    <template v-for="(child, index) in displayedRows" :key="child.id ?? `raw-${index}`">
      <div v-if="child.type === 'subtask'" class="subtask-edit-row"
           :class="{ 'drop-before': dropTarget?.index === index && !dropTarget.after,
                     'drop-after': dropTarget?.index === index && dropTarget.after }"
           @dragover.stop="hoverRow(index, $event)" @drop.stop="dropRow(index, $event)">
        <button v-if="child.text.trim()" type="button" class="subtask-drag-handle" draggable="true"
                aria-label="Reorder subtask" title="Drag to reorder; arrow keys move up/down"
                @dragstart.stop="startDrag(index, $event)" @dragend.stop="clearDrag"
                @keydown.up.prevent="moveBy(index, -1)" @keydown.down.prevent="moveBy(index, 1)">⠿</button>
        <button type="button" class="subtask-status" :aria-label="`Change subtask status: ${child.text}`"
                :class="{ 'is-active': child.statusChar === '~', 'is-done': child.statusChar === 'x',
                          'is-cancelled': child.statusChar === '-' }"
                @click="toggleStatus(index, child)"></button>
        <input :value="titleDrafts.get(child.id) ?? getStrippedDisplayText(child.text)" aria-label="Subtask title" placeholder="Subtask…"
               @keydown.enter.prevent.stop="advance(index)"
               @input="updateTitle(index, child, $event.target.value)" />
        <button v-if="child.text.trim()" type="button" class="subtask-date"
                aria-label="Edit subtask due date" @click="dateIndex = dateIndex === index ? null : index">
          {{ dueLabel(child) || '◷' }}
        </button>
        <button v-if="index < modelValue.length" type="button" class="subtask-remove"
                aria-label="Remove subtask" @click="remove(index)">×</button>
      </div>
      <SubtaskDatePicker v-if="child.type === 'subtask' && dateIndex === index"
                         :model-value="formatDuePeriodValue(extractDuePeriod(child.text))" label="Due date"
                         @update:model-value="value => update(index, { text: setDuePeriod(child.text, value) })"
                         @close="dateIndex = null" />
    </template>
  </div>
</template>
<script setup>
import { ref, nextTick, computed } from 'vue';
import { nextTaskStatus } from '../utils/statusHelpers';
import { reconcileLifecycleDateForStatus } from '../utils/completionDateHelpers';
import SubtaskDatePicker from './SubtaskDatePicker.vue';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { updateSubtaskTitle } from '../utils/subtaskHelpers';
import { extractDuePeriod, formatDuePeriodValue, getDuePeriodLabel, setDuePeriod } from '../utils/dateHelpers';
const props = defineProps({ modelValue: { type: Array, default: () => [] }, allowAdd: { type: Boolean, default: true } });
const emit = defineEmits(['update:modelValue']);
const editorRoot = ref(null);
const titleDrafts = ref(new Map());
const dateIndex = ref(null);
const dueLabel = (child) => {
  const period = extractDuePeriod(child.text);
  return period ? getDuePeriodLabel(child.text) : '';
};
const dragIndex = ref(null);
const dropTarget = ref(null);
const sortableIndexes = () => props.modelValue.flatMap((child, index) =>
  child.type === 'subtask' && child.text.trim() ? [index] : []);
const reorder = (source, target, after) => {
  const indexes = sortableIndexes();
  const from = indexes.indexOf(source);
  const to = indexes.indexOf(target);
  if (from < 0 || to < 0 || from === to) return;
  const ordered = indexes.map(index => props.modelValue[index]);
  const [item] = ordered.splice(from, 1);
  ordered.splice(to + (after ? 1 : 0) - (from < to ? 1 : 0), 0, item);
  const result = [...props.modelValue];
  indexes.forEach((index, position) => { result[index] = ordered[position]; });
  emit('update:modelValue', result);
};
const clearDrag = () => { dragIndex.value = null; dropTarget.value = null; };
const startDrag = (index, event) => {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.setDragImage(event.currentTarget.closest('.subtask-edit-row'), 10, 10);
  }
};
const hoverRow = (index, event) => {
  if (dragIndex.value === null || !sortableIndexes().includes(index)) return;
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  const after = event.clientY > rect.top + rect.height / 2;
  if (dropTarget.value?.index !== index || dropTarget.value.after !== after) dropTarget.value = { index, after };
};
const dropRow = (index, event) => {
  if (dragIndex.value === null) return;
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  reorder(dragIndex.value, index, event.clientY > rect.top + rect.height / 2);
  clearDrag();
};
const moveBy = (index, direction) => {
  const indexes = sortableIndexes();
  const target = indexes[indexes.indexOf(index) + direction];
  if (target !== undefined) reorder(index, target, direction > 0);
};
const newRow = () => ({ id: `subtask-${crypto.randomUUID()}`, type: 'subtask', indent: '  ', statusChar: ' ', text: '' });
const displayedRows = computed(() => {
  if (!props.allowAdd) return props.modelValue;
  const last = props.modelValue.at(-1);
  return last?.type === 'subtask' && !last.text.trim()
    ? props.modelValue : [...props.modelValue, newRow()];
});
const update = (index, changes) => {
  const rows = [...props.modelValue];
  rows[index] = { ...(rows[index] || newRow()), ...changes };
  emit('update:modelValue', rows);
};
const updateTitle = (index, child, title) => {
  titleDrafts.value.set(child.id, title);
  update(index, { id: child.id, text: updateSubtaskTitle(child.text, title) });
};
const toggleStatus = (index, child) => {
  const statusChar = nextTaskStatus(child.statusChar);
  update(index, { statusChar, text: reconcileLifecycleDateForStatus(child.text, statusChar) });
};
const remove = (index) => emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
const advance = async (index) => {
  const position = props.modelValue.slice(0, index + 1).filter(child => child.type === 'subtask').length;
  await nextTick();
  editorRoot.value?.querySelectorAll('[aria-label="Subtask title"]')[position]?.focus();
};
</script>
<style scoped>
.subtask-editor { grid-column: 1 / -1; width: 100%; min-width: 0; padding: 3px 0;
  font-family: var(--ui-font); --subtask-border: var(--ui-border); --subtask-fill: var(--ui-surface-soft); }
:global(.theme-dark) .subtask-editor { --subtask-border: #465266; --subtask-fill: #20262f; }
.subtask-heading { display: flex; align-items: center; justify-content: space-between;
  color: var(--ui-muted, #8996a5); font-size: 11px; font-weight: 650; margin-bottom: 4px; }
.subtask-edit-row { display: flex; align-items: center; gap: 6px; margin: 2px 0;
  padding: 2px 5px; border: 1px solid var(--subtask-border); border-radius: 6px;
  background: var(--subtask-fill); }
.subtask-edit-row input { flex: 1; min-width: 0; height: 16px; box-sizing: border-box;
  color: inherit; background: transparent; border: 0; padding: 0; font: inherit; font-size: 12px; }
.subtask-edit-row:focus-within { border-color: var(--ui-blue, #4d8fd6); }
.subtask-edit-row input:focus { outline: none; }
.subtask-edit-row.drop-before { box-shadow: 0 -2px var(--ui-blue); }
.subtask-edit-row.drop-after { box-shadow: 0 2px var(--ui-blue); }
.subtask-editor .subtask-drag-handle { cursor: grab; border: 0; padding: 0; background: transparent;
  color: var(--ui-muted); font-size: 12px; line-height: 14px; }
.subtask-editor button { cursor: pointer; font-family: inherit; }
.subtask-date { flex: none; border: 1px solid var(--subtask-border); border-radius: 4px;
  background: transparent; color: var(--ui-muted); font: inherit; font-size: 10px; padding: 1px 4px; }
.subtask-remove { background: transparent; border: 0; border-radius: 4px; padding: 2px 5px; }
.subtask-editor button:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 2px; }
.subtask-remove { color: var(--ui-muted, #8996a5); font-size: 14px; line-height: 14px; padding: 0 4px; }
.subtask-remove:hover { color: #e26767; background: #e2676710; }
.subtask-status { position: relative; flex: 0 0 14px; width: 14px; height: 14px; padding: 0;
  box-sizing: border-box;
  border: 2px solid #aaa; border-radius: 3px; background: transparent; }
.subtask-status.is-active { border-color: var(--ui-orange); background: var(--ui-orange-soft); }
.subtask-status.is-active::after { content: ''; position: absolute; inset: 2px;
  border-radius: 1px; background: var(--ui-orange); }
.subtask-status.is-done { border-color: var(--ui-green); background: var(--ui-green-soft); }
.subtask-status.is-done::after { content: ''; position: absolute; left: 2px; top: 0;
  width: 3px; height: 6px; border: solid var(--ui-green); border-width: 0 2px 2px 0; transform: rotate(45deg); }
.subtask-status.is-cancelled { border-color: #888; background: #8882; }
.subtask-status.is-cancelled::after { content: ''; position: absolute; left: 2px; right: 2px;
  top: 4px; height: 2px; background: #888; }
</style>
