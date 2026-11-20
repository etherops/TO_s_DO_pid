import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlanningWorkspace from '../../../src/components/PlanningWorkspace.vue';
import PlanningTaskRow from '../../../src/components/PlanningTaskRow.vue';
import SubtaskDatePicker from '../../../src/components/SubtaskDatePicker.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Plan inline subtask controls', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());
  const setup = async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Parent (parent note)\n'
      + '  - [ ] Child (keep note) ! Nov 18 2026\n  - [x] Finished | Nov 17 2026\n');
    wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    await wrapper.get('.projects-stack .task-title').trigger('click');
    return data;
  };
  it('edits and cancels in the row without a parent modal or lost metadata', async () => {
    const data = await setup();
    await wrapper.get('.planning-project-children .planning-child-title').trigger('click');
    expect(wrapper.find('.planning-parent-dialog').exists()).toBe(false);
    await wrapper.get('.planning-child-editor input').setValue('Renamed');
    await wrapper.get('.planning-child-editor').trigger('submit');
    expect(renderTodoMdFile(data)).toContain('  - [ ] Renamed (keep note) ! Nov 18 2026');
    expect(wrapper.emitted('update')).toHaveLength(1);
    await wrapper.get('.planning-project-children .planning-child-title').trigger('click');
    await wrapper.get('.planning-child-editor input').setValue('Discard');
    await wrapper.get('.planning-child-editor').trigger('keydown', { key: 'Escape' });
    expect(renderTodoMdFile(data)).not.toContain('Discard');
  });
  it('edits due and completion dates inline and keeps children attached', async () => {
    const data = await setup();
    const rows = wrapper.findAll('.planning-project-children .planning-task-row');
    await rows[0].get('.planning-child-date').trigger('click');
    let picker = rows[0].findComponent(SubtaskDatePicker);
    expect(picker.props('modelValue')).toBe('2026-11-18');
    await picker.vm.$emit('update:modelValue', '2026-11-20');
    expect(renderTodoMdFile(data)).toContain('  - [ ] Child (keep note) ! Nov 20 2026');
    await rows[1].get('.planning-child-date').trigger('click');
    picker = rows[1].findComponent(SubtaskDatePicker);
    expect(picker.props('completion')).toBe(true);
    expect(picker.props('modelValue')).toBe('2026-11-17');
    await picker.vm.$emit('update:modelValue', '2026-11-18');
    expect(renderTodoMdFile(data)).toContain('  - [x] Finished | Nov 18 2026');
    expect(data.columnStacks.SELECTED.sections[0].items[0].children).toHaveLength(2);
  });
  it('exposes actions through a visible button, including edit and date', async () => {
    const actions = vi.fn();
    wrapper = mount(PlanningTaskRow, { props: { entry: { task: { id: 'child', text: 'Child', statusChar: ' ' },
      title: 'Child', parent: { text: 'Parent' } }, nested: true },
      global: { provide: { openSubtaskActions: actions } } });
    await wrapper.get('.planning-child-actions').trigger('click');
    expect(actions).toHaveBeenCalledOnce();
    const callbacks = actions.mock.calls[0][2];
    await callbacks.edit();
    expect(wrapper.get('.planning-child-editor input').element.value).toBe('Child');
    callbacks.date();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(SubtaskDatePicker).exists()).toBe(true);
  });
});
