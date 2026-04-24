<!-- components/HistoryPanel.vue -->
<template>
  <div class="history-overlay" @click.self="$emit('close')">
    <aside class="history-panel">
      <header class="history-header">
        <div class="history-title">
          <span class="title-main">Version history</span>
          <span class="title-sub" v-if="fileLabel">{{ fileLabel }}</span>
        </div>
        <button class="icon-btn" aria-label="Close" @click="$emit('close')">×</button>
      </header>

      <div class="history-body">
        <div class="version-list">
          <div v-if="loading" class="version-empty">Loading...</div>
          <div v-else-if="!versions.length" class="version-empty">No backups yet</div>
          <button
              v-for="v in versions"
              :key="v.date"
              :class="['version-item', { active: v.date === selectedDate }]"
              @click="selectVersion(v.date)"
          >
            <span class="version-date">{{ formatDate(v.date) }}</span>
            <span class="version-time">{{ formatTime(v.mtime) }}</span>
            <span class="version-meta">{{ formatBytes(v.size) }}</span>
          </button>
        </div>

        <section class="version-preview">
          <div class="preview-toolbar">
            <div class="preview-label">
              <template v-if="selectedDate">
                <span class="label-main">Diff: {{ formatDate(selectedDate) }} → current</span>
                <span class="label-stats" v-if="!previewLoading && selectedContent">
                  <span class="stat add">+{{ diffStats.added }}</span>
                  <span class="stat remove">−{{ diffStats.removed }}</span>
                </span>
              </template>
              <span v-else class="muted">Select a version</span>
            </div>
            <div class="preview-actions">
              <button
                  class="restore-btn"
                  :disabled="!selectedContent || restoring"
                  @click="restore"
              >
                {{ restoring ? 'Restoring...' : 'Restore this version' }}
              </button>
            </div>
          </div>

          <div class="preview-content">
            <div v-if="previewLoading" class="preview-empty">Loading version...</div>
            <div v-else-if="!selectedContent" class="preview-empty muted">Pick a version on the left to diff.</div>
            <div v-else-if="diffRows.length === 0" class="preview-empty">This version matches the current file — no changes.</div>
            <div v-else class="diff-view">
              <div
                  v-for="(row, i) in diffRows"
                  :key="i"
                  :class="['diff-row', row.type]"
              >
                <span class="gutter">{{ row.sigil }}</span>
                <span class="line-num old">{{ row.oldNum || '' }}</span>
                <span class="line-num new">{{ row.newNum || '' }}</span>
                <span class="line-content">{{ row.text }}</span>
                <button
                    v-if="row.type === 'remove'"
                    class="line-restore-btn"
                    :disabled="restoringLineIdx === i"
                    :title="`Restore this line back into the current file`"
                    @click="restoreLine(row, i)"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                    <path fill="currentColor" d="M13 3a9 9 0 1 0 8.94 10h-2.02A7 7 0 1 1 13 5v3l4-4-4-4v3z"/>
                  </svg>
                  <span>Restore</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const CONTEXT_LINES = 3;

const props = defineProps({
  filePath: { type: String, required: true },
  fileLabel: { type: String, default: '' },
  currentContent: { type: String, default: '' },
});

const emit = defineEmits(['close', 'restored']);

const versions = ref([]);
const loading = ref(false);
const selectedDate = ref('');
const selectedContent = ref('');
const previewLoading = ref(false);
const restoring = ref(false);
const restoringLineIdx = ref(-1);

const loadVersions = async () => {
  if (!props.filePath) return;
  loading.value = true;
  try {
    const res = await axios.get(`${API_BASE_URL}/history`, { params: { path: props.filePath } });
    versions.value = res.data.versions || [];
    if (versions.value.length) await selectVersion(versions.value[0].date);
  } catch (e) {
    console.error('Failed to load history:', e);
    versions.value = [];
  } finally {
    loading.value = false;
  }
};

const selectVersion = async (date) => {
  selectedDate.value = date;
  previewLoading.value = true;
  selectedContent.value = '';
  try {
    const res = await axios.get(`${API_BASE_URL}/history/version`, {
      params: { path: props.filePath, date },
    });
    selectedContent.value = res.data.content || '';
  } catch (e) {
    console.error('Failed to load version:', e);
    selectedContent.value = '';
  } finally {
    previewLoading.value = false;
  }
};

