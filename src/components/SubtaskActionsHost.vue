<template>
  <Teleport to="body">
    <div v-if="context && source" ref="menu" class="subtask-actions-menu" :class="`theme-${theme}`"
         :style="positionStyle" role="dialog" :aria-label="`Actions for ${title}`" tabindex="-1"
         @click.stop @contextmenu.prevent.stop @keydown.stop="handleKeydown">
      <header :title="title">{{ title }}</header>
      <div class="subtask-actions-parent">In {{ parentTitle }}</div>
      <template v-if="view === 'actions'">
        <button v-if="context.edit" type="button" @click="runCallback('edit')">Edit subtask…</button>
        <button v-if="context.date" type="button" @click="runCallback('date')">Change date…</button>
        <button type="button" @click="showParents('projects')">Move to another parent… <span>›</span></button>
        <button type="button" @click="apply('detach')">Detach as regular task</button>
        <button type="button" class="subtask-actions-danger" @click="confirmDelete">Delete subtask…</button>
      </template>
      <template v-else-if="view === 'delete'">
        <p>Delete this subtask permanently?</p>
        <div class="subtask-actions-confirm">
          <button ref="cancelButton" type="button" @click="view = 'actions'">Cancel</button>
          <button type="button" class="subtask-actions-danger" @click="apply('delete')">Delete</button>
        </div>
      </template>
      <template v-else>
        <button type="button" @click="view === 'regular' ? showParents('projects') : view = 'actions'">
          ‹ {{ view === 'regular' ? 'Choose regular task' : 'Choose project' }}
        </button>
        <input ref="searchInput" v-model="search" type="search" aria-label="Search parent tasks"
               :placeholder="view === 'regular' ? 'Search open task titles…' : 'Search projects…'" />
        <div class="subtask-actions-parents">
          <button v-for="entry in choices" :key="entry.task.id" type="button"
                  class="subtask-parent-choice" @click="apply('move', entry.task.id)">
            <strong>{{ getStrippedDisplayText(entry.task.text) }}</strong>
            <small>{{ entry.columnKey }} › {{ entry.section.name }}</small>
          </button>
          <p v-if="!choices.length">No matching {{ view === 'regular' ? 'open tasks' : 'projects' }}.</p>
        </div>
        <button v-if="view === 'projects'" type="button" @click="showParents('regular')">
          Choose a regular task… <span>›</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { applySubtaskAction, eligibleSubtaskParents, findSubtask } from '../utils/subtaskActions';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { taskPriority } from '../utils/priorityHelpers';

const props = defineProps({ todoData: Object, theme: String, viewMode: String });
const emit = defineEmits(['update']);
const context = ref(null);
const menu = ref(null);
const searchInput = ref(null);
const cancelButton = ref(null);
const view = ref('actions');
const search = ref('');
const menuSize = ref({ width: 300, height: 260 });
let returnFocus = null;
let observer;
const source = computed(() => context.value && findSubtask(props.todoData, context.value.id));
const title = computed(() => getStrippedDisplayText(source.value?.task.text || ''));
const parentTitle = computed(() => getStrippedDisplayText(source.value?.parent.text || ''));
const choices = computed(() => eligibleSubtaskParents(props.todoData, context.value?.id).filter(entry =>
  taskPriority(entry.task) === (view.value === 'regular' ? 'normal' : 'high')
  && getStrippedDisplayText(entry.task.text).toLowerCase().includes(search.value.toLowerCase())));
