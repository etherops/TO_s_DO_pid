<template>
  <Teleport to="body">
    <div ref="menu" class="subtask-context-menu" :class="`theme-${theme}`" :style="positionStyle"
         role="menu" :aria-label="`Actions for ${title}`" tabindex="-1"
         @click.stop @contextmenu.prevent.stop @keydown.stop @keydown.esc.prevent.stop="$emit('close')">
      <div class="subtask-context-title">{{ title }}</div>
      <button v-if="!confirming" type="button" role="menuitem" class="subtask-context-delete"
              @click="confirmDelete">Delete subtask</button>
      <template v-else>
        <p>Delete this subtask permanently?</p>
        <div class="subtask-context-actions">
          <button ref="cancelButton" type="button" @click="$emit('close')">Cancel</button>
          <button type="button" class="subtask-context-confirm" @click="$emit('delete')">Delete</button>
        </div>
      </template>
    </div>
  </Teleport>
</template>
<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
const props = defineProps({ title: String, position: { type: Object, required: true },
  theme: { type: String, default: 'light' } });
const emit = defineEmits(['close', 'delete']);
const menu = ref(null);
const cancelButton = ref(null);
const confirming = ref(false);
const positionStyle = computed(() => ({
  left: `${Math.max(10, Math.min(props.position.x, window.innerWidth - 250))}px`,
  top: `${Math.max(10, Math.min(props.position.y, window.innerHeight - 160))}px`
}));
const confirmDelete = async () => {
  confirming.value = true;
  await nextTick();
  cancelButton.value?.focus();
};
const close = () => emit('close');
const outsidePointer = event => { if (!menu.value?.contains(event.target)) close(); };
const onScroll = event => { if (!menu.value?.contains(event.target)) close(); };
onMounted(() => {
  menu.value?.focus();
  document.addEventListener('pointerdown', outsidePointer, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', close);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outsidePointer, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', close);
});
</script>
<style scoped>
.subtask-context-menu { position: fixed; z-index: 10010; width: min(240px, calc(100vw - 20px));
  max-height: calc(100vh - 20px); overflow-y: auto; box-sizing: border-box; padding: 7px;
  border: 1px solid var(--ui-border); border-radius: 9px; box-shadow: var(--ui-shadow-md);
  background: var(--ui-surface); color: var(--ui-text); font: 12px var(--ui-font); outline: none; }
.subtask-context-title { font-weight: 650; padding: 5px 6px 8px; border-bottom: 1px solid var(--ui-border);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.subtask-context-menu button { font: inherit; color: inherit; cursor: pointer; padding: 7px;
  border: 1px solid var(--ui-border); border-radius: 5px; background: var(--ui-surface-soft); }
.subtask-context-menu .subtask-context-delete { width: 100%; border: 0; text-align: left;
  margin-top: 4px; background: transparent; color: #d44b4b; }
.subtask-context-menu button:hover { background: var(--ui-surface-muted); }
.subtask-context-menu button:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 1px; }
.subtask-context-menu p { margin: 10px 6px; }
.subtask-context-actions { display: flex; justify-content: flex-end; gap: 6px; }
.subtask-context-menu .subtask-context-confirm { color: #d44b4b; }
.theme-dark { --ui-surface: #171b21; --ui-surface-soft: #252c37; --ui-surface-muted: #303846;
  --ui-text: #e8eaed; --ui-border: #3a4352; }
</style>