const restore = async () => {
  if (!selectedContent.value || !props.filePath) return;
  const label = `${formatDate(selectedDate.value)} at ${formatTime(selectedVersionMtime.value)}`;
  if (!window.confirm(`Replace current file with the version from ${label}?`)) return;
  restoring.value = true;
  try {
    await axios.post(`${API_BASE_URL}/todos`, {
      content: selectedContent.value,
      path: props.filePath,
    });
    emit('restored');
    emit('close');
  } catch (e) {
    console.error('Failed to restore version:', e);
    window.alert('Failed to restore version. Check server logs.');
  } finally {
    restoring.value = false;
  }
};

const restoreLine = async (row, rowIdx) => {
  if (!props.filePath || restoringLineIdx.value !== -1) return;
  restoringLineIdx.value = rowIdx;
  try {
    const newLines = (props.currentContent || '').split('\n');
    // insertAfterNewIdx is 0-based index in newLines; -1 means insert at top.
    const at = row.insertAfterNewIdx + 1;
    newLines.splice(at, 0, row.text);
    await axios.post(`${API_BASE_URL}/todos`, {
      content: newLines.join('\n'),
      path: props.filePath,
    });
    emit('restored');
  } catch (e) {
    console.error('Failed to restore line:', e);
    window.alert('Failed to restore line. Check server logs.');
  } finally {
    restoringLineIdx.value = -1;
  }
};

const selectedVersionMtime = computed(() => {
  const match = versions.value.find(v => v.date === selectedDate.value);
  return match ? match.mtime : null;
});

const formatDate = (date) => {
  if (!date) return '';
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  if (date === today) return `${pretty} · Today`;
  if (date === yesterday) return `${pretty} · Yesterday`;
  return pretty;
};

const formatTime = (mtime) => {
  if (!mtime) return '';
  return new Date(mtime).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Line-level LCS. Returns an ops array:
//   { type: 'equal' | 'remove' | 'add', oldIdx?, newIdx? }
const computeLcsOps = (oldLines, newLines) => {
  const n = oldLines.length;
  const m = newLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: 'equal', oldIdx: i, newIdx: j });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'remove', oldIdx: i });
      i++;
    } else {
      ops.push({ type: 'add', newIdx: j });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'remove', oldIdx: i++ }); }
  while (j < m) { ops.push({ type: 'add', newIdx: j++ }); }
  return ops;
};

// Collapse long runs of 'equal' ops down to CONTEXT_LINES around each change.
const compactOps = (ops) => {
  const changeIdxs = ops.map((o, i) => o.type !== 'equal' ? i : -1).filter(i => i >= 0);
  if (changeIdxs.length === 0) return [];
  const keep = new Set();
  for (const idx of changeIdxs) {
    keep.add(idx);
    for (let k = 1; k <= CONTEXT_LINES; k++) {
      if (idx - k >= 0) keep.add(idx - k);
      if (idx + k < ops.length) keep.add(idx + k);
    }
  }
  const out = [];
  let skipped = 0;
  for (let i = 0; i < ops.length; i++) {
    if (keep.has(i)) {
      if (skipped > 0) {
        out.push({ type: 'skip', count: skipped });
        skipped = 0;
      }
      out.push(ops[i]);
    } else {
      skipped++;
    }
  }
  return out;
};

const diffRows = computed(() => {
  if (!selectedContent.value) return [];
  const oldLines = selectedContent.value.split('\n');
  const newLines = (props.currentContent || '').split('\n');
  const ops = compactOps(computeLcsOps(oldLines, newLines));
  const rows = [];
  // Anchor tracking: index in newLines of the last 'equal' we saw. A removed
  // line should be re-inserted just after this position to keep its original
  // neighbourhood. -1 means "insert at the very top".
  let lastEqualNewIdx = -1;
  for (const op of ops) {
    if (op.type === 'skip') {
      rows.push({ type: 'skip', sigil: '⋯', text: `${op.count} unchanged line${op.count === 1 ? '' : 's'}` });
    } else if (op.type === 'equal') {
      lastEqualNewIdx = op.newIdx;
      rows.push({
        type: 'equal', sigil: ' ',
        oldNum: op.oldIdx + 1, newNum: op.newIdx + 1,
        text: oldLines[op.oldIdx],
      });
    } else if (op.type === 'remove') {
      rows.push({
        type: 'remove', sigil: '−',
        oldNum: op.oldIdx + 1, newNum: '',
        text: oldLines[op.oldIdx],
        insertAfterNewIdx: lastEqualNewIdx,
      });
    } else {
      lastEqualNewIdx = op.newIdx;
      rows.push({
        type: 'add', sigil: '+',
        oldNum: '', newNum: op.newIdx + 1,
        text: newLines[op.newIdx],
      });
    }
  }
  return rows;
});

