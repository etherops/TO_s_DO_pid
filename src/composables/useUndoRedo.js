import { computed, ref } from 'vue';
import { parseTodoMdFile, renderTodoMdFile } from '../utils/TodoMdParser';

const splitLines = (content) => content === '' ? [] : content.split('\n');
const joinLines = (lines) => lines.join('\n');

const linesEqual = (left, right) => {
  if (left.length !== right.length) return false;
  return left.every((line, index) => line === right[index]);
};

const createSingleHunkPatch = (oldLines, newLines, prefixLength, oldEnd, newEnd) => ({
  hunks: [{
    oldStart: prefixLength,
    newStart: prefixLength,
    oldLines: oldLines.slice(prefixLength, oldEnd),
    newLines: newLines.slice(prefixLength, newEnd)
  }]
});

export function createTextPatch(before, after) {
  const oldLines = splitLines(before);
  const newLines = splitLines(after);

  let prefixLength = 0;
  while (
    prefixLength < oldLines.length &&
    prefixLength < newLines.length &&
    oldLines[prefixLength] === newLines[prefixLength]
  ) {
    prefixLength++;
  }

  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (
    oldEnd > prefixLength &&
    newEnd > prefixLength &&
    oldLines[oldEnd - 1] === newLines[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  const oldMiddleLength = oldEnd - prefixLength;
  const newMiddleLength = newEnd - prefixLength;
  if (oldMiddleLength === 0 && newMiddleLength === 0) {
    return { hunks: [] };
  }

  // Large middle edits are still stored as a patch hunk, but avoid an expensive
  // LCS matrix when a broad rewrite or reorder touches much of the file.
  if (oldMiddleLength * newMiddleLength > 40000) {
    return createSingleHunkPatch(oldLines, newLines, prefixLength, oldEnd, newEnd);
  }

  const oldMiddle = oldLines.slice(prefixLength, oldEnd);
  const newMiddle = newLines.slice(prefixLength, newEnd);
  const table = Array.from({ length: oldMiddle.length + 1 }, () =>
    Array(newMiddle.length + 1).fill(0)
  );

  for (let oldIndex = oldMiddle.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newMiddle.length - 1; newIndex >= 0; newIndex--) {
      table[oldIndex][newIndex] = oldMiddle[oldIndex] === newMiddle[newIndex]
        ? table[oldIndex + 1][newIndex + 1] + 1
        : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  const hunks = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldMiddle.length || newIndex < newMiddle.length) {
    if (
      oldIndex < oldMiddle.length &&
      newIndex < newMiddle.length &&
      oldMiddle[oldIndex] === newMiddle[newIndex]
    ) {
      oldIndex++;
      newIndex++;
      continue;
    }

    const hunk = {
      oldStart: prefixLength + oldIndex,
      newStart: prefixLength + newIndex,
      oldLines: [],
      newLines: []
    };

    while (
      oldIndex < oldMiddle.length ||
      newIndex < newMiddle.length
    ) {
      if (
        oldIndex < oldMiddle.length &&
        newIndex < newMiddle.length &&
        oldMiddle[oldIndex] === newMiddle[newIndex]
      ) {
        break;
      }

      if (
        newIndex < newMiddle.length &&
        (oldIndex === oldMiddle.length ||
          table[oldIndex][newIndex + 1] >= table[oldIndex + 1][newIndex])
      ) {
        hunk.newLines.push(newMiddle[newIndex]);
        newIndex++;
      } else {
        hunk.oldLines.push(oldMiddle[oldIndex]);
        oldIndex++;
      }
    }

    hunks.push(hunk);
  }

  return { hunks };
}

export function applyTextPatch(content, patch, direction = 'forward') {
  const lines = splitLines(content);
  const isForward = direction === 'forward';
  let offset = 0;

  for (const hunk of patch.hunks) {
    const start = (isForward ? hunk.oldStart : hunk.newStart) + offset;
    const expectedLines = isForward ? hunk.oldLines : hunk.newLines;
    const replacementLines = isForward ? hunk.newLines : hunk.oldLines;
    const actualLines = lines.slice(start, start + expectedLines.length);

    if (!linesEqual(actualLines, expectedLines)) {
      throw new Error(`Cannot apply ${direction} patch at line ${start + 1}`);
    }

    lines.splice(start, expectedLines.length, ...replacementLines);
    offset += replacementLines.length - expectedLines.length;
  }

  return joinLines(lines);
}

export function useUndoRedo(todoData, options = {}) {
  const {
    serialize = renderTodoMdFile,
    deserialize = parseTodoMdFile,
    persist = async () => true,
    maxDepth = 100
  } = options;

  const undoStack = ref([]);
  const redoStack = ref([]);
  const currentContent = ref('');

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const getContent = () => serialize(todoData.value) || '';

  const hasPendingNewItem = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (value.isNew) return true;

    if (Array.isArray(value)) {
      return value.some(item => hasPendingNewItem(item));
    }

    return Object.values(value).some(item => hasPendingNewItem(item));
  };

  const trimUndoStack = () => {
    if (undoStack.value.length > maxDepth) {
      undoStack.value.splice(0, undoStack.value.length - maxDepth);
    }
  };

  const resetHistory = () => {
    undoStack.value = [];
    redoStack.value = [];
    currentContent.value = getContent();
  };

  const recordPersistedContent = async (nextContent) => {
    if (nextContent !== currentContent.value && !hasPendingNewItem(todoData.value)) {
      undoStack.value.push(createTextPatch(currentContent.value, nextContent));
      trimUndoStack();
      redoStack.value = [];
      currentContent.value = nextContent;
    }
  };

  const recordChangeAndPersist = async () => {
    await recordPersistedContent(getContent());

    return await persist();
  };

  const restoreContent = async (content) => {
    todoData.value = deserialize(content);
    currentContent.value = content;
    return await persist({ skipHistory: true });
  };

  const undo = async () => {
    if (!canUndo.value) return false;

    const patch = undoStack.value.pop();
    const previousContent = applyTextPatch(getContent(), patch, 'reverse');
    redoStack.value.push(patch);
    await restoreContent(previousContent);
    return true;
  };

  const redo = async () => {
    if (!canRedo.value) return false;

    const patch = redoStack.value.pop();
    const nextContent = applyTextPatch(getContent(), patch, 'forward');
    undoStack.value.push(patch);
    trimUndoStack();
    await restoreContent(nextContent);
    return true;
  };

  return {
    canUndo,
    canRedo,
    resetHistory,
    recordPersistedContent,
    recordChangeAndPersist,
    undo,
    redo
  };
}