const positionStyle = computed(() => ({
  left: `${Math.max(10, Math.min(context.value.x, window.innerWidth - menuSize.value.width - 10))}px`,
  top: `${Math.max(10, Math.min(context.value.y, window.innerHeight - menuSize.value.height - 10))}px`
}));
const close = (restoreFocus = true) => {
  context.value = null;
  observer?.disconnect();
  if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
};
const open = async (id, event, callbacks = {}) => {
  close(false);
  const entry = findSubtask(props.todoData, id);
  if (!entry || entry.frozen) return;
  returnFocus = event.target?.closest?.('button, input, [tabindex]') || document.activeElement;
  const rect = event.currentTarget?.getBoundingClientRect();
  context.value = { id, x: event.clientX || rect?.left || 10, y: event.clientY || rect?.bottom || 10, ...callbacks };
  view.value = 'actions';
  search.value = '';
  await nextTick();
  if (!menu.value) return;
  observer = new ResizeObserver(([entry]) => {
    menuSize.value = { width: entry.target.offsetWidth, height: entry.target.offsetHeight };
  });
  observer.observe(menu.value);
  menu.value.focus();
};
defineExpose({ open });
const apply = (action, parentId) => {
  const result = applySubtaskAction(props.todoData, context.value?.id, action, parentId);
  if (result) {
    context.value.afterChange?.(result);
    emit('update');
  }
  close();
};
const runCallback = name => {
  const callback = context.value[name];
  close(false);
  callback?.();
};
const showParents = async mode => {
  view.value = mode;
  search.value = '';
  await nextTick();
  searchInput.value?.focus();
};
const confirmDelete = async () => {
  view.value = 'delete';
  await nextTick();
  cancelButton.value?.focus();
};
const handleKeydown = event => {
  if (event.key === 'Escape') { event.preventDefault(); close(); return; }
  if (event.key !== 'Tab') return;
  const targets = [...menu.value.querySelectorAll('button, input')];
  const index = targets.indexOf(document.activeElement);
  event.preventDefault();
  targets[(index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length]?.focus();
};
const outside = event => {
  if (context.value && !menu.value?.contains(event.target)) close(false);
};
const resize = () => close();
document.addEventListener('pointerdown', outside, true);
document.addEventListener('scroll', outside, true);
window.addEventListener('resize', resize);
watch(() => [props.todoData, props.viewMode], () => close(false));
watch(source, value => { if (context.value && !value) close(false); });
onBeforeUnmount(() => {
  close(false);
  document.removeEventListener('pointerdown', outside, true);
  document.removeEventListener('scroll', outside, true);
  window.removeEventListener('resize', resize);
});
</script>

<style scoped>
.subtask-actions-menu { position: fixed; z-index: 12000; width: min(300px, calc(100vw - 20px));
  max-height: calc(100vh - 20px); overflow-y: auto; box-sizing: border-box; padding: 7px;
  border: 1px solid var(--ui-border); border-radius: 9px; box-shadow: var(--ui-shadow-md);
  background: var(--ui-surface); color: var(--ui-text); font: 13px var(--ui-font); outline: none; }
.subtask-actions-menu header { font-weight: 650; padding: 6px; overflow-wrap: anywhere; }
.subtask-actions-parent { color: var(--ui-muted); font-size: 11px; padding: 0 6px 8px;
  border-bottom: 1px solid var(--ui-border); overflow-wrap: anywhere; }
.subtask-actions-menu button { display: flex; justify-content: space-between; gap: 8px; width: 100%;
  padding: 8px; border: 0; border-radius: 5px; color: inherit; background: transparent;
  text-align: left; cursor: pointer; font: inherit; }
.subtask-actions-menu button:hover { background: var(--ui-surface-muted); }
.subtask-actions-menu button:focus-visible, .subtask-actions-menu input:focus-visible {
  outline: 2px solid var(--ui-blue); outline-offset: -2px; }
.subtask-actions-menu input { box-sizing: border-box; width: 100%; margin: 4px 0; padding: 7px;
  font: inherit; color: inherit; background: var(--ui-surface-soft); border: 1px solid var(--ui-border);
  border-radius: 5px; }
.subtask-actions-parents { max-height: 220px; overflow-y: auto; }
.subtask-actions-menu .subtask-parent-choice { display: block; }
.subtask-parent-choice strong { font-weight: 500; overflow-wrap: anywhere; }
.subtask-parent-choice small { display: block; color: var(--ui-muted); margin-top: 3px; }
.subtask-actions-menu p { margin: 10px 6px; }
.subtask-actions-menu .subtask-actions-danger { color: #d44b4b; }
.subtask-actions-confirm { display: flex; justify-content: flex-end; gap: 5px; }
.subtask-actions-confirm button { width: auto; border: 1px solid var(--ui-border); }
.theme-dark { --ui-surface: #171b21; --ui-surface-soft: #252c37; --ui-surface-muted: #303846;
  --ui-text: #e8eaed; --ui-muted: #a3afbf; --ui-border: #3a4352; }
</style>
