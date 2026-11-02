<template>
  <span v-if="splitNormal && !low && !high" class="priority-directions" role="group" aria-label="Change priority">
    <button type="button" class="priority-toggle" title="Make high priority" aria-label="Make high priority"
            @click.stop="$emit('set-priority', 'high')">↑</button>
    <button type="button" class="priority-toggle" title="Make low priority" aria-label="Make low priority"
            @click.stop="$emit('set-priority', 'low')">↓</button>
  </span>
  <button
      v-else
      type="button"
      class="priority-toggle"
      :class="{ active: low || high, high, 'high-arrow': high && highArrow }"
      :title="high ? 'Make normal priority' : low ? 'Make high priority' : 'Make low priority'"
      :aria-label="high ? 'Make normal priority' : low ? 'Make high priority' : 'Make low priority'"
      @click.stop="$emit('toggle')"
  >{{ high ? (highArrow ? '↓' : 'HIGH') : low ? 'LOW' : '↕' }}</button>
</template>

<script setup>
defineProps({
  splitNormal: Boolean,
  high: Boolean,
  highArrow: Boolean,
  low: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle', 'set-priority']);
</script>

<style scoped>
.priority-directions { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 0; }
.priority-directions .priority-toggle { width: 12px; min-width: 12px; padding: 0 1px; font-size: 10px; }
.priority-toggle:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 1px; }
.priority-toggle {
  flex: 0 0 auto;
  min-width: 19px;
  height: 18px;
  box-sizing: border-box;
  padding: 0 4px;
  color: #697483;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  /* Keep the arrow identical in Focus and the Arial-based board. Inheriting
     here changes the glyph metrics and makes the board arrow sit too low. */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  opacity: 1;
  cursor: pointer;
}

.priority-toggle:hover,
.priority-toggle.active {
  color: #9ca5b1;
  border-color: #4b5563;
  background: rgba(255, 255, 255, 0.035);
}
.priority-toggle.high.high-arrow {
  color: #8996a5;
  padding: 0 2px;
  font-size: 12px;
  letter-spacing: 0;
  background: transparent;
  border-color: transparent;
}
.priority-toggle.high {
  color: #9674bb;
  border-color: #b89ad1;
  background: #b89ad11a;
}

.priority-toggle.active {
  font-size: 7px;
  letter-spacing: 0.3px;
}
</style>
