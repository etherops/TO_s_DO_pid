<template>
  <section class="raw-mode">
    <header class="raw-toolbar">
      <div><h1>Raw</h1><span>{{ fileLabel }} · {{ editing ? 'Editing Markdown' : 'Read only' }}</span></div>
      <div class="raw-actions">
        <button v-if="!editing" :disabled="loading || !sourceLoaded" @click="editing = true">Edit</button>
        <template v-else>
          <span v-if="dirty" class="raw-unsaved">Unsaved changes</span>
          <button :disabled="saving" @click="cancel">Cancel</button>
          <button class="raw-save" :disabled="saving || !dirty || !draft.trim()" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </template>
      </div>
    </header>
    <div v-if="error" class="raw-error" role="alert">{{ error }}</div>
    <p v-if="editing && !draft.trim()" class="raw-error">An empty file cannot be saved here.</p>
    <p v-if="loading" class="raw-loading">Loading source…</p>
    <textarea v-else v-model="draft" class="raw-source" :readonly="!editing || saving"
              aria-label="Raw Markdown" spellcheck="false" autocapitalize="off" autocomplete="off"
              @keydown.meta.s.prevent="save" @keydown.ctrl.s.prevent="save" />
    <footer>Exact source text · No formatting changes on save</footer>
    <div v-if="leaveResolver" class="raw-modal-overlay">
      <section class="raw-modal" role="dialog" aria-modal="true" aria-labelledby="raw-leave-title"
               @keydown.esc.prevent="resolveLeave(false)" @keydown.tab="trapFocus">
        <h2 id="raw-leave-title">Discard unsaved Markdown changes?</h2>
        <p>Your file has not been changed. Keep editing to preserve your draft, or discard it to continue.</p>
        <div class="raw-actions">
          <button ref="keepEditingButton" @click="resolveLeave(false)">Keep editing</button>
          <button @click="resolveLeave(true)">Discard changes</button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import axios from 'axios';

const props = defineProps({ filePath: { type: String, required: true }, fileLabel: String, revision: Object });
const emit = defineEmits(['saved']);
const endpoint = 'http://localhost:3001/api/todos';
const draft = ref('');
const original = ref('');
const editing = ref(false);
const loading = ref(false);
const sourceLoaded = ref(false);
const saving = ref(false);
const error = ref('');
const dirty = computed(() => editing.value && draft.value !== original.value);
const leaveResolver = shallowRef(null);
const keepEditingButton = ref(null);
let loadSequence = 0;

watch(() => [props.filePath, props.revision], async ([path], previous) => {
  if (previous?.[0] === path && editing.value) return;
  const sequence = ++loadSequence;
  editing.value = false;
  loading.value = true;
  sourceLoaded.value = false;
  error.value = '';
  draft.value = original.value = '';
  try {
    if (!path) return;
    const response = await axios.get(endpoint, { params: { path } });
    if (sequence !== loadSequence) return;
    draft.value = original.value = response.data.content;
    sourceLoaded.value = true;
  } catch {
    if (sequence === loadSequence) error.value = 'Could not load the source. Try reopening Raw.';
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}, { immediate: true });

const save = async () => {
  if (!editing.value || !dirty.value || saving.value || !draft.value.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    await axios.post(endpoint, { path: props.filePath, content: draft.value, expectedContent: original.value });
    original.value = draft.value;
    editing.value = false;
    emit('saved');
  } catch (failure) {
    error.value = failure.response?.status === 409
      ? 'The file changed elsewhere. Your draft is still here. Copy it before cancelling and reopening Raw to compare.'
      : 'Could not save. Your draft is still here; no successful save was confirmed.';
  } finally { saving.value = false; }
};

const confirmLeave = () => {
  if (saving.value) return Promise.resolve(false);
  if (!dirty.value) return Promise.resolve(true);
  if (leaveResolver.value) return Promise.resolve(false);
  return new Promise(resolve => {
    leaveResolver.value = resolve;
    nextTick(() => keepEditingButton.value?.focus());
  });
};
const resolveLeave = allowed => {
  leaveResolver.value?.(allowed);
  leaveResolver.value = null;
};
const cancel = async () => {
  if (!await confirmLeave()) return;
  draft.value = original.value;
  editing.value = false;
  error.value = '';
};
const trapFocus = event => {
  const buttons = [...event.currentTarget.querySelectorAll('button')];
  const first = buttons[0];
  const last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};
const beforeUnload = event => {
  if (!dirty.value && !saving.value) return;
  event.preventDefault();
  event.returnValue = '';
};
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => {
  loadSequence++;
  resolveLeave(false);
  window.removeEventListener('beforeunload', beforeUnload);
});
defineExpose({ confirmLeave });
</script>

<style scoped>
.raw-mode { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 16px 22px; gap: 12px; color: var(--ui-text); }
.raw-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.raw-toolbar h1 { font-size: 22px; margin: 0 0 3px; }
.raw-toolbar span, footer { font-size: 12px; color: var(--ui-muted); }
.raw-actions { display: flex; align-items: center; gap: 8px; }
button { background: var(--ui-surface); border: 1px solid var(--ui-border-strong); color: var(--ui-text); border-radius: 7px; padding: 7px 13px; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
.raw-save { border-color: var(--ui-green); color: var(--ui-green); }
.raw-source { flex: 1; min-height: 200px; resize: none; padding: 18px; border: 1px solid var(--ui-border); border-radius: 10px; background: var(--ui-surface); color: var(--ui-text); font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; white-space: pre; overflow: auto; }
.raw-source[readonly] { background: var(--ui-surface-soft); }
.raw-error { color: var(--ui-blocked); padding: 8px 12px; border: 1px solid var(--ui-border); border-radius: 6px; font-size: 13px; }
.raw-modal-overlay { position: fixed; inset: 0; display: grid; place-items: center; background: #0006; z-index: 10000; padding: 20px; }
.raw-modal { max-width: 480px; padding: 24px; background: var(--ui-surface); border: 1px solid var(--ui-border); border-radius: 14px; box-shadow: var(--ui-shadow-md); }
.raw-modal h2 { font-size: 19px; margin: 0 0 12px; }
.raw-modal p { font-size: 14px; color: var(--ui-muted); }
.raw-modal .raw-actions { justify-content: flex-end; }
</style>
