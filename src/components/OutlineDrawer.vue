<template>
  <aside class="outline-drawer" @mouseenter="open = true" @mouseleave="closeOnLeave && close()"
         @focusin="open = true" @focusout="leaveFocus" @keydown.esc.stop.prevent="close">
    <div class="outline-drawer-track" :style="{ width: `${width + 12}px` }">
      <div class="outline-drawer-panel" :class="{ 'is-open': open }" :style="{ width: `${width}px` }">
        <div :id="id" class="outline-drawer-content" :inert="!open" :aria-hidden="!open">
          <slot :close="close" />
        </div>
        <button ref="grip" class="outline-drawer-grip" :aria-label="label" :aria-expanded="open"
                :aria-controls="id" @click="open = true">
          <span aria-hidden="true">{{ open ? '‹' : '›' }}</span>
          <span v-if="edgeLabel" class="outline-drawer-edge-label" aria-hidden="true">{{ edgeLabel }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
const props = defineProps({ id: { type: String, required: true }, label: { type: String, required: true },
  width: { type: Number, default: 234 }, closeOnLeave: { type: Boolean, default: true },
  edgeLabel: { type: String, default: '' } });
const open = ref(false);
const grip = ref(null);
const close = () => {
  if (grip.value?.parentElement.contains(document.activeElement)) grip.value.focus();
  open.value = false;
};
const leaveFocus = event => {
  if (props.closeOnLeave && !event.currentTarget.contains(event.relatedTarget)) open.value = false;
};
defineExpose({ close, show: () => { open.value = true; } });
</script>

<style scoped>
.outline-drawer { position: relative; width: 44px; min-height: 0; flex: 0 0 44px; z-index: 40; }
.outline-drawer-track { position: absolute; left: 0; top: 0; bottom: 0; overflow: hidden; pointer-events: none; }
.outline-drawer-panel { display: flex; height: 100%; box-sizing: border-box;
  transform: translateX(calc(44px - 100%)); transition: transform .24s ease;
  background: var(--ui-surface); border: 1px solid var(--ui-border); border-radius: 0 10px 10px 0;
  box-shadow: var(--ui-shadow-md); pointer-events: auto; }
.outline-drawer-panel.is-open { transform: translateX(0); }
.outline-drawer-content { flex: 1; min-width: 0; overflow-y: auto; }
.outline-drawer-grip { flex: 0 0 23px; width: 23px; align-self: stretch; padding: 12px 0 0;
  display: flex; flex-direction: column; gap: 14px; justify-content: flex-start; align-items: center;
  color: var(--ui-muted);
  background: transparent; border: 0; border-left: 1px solid var(--ui-border); border-radius: 0 10px 10px 0;
  cursor: pointer; font: 600 20px/1 var(--ui-font); }
.outline-drawer-edge-label { writing-mode: vertical-rl; text-orientation: mixed;
  font: 700 11px/1 var(--ui-font); letter-spacing: 2px; }
.outline-drawer-grip:hover { color: var(--ui-text); background: var(--ui-surface-soft); }
.outline-drawer-grip:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: -3px; }
@media (prefers-reduced-motion: reduce) { .outline-drawer-panel { transition: none; } }
</style>
