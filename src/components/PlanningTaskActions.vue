<template>
  <button ref="trigger" type="button" class="planning-actions-trigger" aria-haspopup="dialog"
          :aria-expanded="open" :aria-label="`Actions for ${title}`" title="Task actions"
          @click.stop="toggle">⋯</button>
  <Teleport to="body">
    <div v-if="open" ref="panel" class="planning-task-actions" :style="position" role="dialog"
         :aria-label="`Actions for ${title}`" @click.stop @keydown="handleKeydown">
      <div class="planning-actions-title">{{ title }}</div>
      <div class="planning-actions-source">{{ source }}</div>
      <template v-if="!frozen">
        <button class="edit-btn" @click="run('edit', $event)">Edit task</button>
        <button class="notes-btn" @click="run('notes')">{{ note ? 'Edit note' : 'Add note' }}</button>
        <p v-if="note" class="planning-actions-note">{{ note }}</p>
        <button class="planning-priority-action" @click="run('priority')">
          Priority: {{ priority }} → {{ nextPriority }}
        </button>
      </template>
      <template v-if="confirmingDelete">
        <p>Delete this task{{ hasSubtasks ? ' and its subtasks' : '' }}?</p>
        <button class="confirm-delete-btn" @click="run('delete')">Confirm delete</button>
        <button @click="confirmingDelete = false">Cancel</button>
      </template>
      <button v-else class="delete-btn" @click="confirmingDelete = true">Delete task…</button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue';
const props = defineProps({
  title: String, source: String, note: String, priority: String, frozen: Boolean, hasSubtasks: Boolean
});
const emit = defineEmits(['edit', 'notes', 'priority', 'delete']);
const open = ref(false);
const confirmingDelete = ref(false);
const trigger = ref(null);
const panel = ref(null);
const position = ref({});
const nextPriority = computed(() => ({ high: 'normal', normal: 'low', low: 'high' })[props.priority]);
const close = (restoreFocus = false) => {
  open.value = false;
  confirmingDelete.value = false;
  document.removeEventListener('pointerdown', outsideClick);
  window.removeEventListener('resize', dismiss);
  document.removeEventListener('scroll', handleScroll, true);
  if (restoreFocus) trigger.value?.focus();
};
const outsideClick = event => {
  if (!panel.value?.contains(event.target) && !trigger.value?.contains(event.target)) close();
};
const dismiss = () => close();
const handleScroll = event => {
  if (!panel.value?.contains(event.target)) close();
};
const toggle = async () => {
  if (open.value) return close(true);
  const rect = trigger.value.getBoundingClientRect();
  const theme = getComputedStyle(trigger.value);
  const colors = Object.fromEntries(['--ui-surface', '--ui-surface-soft', '--ui-text', '--ui-muted', '--ui-border']
    .map(name => [name, theme.getPropertyValue(name)]));
  position.value = { ...colors, left: `${Math.max(8, Math.min(rect.right - 280, innerWidth - 288))}px`,
    top: `${rect.bottom + 5}px` };
  open.value = true;
  await nextTick();
  if (!panel.value) return;
  const height = panel.value.getBoundingClientRect().height;
  position.value.top = `${Math.max(8, Math.min(rect.bottom + 5, innerHeight - height - 8))}px`;
  panel.value.querySelector('button')?.focus({ preventScroll: true });
  document.addEventListener('pointerdown', outsideClick);
  window.addEventListener('resize', dismiss);
  document.addEventListener('scroll', handleScroll, true);
};
const run = (action, event) => {
  close(action === 'priority');
  emit(action, event);
};
const handleKeydown = event => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    close(true);
  }
  if (event.key !== 'Tab') return;
  const buttons = [...panel.value.querySelectorAll('button')];
  const first = buttons[0];
  const last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
};
onUnmounted(() => close());
</script>

<style scoped>
.planning-actions-trigger { flex: none; width: 22px; padding: 0; border: 0; border-radius: 4px;
  background: transparent; color: var(--ui-muted); font: 700 18px/24px var(--ui-font); cursor: pointer; }
.planning-actions-trigger:hover { background: var(--ui-surface-muted); color: var(--ui-text); }
.planning-task-actions { position: fixed; z-index: 10000; width: 280px; box-sizing: border-box;
  max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow-y: auto;
  padding: 8px; background: var(--ui-surface); color: var(--ui-text); border: 1px solid var(--ui-border);
  border-radius: 10px; box-shadow: var(--ui-shadow-md); font: 13px/1.4 var(--ui-font); }
.planning-actions-title { padding: 4px 7px; font-weight: 650; overflow-wrap: anywhere; }
.planning-actions-source { padding: 0 7px 7px; color: var(--ui-muted); font-size: 11px;
  border-bottom: 1px solid var(--ui-border); margin-bottom: 4px; }
.planning-task-actions button { display: block; width: 100%; text-align: left; padding: 7px;
  border: 0; border-radius: 5px; background: transparent; color: var(--ui-text); font: inherit; cursor: pointer; }
.planning-task-actions button:hover { background: var(--ui-surface-soft); }
.planning-task-actions button:focus-visible, .planning-actions-trigger:focus-visible {
  outline: 2px solid var(--ui-blue); outline-offset: -2px; }
.planning-task-actions .delete-btn, .planning-task-actions .confirm-delete-btn { color: var(--ui-blocked); }
.planning-task-actions p { margin: 4px 7px; }
.planning-actions-note { color: var(--ui-muted); white-space: pre-wrap; overflow-wrap: anywhere;
  max-height: 90px; overflow-y: auto; font-size: 12px; }
</style>