const diffStats = computed(() => {
  let added = 0, removed = 0;
  for (const r of diffRows.value) {
    if (r.type === 'add') added++;
    else if (r.type === 'remove') removed++;
  }
  return { added, removed };
});

watch(() => props.filePath, loadVersions, { immediate: true });
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.history-panel {
  width: min(900px, 90vw);
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 16px rgba(0, 0, 0, 0.15);
  animation: slide-in 0.18s ease-out;
}

@keyframes slide-in {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.history-title { display: flex; flex-direction: column; }
.title-main { font-size: 16px; font-weight: 600; color: #333; }
.title-sub { font-size: 12px; color: #888; margin-top: 2px; }

.icon-btn {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
}
.icon-btn:hover { background: #eee; color: #333; }

.history-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.version-list {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 8px 0;
  background: #fcfcfc;
}

.version-empty {
  padding: 16px;
  font-size: 13px;
  color: #888;
}

.version-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  align-items: center;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.version-item:hover { background: #f0f0f0; }
.version-item.active {
  background: #e8f5e9;
  border-left-color: #4caf50;
}
.version-date { font-size: 13px; color: #333; font-weight: 500; grid-column: 1; grid-row: 1; }
.version-time { font-size: 12px; color: #1976d2; grid-column: 2; grid-row: 1; font-variant-numeric: tabular-nums; }
.version-meta { font-size: 11px; color: #999; grid-column: 1 / -1; grid-row: 2; }

.version-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  gap: 12px;
}
.preview-label { font-size: 13px; color: #555; font-weight: 500; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.preview-label .muted { color: #999; font-weight: 400; }
.preview-label .label-stats { display: inline-flex; gap: 8px; font-size: 12px; font-variant-numeric: tabular-nums; }
.preview-label .stat.add { color: #2e7d32; }
.preview-label .stat.remove { color: #c62828; }
.preview-actions { display: flex; align-items: center; gap: 12px; }

.restore-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.restore-btn:hover:not(:disabled) { background: #43a047; }
.restore-btn:disabled { background: #bbb; cursor: not-allowed; }

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  background: #fff;
}
.preview-empty { color: #666; padding: 20px 24px; }
.preview-empty.muted { color: #aaa; }

.diff-view {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
}

.diff-row {
  display: grid;
  grid-template-columns: 20px 44px 44px 1fr auto;
  gap: 0;
  padding: 0 12px;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}
.diff-row.equal { background: #fff; color: #444; }
.diff-row.add { background: #e8f5e9; color: #1b5e20; }
.diff-row.remove { background: #ffebee; color: #b71c1c; }
.diff-row.skip { background: #fafafa; color: #888; font-style: italic; }

.diff-row .gutter { text-align: center; color: #888; }
.diff-row.add .gutter { color: #2e7d32; font-weight: 600; }
.diff-row.remove .gutter { color: #c62828; font-weight: 600; }

.diff-row .line-num {
  text-align: right;
  padding-right: 8px;
  color: #aaa;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.diff-row.skip .line-num { visibility: hidden; }
.diff-row.skip .line-content { padding-left: 8px; }

.diff-row .line-content { padding-left: 8px; }

.line-restore-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  padding: 2px 8px;
  background: #fff;
  color: #1b5e20;
  border: 1px solid #a5d6a7;
  border-radius: 10px;
  font: inherit;
  font-size: 11px;
  line-height: 1.3;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-1px);
  transition: opacity 0.12s ease, background 0.12s ease, color 0.12s ease;
  align-self: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.diff-row.remove:hover .line-restore-btn,
.line-restore-btn:focus-visible {
  opacity: 1;
}

.line-restore-btn:hover:not(:disabled) {
  background: #2e7d32;
  color: #fff;
  border-color: #2e7d32;
}

.line-restore-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
