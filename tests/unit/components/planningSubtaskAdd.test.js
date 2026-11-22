import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { describe, expect, it } from 'vitest';
import PlanningSubtaskAdd from '../../../src/components/PlanningSubtaskAdd.vue';
import PlanningWorkspace from '../../../src/components/PlanningWorkspace.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Plan expanded subtask addition', () => {
  it('saves on Enter and blur exactly once, clears the row, and preserves all existing metadata', async () => {
    const data = parseTodoMdFile('# SELECTED\n### Original\n+ [~] Parent (Note) ! Dec 2026\n'
      + '  - [x] Old (Hidden) | Nov 1 2026\n  * Keep raw\n');
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    await wrapper.get('.projects-stack .task-title').trigger('click');
    const input = wrapper.get('[aria-label="Add subtask to Parent"]');
    await input.setValue('First new child');
    await input.trigger('keydown', { key: 'Enter' });
    await input.trigger('blur');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(input.element.value).toBe('');
    await input.setValue('Second child');
    await input.trigger('blur');
    expect(wrapper.emitted('update')).toHaveLength(2);
    expect(renderTodoMdFile(data)).toContain('# SELECTED\n### Original\n+ [~] Parent (Note) ! Dec 2026\n'
      + '  - [x] Old (Hidden) | Nov 1 2026\n  * Keep raw\n  - [ ] First new child\n  - [ ] Second child');
    expect(wrapper.findAll('.planning-project-children .planning-child-title').map(title => title.text()))
      .toEqual(['Old', 'First new child', 'Second child']);
    await input.setValue('Cancelled');
    await input.trigger('keydown', { key: 'Escape' });
    await input.trigger('blur');
    expect(wrapper.emitted('update')).toHaveLength(2);
    await input.setValue('   ');
    await input.trigger('blur');
    expect(wrapper.emitted('update')).toHaveLength(2);
    wrapper.unmount();
  });

  it('keeps an externally added child when an already-open parent editor saves', async () => {
    const data = reactive(parseTodoMdFile('# SELECTED\n### Original\n+ [~] Parent\n  - [ ] Existing\n'));
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    await wrapper.get('.projects-stack .task-title').trigger('click');
    await wrapper.get('.projects-stack .subtask-indicator').trigger('click');
    await wrapper.get('.projects-stack .task-text-edit').setValue('Renamed parent');
    const input = wrapper.get('[aria-label="Add subtask to Parent"]');
    await input.setValue('New child');
    await input.trigger('keydown', { key: 'Enter' });
    await wrapper.get('.projects-stack .confirm-edit-btn').trigger('click');
    expect(renderTodoMdFile(data)).toContain('+ [~] Renamed parent\n  - [ ] Existing\n  - [ ] New child');
    wrapper.unmount();
  });

  it.each([{ frozen: true, marker: '+' }, { frozen: false, marker: '-' }])(
    'does not offer additions to a protected parent: %j', ({ frozen, marker }) => {
      const wrapper = mount(PlanningSubtaskAdd, { props: {
        entry: { frozen, title: 'Parent', task: { listMarker: marker } }
      } });
      expect(wrapper.find('input').exists()).toBe(false);
      wrapper.unmount();
    });
});
