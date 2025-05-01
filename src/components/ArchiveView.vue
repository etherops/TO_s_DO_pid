<template>
  <div class="archive-container">
    <h2>Archive</h2>
    
    <div class="archive-content">
      <div v-for="(group, category) in groupedArchive" :key="category" class="archive-group">
        <h3 class="archive-group-title">{{ category }}</h3>
        <div v-for="item in group" :key="item.id" class="archive-item">
          <span class="status" :class="getStatusClass(item)">
            {{ item.status }}
          </span>
          <span class="archive-item-text">{{ item.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'ArchiveView',
  props: {
    archiveItems: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    // Group archive items by category
    const groupedArchive = computed(() => {
      const grouped = {};
      
      props.archiveItems.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });
      
      return grouped;
    });

    // Determine CSS class based on item status
    const getStatusClass = (item) => {
      if (item.status === '[x]') return 'done';
      if (item.status === '[~]') return 'in-progress';
      if (item.status === '[ ]') return 'todo';
      return '';
    };

    return {
      groupedArchive,
      getStatusClass
    };
  }
}
</script>

<style scoped>
.archive-container {
  padding: 20px;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.archive-group {
  margin-bottom: 30px;
  background-color: #f9f9f9;
  border-radius: 5px;
  padding: 15px;
}

.archive-group-title {
  margin-top: 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.archive-item {
  padding: 8px;
  margin-bottom: 4px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.archive-item-text {
  margin-left: 10px;
}

.status.done {
  color: #4caf50;
}

.status.in-progress {
  color: #ff9800;
}

.status.todo {
  color: #f44336;
}
</style>
