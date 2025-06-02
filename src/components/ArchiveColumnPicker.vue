<template>
  <div class="modal-backdrop" @click.self="cancel">
    <div class="modal-content">
      <h3>Choose Archive Destination</h3>
      <p>Select which column to archive "{{ sectionName }}" to:</p>
      <div class="column-options">
        <button 
          v-for="column in availableColumns" 
          :key="column"
          class="column-option"
          @click="selectColumn(column)"
        >
          {{ column }}
        </button>
      </div>
      <button class="cancel-btn" @click="cancel">Cancel</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  sectionName: {
    type: String,
    required: true
  },
  availableColumns: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['select', 'cancel']);

const selectColumn = (column) => {
  emit('select', column);
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

p {
  margin: 10px 0 20px 0;
  color: #666;
}

.column-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.column-option {
  padding: 10px 20px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.column-option:hover {
  background-color: #e0e0e0;
  border-color: #999;
  transform: scale(1.02);
}

.cancel-btn {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: #f5f5f5;
  border-color: #999;
}
</style>