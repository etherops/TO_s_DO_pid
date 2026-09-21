import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import FocusMode from '../../../src/components/FocusMode.vue';
import TaskCard from '../../../src/components/TaskCard.vue';
import { deriveFocusModel } from '../../../src/utils/focusModeHelpers';
import { updateSubtaskTitle } from '../../../src/utils/subtaskHelpers';
import { setDuePeriod } from '../../../src/utils/dateHelpers';
import SubtaskDatePicker from '../../../src/components/SubtaskDatePicker.vue';
import SubtaskEditor from '../../../src/components/SubtaskEditor.vue';

const source = '# WIP\n### Work\n+ [~] Parent\n  - [ ] Child\n  * [ ] Keep star\n'
  + '  + [~] Keep plus\n  unrecognized content\n  - Plain child\n* [ ] Separate';

describe('Nested subtasks', () => {
  it('keeps typed spaces in both existing and new child titles', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent\n  - [ ] Child (keep)');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      await wrapper.get('.subtask-indicator').trigger('click');
      const inputs = wrapper.findAll('[aria-label="Subtask title"]');
      await inputs[0].setValue('Child ');
      expect(wrapper.findAll('[aria-label="Subtask title"]')[0].element.value).toBe('Child ');
      await inputs[0].setValue('Child with spaces');
      await inputs[1].setValue('New ');
      expect(wrapper.findAll('[aria-label="Subtask title"]')[1].element.value).toBe('New ');
      await wrapper.findAll('[aria-label="Subtask title"]')[1].setValue('New child');
      await wrapper.get('.focus-edit-save').trigger('click');
      expect(data.columnStacks.WIP.sections[0].items[0].children.map(child => child.text))
        .toEqual(['Child with spaces (keep)', 'New child']);
    } finally { wrapper.unmount(); }
  });
  it('updates lifecycle dates when completing a child in its parent editor', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const wrapper = mount(SubtaskEditor, { props: { modelValue: [
      { id: 1, type: 'subtask', statusChar: ' ', text: 'Child (keep) ! Sep 25 2026' }
    ] } });
    try {
      await wrapper.findAll('.subtask-status')[0].trigger('click');
      expect(wrapper.emitted('update:modelValue')[0][0][0]).toMatchObject({
        statusChar: 'x', text: 'Child (keep) | Sep 21 2026'
      });
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('converts a task through the searchable initiative picker without losing metadata', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent initiative\n* [ ] Child (keep) ! Sep 21 2026');
    const section = data.columnStacks.WIP.sections[0];
    const wrapper = mount(FocusMode, { props: { todoData: data }, global: { stubs: { teleport: true } } });
    try {
      const row = wrapper.findAll('.panel-now .focus-task-row')[0];
      await row.trigger('contextmenu', { clientX: 100, clientY: 100 });
      await wrapper.get('.focus-task-context-convert').trigger('click');
      await wrapper.get('[aria-label="Search initiatives"]').setValue('Parent');
      await wrapper.get('.initiative-parent-options button').trigger('click');
      expect(section.items).toHaveLength(1);
      expect(section.items[0].children[0]).toMatchObject({ type: 'subtask', statusChar: ' ',
        text: 'Child (keep) ! Sep 21 2026' });
      expect(renderTodoMdFile(data)).toContain('  - [ ] Child (keep) ! Sep 21 2026');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('shows day-dated children in week-at-a-glance without drag or priority controls', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent\n  - [ ] Tomorrow child ! Sep 22 2026\n  - [ ] Undated child');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      const row = wrapper.findAll('.focus-week-day-column .focus-task-row')
        .find(row => row.text().includes('Tomorrow child'));
      expect(row).toBeDefined();
      expect(row.get('.focus-subtask-parent').text()).toContain('Parent');
      expect(row.find('.focus-drag-handle').exists()).toBe(false);
      expect(row.find('.focus-week-priority-badge').exists()).toBe(false);
      expect(wrapper.findAll('.focus-week-day-column .focus-task-row')
        .some(row => row.text().includes('Undated child'))).toBe(false);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('offers days, weeks and months without changing dates when switching precision', async () => {
    const wrapper = mount(SubtaskDatePicker, { props: { modelValue: 'month:2026-09' } });
    expect(wrapper.get('input[type="month"]').element.value).toBe('2026-09');
    await wrapper.findAll('button').find(button => button.text() === 'week').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await wrapper.get('input[type="week"]').setValue('2026-W39');
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('week:2026-09-20');
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper.findAll('button').find(button => button.text() === 'month').trigger('click');
    await wrapper.get('input[type="month"]').setValue('2026-10');
    expect(wrapper.emitted('update:modelValue')[1][0]).toBe('month:2026-10');
    wrapper.unmount();
  });
  it('edits a surfaced child without dropping hidden notes or detaching it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent\n  - [ ] Child (keep) (also keep) ! Sep 21 2026');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      expect(wrapper.get('.focus-subtask-parent').text()).toContain('Parent');
      expect(wrapper.findAll('.panel-now .focus-day-header').map(header => header.text()))
        .toContain('Today · Subtasks1');
      const childTitle = wrapper.findAll('.focus-row-title').find(button => button.text() === 'Child');
      await childTitle.trigger('click');
      expect(wrapper.find('.focus-edit-note').exists()).toBe(false);
      expect(wrapper.get('.subtask-parent-header').text()).toContain('Subtask of Parent');
      await wrapper.get('.focus-edit-name').setValue('Renamed child');
      await wrapper.get('.focus-edit-save').trigger('click');
      expect(task.children[0].text).toBe('Renamed child (keep) (also keep) ! Sep 21 2026');
      expect(data.columnStacks.WIP.sections[0].items).toHaveLength(1);
      await wrapper.findAll('.focus-row-title').find(button => button.text() === 'Renamed child').trigger('click');
      await wrapper.get('.focus-edit-name').setValue('Detached child');
      await wrapper.get('.subtask-parent-header button').trigger('click');
      expect(task.children).toHaveLength(0);
      const detached = data.columnStacks.WIP.sections[0].items[1];
      expect(detached).toMatchObject({ type: 'task', listMarker: '*', statusChar: ' ',
        text: 'Detached child (keep) (also keep) ! Sep 21 2026' });
      expect(renderTodoMdFile(data)).toContain('\n* [ ] Detached child (keep) (also keep) ! Sep 21 2026');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('preserves hidden notes and metadata when changing subtask title or due date', () => {
    const text = 'Call (keep this) vendor (and this) ! Sep 21 2026';
    const renamed = updateSubtaskTitle(text, 'Contact vendor');
    expect(renamed).toContain('(keep this)');
    expect(renamed).toContain('(and this)');
    expect(renamed).toContain('! Sep 21 2026');
    const dated = setDuePeriod(text, '2026-09-22');
    expect(dated).toBe('Call (keep this) vendor (and this) ! Sep 22 2026');
  });

  it('routes only qualifying dated children into NOW and In Progress, retaining their parents', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent\n'
      + '  - [ ] Today child (hidden note) ! Sep 21 2026\n'
      + '  - [~] Month child ! Sep 2026\n'
      + '  - [ ] Future child ! Dec 2099\n  - [~] Undated child');
    const model = deriveFocusModel(data, new Date(2026, 8, 21));
    expect(model.now.map(entry => entry.task.text)).toEqual(['Today child (hidden note) ! Sep 21 2026']);
    expect(model.now[0].parentTask.text).toBe('Parent');
    expect(model.inProgressQueued.some(entry => entry.task.text === 'Month child ! Sep 2026')).toBe(true);
    expect(Object.values(model).flat().some(entry => entry.task.text.startsWith('Future child'))).toBe(false);
    expect(Object.values(model).flat().some(entry => entry.task.text === 'Undated child')).toBe(false);
    expect(data.columnStacks.WIP.sections[0].items).toHaveLength(1);
  });
  it('sorts child rows in the draft and preserves raw content slots', async () => {
    const data = parseTodoMdFile(source);
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('.subtask-indicator').trigger('click');
    await wrapper.findAll('.subtask-drag-handle')[1].trigger('dragstart');
    await wrapper.findAll('.subtask-edit-row')[0].trigger('drop', { clientY: -1 });
    expect(wrapper.findAll('[aria-label="Subtask title"]')[0].element.value).toBe('Plain child');
    expect(task.children[0].text).toBe('Child');
    await wrapper.get('.focus-edit-save').trigger('click');
    expect(task.children[0].text).toBe('Plain child');
    expect(task.children[1].text).toBe('  * [ ] Keep star');
    expect(task.children[4].text).toBe('Child');
    wrapper.unmount();
  });
  it('keeps only minus children nested and preserves all attached source lines', () => {
    const data = parseTodoMdFile(source);
    const items = data.columnStacks.WIP.sections[0].items;
    expect(items).toHaveLength(2);
    expect(items[0].children.filter(child => child.type === 'subtask')).toHaveLength(2);
    expect(renderTodoMdFile(data)).toBe(source);
    items[0].children[0].statusChar = 'x';
    const rendered = renderTodoMdFile(data);
    expect(rendered).toContain('  - [x] Child');
    expect(rendered).toContain('  * [ ] Keep star\n  + [~] Keep plus\n  unrecognized content');
    expect(rendered).toContain('  - Plain child');
  });

  it.each([['Focus', FocusMode], ['Board', TaskCard]])('edits only inside the %s parent editor', async (mode, component) => {
    const data = parseTodoMdFile(source);
    const section = data.columnStacks.WIP.sections[0];
    const task = section.items[0];
    const props = mode === 'Focus' ? { todoData: data } : { task, section, column: 'WIP' };
    const wrapper = mount(component, { props });
    expect(wrapper.find('.subtask-editor').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Plain child');
    await wrapper.get(mode === 'Focus' ? '.focus-initiatives .focus-row-check' : '.custom-checkbox').trigger('click');
    expect(task.statusChar).toBe('~');
    await wrapper.get('.subtask-indicator').trigger('click');
    expect(wrapper.get(mode === 'Focus' ? '.focus-edit-note' : '.note-text-edit').attributes('rows')).toBe('1');
    expect(wrapper.findAll('.subtask-edit-row')).toHaveLength(3);
    expect(wrapper.find('.subtask-add').exists()).toBe(false);
    await wrapper.get('[aria-label="Subtask title"]').setValue('Changed child');
    await wrapper.get(mode === 'Focus' ? '.focus-edit-cancel' : '.cancel-edit-btn').trigger('click');
    expect(task.children[0].text).toBe('Child');
    await wrapper.get('.subtask-indicator').trigger('click');
    await wrapper.get('[aria-label="Subtask title"]').setValue('Changed child');
    await wrapper.get('.subtask-status').trigger('click');
    await wrapper.findAll('[aria-label="Subtask title"]')[0].trigger('keydown', { key: 'Enter' });
    expect(wrapper.findAll('.subtask-edit-row')).toHaveLength(3);
    await wrapper.findAll('[aria-label="Subtask title"]')[1].trigger('keydown', { key: 'Enter' });
    expect(wrapper.findAll('.subtask-edit-row')).toHaveLength(3);
    await wrapper.findAll('[aria-label="Subtask title"]')[2].setValue('New child');
    await wrapper.findAll('[aria-label="Subtask title"]')[2].trigger('keydown', { key: 'Enter' });
    await wrapper.get(mode === 'Focus' ? '.focus-edit-save' : '.confirm-edit-btn').trigger('click');
    expect(task.children[0].text).toMatch(/^Changed child \| /);
    expect(task.children[0].statusChar).toBe('x');
    expect(renderTodoMdFile(data)).toContain('  - [ ] New child');
    expect(task.children.filter(child => child.type === 'subtask')).toHaveLength(3);
    expect(renderTodoMdFile(data)).toContain('  * [ ] Keep star');
    expect(wrapper.find('.subtask-editor').exists()).toBe(false);
    wrapper.unmount();
  });
});
