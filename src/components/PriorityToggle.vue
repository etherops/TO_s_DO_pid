<template>
  <button
      type="button"
      class="priority-toggle"
      :class="{ active: low }"
      :title="low ? 'Make normal priority' : 'Make low priority'"
      :aria-label="low ? 'Make normal priority' : 'Make low priority'"
      @click.stop="$emit('toggle')"
  >{{ low ? 'LOW' : '↓' }}</button>
</template>

<script setup>
defineProps({
  low: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle']);
</script>

<style scoped>
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

.priority-toggle.active {
  font-size: 7px;
  letter-spacing: 0.3px;
}
</style>
