import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { applyTextPatch, createTextPatch, useUndoRedo } from '../../../src/composables/useUndoRedo';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

const makeData = (taskText = 'Task 1') => parseTodoMdFile(`# TODO
## Tasks
* [ ] ${taskText}`);

const firstTask = (todoData) => todoData.value.columnStacks.TODO.sections[0].items[0];

describe('useUndoRedo', () => {
  it('creates file patches that can be applied forward and backward', () => {
    const before = `# TODO
## Tasks
* [ ] Task 1
* [ ] Task 2
* [ ] Task 3`;
    const after = `# TODO
## Tasks
* [ ] Task 1
* [ ] Updated task
* [ ] Task 3`;
    const patch = createTextPatch(before, after);

    expect(patch.hunks).toEqual([{
      oldStart: 3,
      newStart: 3,
      oldLines: ['* [ ] Task 2'],
      newLines: ['* [ ] Updated task']
    }]);
    expect(applyTextPatch(before, patch, 'forward')).toBe(after);
    expect(applyTextPatch(after, patch, 'reverse')).toBe(before);
  });

  it('records patches and restores previous file contents', async () => {
    const todoData = ref(makeData());
    const persist = vi.fn().mockResolvedValue(true);
    const history = useUndoRedo(todoData, { persist });

    history.resetHistory();
    firstTask(todoData).text = 'Task 2';
    firstTask(todoData).displayText = 'Task 2';

    await history.recordChangeAndPersist();

    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(false);

    await history.undo();

    expect(renderTodoMdFile(todoData.value)).toContain('* [ ] Task 1');
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(true);

    await history.redo();

    expect(renderTodoMdFile(todoData.value)).toContain('* [ ] Task 2');
    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(false);
    expect(persist).toHaveBeenCalledTimes(3);
    expect(persist).toHaveBeenNthCalledWith(2, { skipHistory: true });
    expect(persist).toHaveBeenNthCalledWith(3, { skipHistory: true });
  });

  it('clears redo history after a new change', async () => {
    const todoData = ref(makeData());
    const history = useUndoRedo(todoData);

    history.resetHistory();
    firstTask(todoData).text = 'Task 2';
    firstTask(todoData).displayText = 'Task 2';
    await history.recordChangeAndPersist();
    await history.undo();

    firstTask(todoData).text = 'Task 3';
    firstTask(todoData).displayText = 'Task 3';
    await history.recordChangeAndPersist();

    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(false);
    expect(renderTodoMdFile(todoData.value)).toContain('* [ ] Task 3');
  });

  it('does not create a separate undo step for temporary new items', async () => {
    const todoData = ref(makeData());
    const history = useUndoRedo(todoData);

    history.resetHistory();
    const items = todoData.value.columnStacks.TODO.sections[0].items;
    items.push({
      id: 2,
      type: 'task',
      statusChar: ' ',
      text: '',
      displayText: '',
      isNew: true
    });
    await history.recordChangeAndPersist();

    delete items[1].isNew;
    items[1].text = 'Task 2';
    items[1].displayText = 'Task 2';
    await history.recordChangeAndPersist();
    await history.undo();

    expect(renderTodoMdFile(todoData.value)).not.toContain('Task 2');
    expect(todoData.value.columnStacks.TODO.sections[0].items).toHaveLength(1);
  });

  it('records a new section once its temporary new flag is cleared', async () => {
    const todoData = ref(makeData());
    const history = useUndoRedo(todoData);

    history.resetHistory();
    const sections = todoData.value.columnStacks.TODO.sections;
    sections.unshift({
      name: 'New Section 1',
      type: 'section',
      headerStyle: 'LARGE',
      archivable: false,
      items: [],
      isNew: true
    });
    await history.recordChangeAndPersist();

    sections[0].name = 'Fresh Section';
    delete sections[0].isNew;
    await history.recordChangeAndPersist();

    expect(history.canUndo.value).toBe(true);
    expect(renderTodoMdFile(todoData.value)).toContain('## Fresh Section');

    await history.undo();

    expect(renderTodoMdFile(todoData.value)).not.toContain('## Fresh Section');
    expect(todoData.value.columnStacks.TODO.sections).toHaveLength(1);
  });
});
