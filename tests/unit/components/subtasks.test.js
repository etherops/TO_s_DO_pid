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
  it.each([
    ['Focus', ' ', FocusMode], ['Focus', '~', FocusMode],
    ['Board', ' ', TaskCard], ['Board', '~', TaskCard]
  ])('allows %s parent completion from %s without completing children', async (mode, status, component) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1));
    const data = parseTodoMdFile(`# WIP\n### Work\n+ [${status}] Parent ! Oct 2 2026\n`
      + '  - [ ] Queued (keep note) ! Oct 3 2026\n  - [~] Started\n  - [-] Cancelled | Sep 30 2026');
    const section = data.columnStacks.WIP.sections[0];
    const task = section.items[0];
    const originalChildren = JSON.stringify(task.children);
    const props = mode === 'Focus' ? { todoData: data } : { task, section, column: 'WIP' };
    const wrapper = mount(component, { props });
    try {
      await wrapper.get(mode === 'Focus' ? '.focus-initiatives .focus-row-check' : '.custom-checkbox')
        .trigger('click');
      expect(task.statusChar).toBe('x');
      await vi.advanceTimersByTimeAsync(1600);
      expect(task.text).toBe('Parent | Oct 1 2026');
      expect(JSON.stringify(task.children)).toBe(originalChildren);
      expect(wrapper.emitted(mode === 'Focus' ? 'update' : 'task-updated')).toBeTruthy();
      expect(renderTodoMdFile(data)).toContain('+ [x] Parent | Oct 1 2026');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('confirms deletion of a nested child by identity without touching siblings or raw lines', async () => {
    const rows = [
      { id: 1, type: 'subtask', statusChar: ' ', text: 'Delete me' },
      { id: 2, type: 'raw-text', text: '  * Keep raw' },
      { id: 3, type: 'subtask', statusChar: 'x', text: 'Keep me | Sep 21 2026' }
    ];
    const wrapper = mount(SubtaskEditor, {
      props: { modelValue: rows }, global: { stubs: { teleport: true } }
    });
    try {
      await wrapper.findAll('.subtask-edit-row')[0].trigger('contextmenu', { clientX: 100, clientY: 100 });
      await wrapper.get('.subtask-context-delete').trigger('click');
      expect(wrapper.emitted('commit')).toBeUndefined();
      await wrapper.get('.subtask-context-menu').trigger('keydown', { key: 'Escape' });
      expect(wrapper.find('.subtask-context-menu').exists()).toBe(false);
      await wrapper.findAll('.subtask-edit-row')[0].trigger('contextmenu');
      await wrapper.get('.subtask-context-delete').trigger('click');
      await wrapper.setProps({ modelValue: [rows[2], rows[1], rows[0]] });
      await wrapper.get('.subtask-context-confirm').trigger('click');
      expect(wrapper.emitted('commit').at(-1)[0]).toEqual([rows[2], rows[1]]);
      expect(wrapper.find('.subtask-context-menu').exists()).toBe(false);
      await wrapper.findAll('.subtask-edit-row').at(-1).trigger('contextmenu');
      expect(wrapper.find('.subtask-context-menu').exists()).toBe(false);
    } finally { wrapper.unmount(); }
  });
  it('deletes a surfaced subtask without deleting its parent or offering column movement', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent\n'
      + '  - [ ] Delete me ! Sep 21 2026\n  * Keep raw\n  - [ ] Keep child');
    const parent = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data }, global: { stubs: { teleport: true } } });
    try {
      await wrapper.get('.panel-now .focus-task-row').trigger('contextmenu', { clientX: 100, clientY: 100 });
      expect(wrapper.find('.focus-inline-editor').exists()).toBe(false);
      expect(wrapper.find('.focus-task-context-column').exists()).toBe(false);
      expect(wrapper.find('.focus-task-context-convert').exists()).toBe(false);
      expect(wrapper.get('.focus-task-context-delete').text()).toBe('Delete subtask');
      await wrapper.get('.focus-task-context-delete').trigger('click');
      expect(parent.children).toHaveLength(3);
      await wrapper.get('.focus-task-context-confirm-delete').trigger('click');
      expect(data.columnStacks.WIP.sections[0].items).toHaveLength(1);
      expect(parent.children.map(child => child.text)).toEqual(['  * Keep raw', 'Keep child']);
      expect(wrapper.emitted('update')).toHaveLength(1);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it.each(['x', '-'])('edits and clears completion dates without changing %s status or metadata', async statusChar => {
    const child = { id: 1, type: 'subtask', statusChar, text: 'Child (keep note) | Sep 20 2026' };
    const raw = { type: 'raw-text', text: '  * Keep unsupported content' };
    const wrapper = mount(SubtaskEditor, { props: { modelValue: [child, raw] } });
    try {
      await wrapper.get('[aria-label="Edit subtask completion date"]').trigger('click');
      expect(wrapper.get('input[type="date"]').element.value).toBe('2026-09-20');
      await wrapper.get('input[type="date"]').setValue('2026-09-19');
      const rows = wrapper.emitted('commit').at(-1)[0];
      expect(rows[0]).toEqual({ ...child, text: 'Child (keep note) | Sep 19 2026' });
      expect(rows[1]).toEqual(raw);
      expect(wrapper.find('.subtask-date-picker').exists()).toBe(false);
      await wrapper.setProps({ modelValue: rows });
      await wrapper.get('[aria-label="Edit subtask completion date"]').trigger('click');
      await wrapper.findAll('.subtask-date-picker button').find(button => button.text() === 'Clear').trigger('click');
      expect(wrapper.emitted('commit').at(-1)[0][0]).toEqual({ ...child, text: 'Child (keep note)' });
    } finally { wrapper.unmount(); }
  });
  it('offers only exact-day completion choices with calendar-correct Yesterday', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    const wrapper = mount(SubtaskDatePicker, { props: { completion: true } });
    try {
      expect(wrapper.findAll('button').map(button => button.text())).toEqual(['Today', 'Yesterday', 'Clear', '×']);
      expect(wrapper.find('input[type="date"]').exists()).toBe(true);
      await wrapper.findAll('button')[1].trigger('click');
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['2025-12-31']);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
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
  it('autosaves sorted child rows and preserves raw content slots', async () => {
    const data = parseTodoMdFile(source);
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('.subtask-indicator').trigger('click');
    await wrapper.findAll('.subtask-drag-handle')[1].trigger('dragstart');
    await wrapper.findAll('.subtask-edit-row')[0].trigger('drop', { clientY: -1 });
    expect(wrapper.findAll('[aria-label="Subtask title"]')[0].element.value).toBe('Plain child');
    expect(task.children[0].text).toBe('Plain child');
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
