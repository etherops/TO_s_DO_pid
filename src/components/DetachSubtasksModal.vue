<template>
  <Teleport to="body">
    <dialog ref="dialog" class="detach-modal" :class="`theme-${theme}`"
            aria-labelledby="detach-title" aria-describedby="detach-description"
            @cancel.prevent="$emit('cancel')" @click="onBackdropClick" @keydown.stop>
      <h2 id="detach-title">Make low priority?</h2>
      <p class="detach-task-title">{{ title }} <span class="detach-detail">({{ count }} {{ count === 1 ? 'subtask' : 'subtasks' }})</span></p>
      <p id="detach-description">All subtasks will be detached and become separate tasks.</p>
      <p class="detach-detail">They will stay in the same section, with their status, notes, and dates unchanged.</p>
      <ul class="detach-subtask-list" aria-label="Subtasks to detach">
        <li v-for="(subtask, index) in subtasks" :key="subtask.id ?? index">
          <span class="detach-subtask-state" :class="statusClass(subtask.statusChar)"
                :aria-label="statusLabel(subtask.statusChar)">
            {{ subtask.statusChar === 'x' ? '✓' : subtask.statusChar === '-' ? '−' : '' }}
          </span>
          <span class="detach-subtask-title">{{ getStrippedDisplayText(subtask.text) }}</span>
          <span v-if="getDuePeriodLabel(subtask.text)" class="detach-subtask-date"
                :title="getDueDateTooltip(subtask.text)">
            {{ getDuePeriodLabel(subtask.text) }} <span aria-hidden="true">◷</span>
          </span>
          <span v-else-if="extractCompletionDate(subtask.text)" class="detach-subtask-date completed-date">
            {{ extractCompletionDate(subtask.text) }}
          </span>
        </li>
      </ul>
      <footer>
        <button ref="cancelButton" type="button" class="detach-cancel" @click="$emit('cancel')">Cancel</button>
        <button type="button" class="detach-confirm" @click="$emit('confirm')">Detach subtasks &amp; make low</button>
      </footer>
    </dialog>
  </Teleport>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { getDuePeriodLabel, getDueDateTooltip } from '../utils/dateHelpers';
import { extractCompletionDate } from '../utils/completionDateHelpers';
const props = defineProps({ title: String, subtasks: { type: Array, required: true },
  theme: { type: String, default: 'light' } });
const count = computed(() => props.subtasks.length);
const statusClass = status => ({ x: 'done', '~': 'active', '!': 'status-blocked', '-': 'cancelled' }[status] || 'unstarted');
const statusLabel = status => ({ x: 'Done', '~': 'In progress', '!': 'Blocked', '-': 'Will not do' }[status] || 'Not started');
const emit = defineEmits(['cancel', 'confirm']);
const dialog = ref(null);
const cancelButton = ref(null);
onMounted(() => { dialog.value.showModal(); cancelButton.value.focus(); });
onBeforeUnmount(() => dialog.value?.close());
const onBackdropClick = event => {
  if (event.target !== dialog.value) return;
  const rect = dialog.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) emit('cancel');
};
</script>
<style scoped>
.detach-modal { box-sizing: border-box; width: min(460px, calc(100vw - 32px)); padding: 22px;
  color: var(--ui-text, #27313d); background: var(--ui-surface, #fff);
  border: 1px solid var(--ui-border, #d8dfe8); border-radius: 16px;
  box-shadow: 0 20px 60px #0004; font: 14px var(--ui-font, sans-serif); }
.detach-modal::backdrop { background: #17202c80; }
.detach-modal.theme-dark { background: #1d232e; color: #e3e7ee; border-color: #465266; }
h2 { margin: 0 0 12px; font-size: 19px; }
p { margin: 10px 0; line-height: 1.5; }
.detach-task-title { font-weight: 650; overflow-wrap: anywhere; }
.detach-detail { font-size: 12px; opacity: .75; }
.detach-subtask-list { list-style: none; padding: 0; margin: 16px 0; max-height: 240px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 5px; }
.detach-subtask-list li { display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border: 1px solid var(--ui-border, #d8dfe8); border-radius: 8px;
  background: var(--ui-surface-soft, #f7f9fb); }
.detach-subtask-title { overflow-wrap: anywhere; min-width: 0; flex: 1; font-weight: 600; }
.detach-subtask-date { flex: none; max-width: 45%; font-size: 11px; font-weight: 600;
  color: #8066ad; background: #f2edf9; border: 1px solid #d3c4e9; border-radius: 4px; padding: 2px 5px; }
.completed-date { color: var(--ui-muted, #8996a5); background: transparent; border-color: var(--ui-border); }
.theme-dark .detach-subtask-list li { background: #252c37; }
.theme-dark .detach-subtask-date { color: #c1a8e2; background: #352d43; border-color: #645077; }
.detach-subtask-state { position: relative; flex: 0 0 16px; height: 16px; box-sizing: border-box;
  border: 2px solid #aaa; border-radius: 3px; font-size: 12px; line-height: 12px; text-align: center; }
.detach-subtask-state.done { color: #4caf50; border-color: #4caf50; background: #4caf5020; }
.detach-subtask-state.active { border-color: #ff9800; background: #ff980020; }
.detach-subtask-state.active::after { content: ''; position: absolute; inset: 3px; background: #ff9800; }
.detach-subtask-state.cancelled { color: #8b96a2; border-color: #8b96a2; background: #8b96a220; }
.theme-dark .detach-subtask-list, .theme-dark .detach-subtask-list li { border-color: #465266; }
footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 20px; }
button { font: inherit; padding: 8px 12px; border: 1px solid var(--ui-border, #d8dfe8);
  border-radius: 7px; cursor: pointer; background: transparent; color: inherit; }
.detach-confirm { background: #fff4df; color: #9b5d00; border-color: #f3ce8e; font-weight: 600; }
.theme-dark .detach-confirm { background: #3b2e1d; color: #ffb347; border-color: #936b30; }
button:focus-visible { outline: 2px solid var(--ui-blue, #4d8fd6); outline-offset: 2px; }
</style>
