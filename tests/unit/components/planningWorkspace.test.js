import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import PlanningWorkspace from '../../../src/components/PlanningWorkspace.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { derivePlanningSchedule } from '../../../src/utils/planningHelpers';

const source = '# TODO\n### Inbox\n* [ ] Inbox task ! Nov 2 2026\n'
  + '# SELECTED\n### Next\n* [ ] Selected task ! Nov Week #1 2026\n'
  + '# WIP\n### Work\n+ [~] Parent (preserve note) ! Nov 2026\n'
  + '  - [ ] Child ! Nov 1 2026\n  * [~] Unsupported child ! Nov 1 2026\n'
  + '* [x] Finished | Oct 31 2026\n'
  + '# ONGOING\n### Other selected\n* [ ] More selected\n'
  + '# ICE\n### Frozen\n* [ ] Frozen task ! Nov 1 2026\n'
  + '# ARCHIVE\n### Old\n* [ ] Archived task ! Nov 1 2026\n';

describe('Outline planning workspace', () => {
  it('offers a dedicated archive view and a non-mutating empty state', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    expect(wrapper.find('.planning-eyebrow').exists()).toBe(false);
    expect(wrapper.get('nav').attributes('aria-label')).toBe('File outline');
    await wrapper.get('.planning-archive-link').trigger('click');
    expect(wrapper.findAll('[data-planning-column]').map(el => el.attributes('data-planning-column')))
      .toEqual(['ARCHIVE']);
    expect(renderTodoMdFile(data)).toBe(before);
    await wrapper.setProps({ todoData: parseTodoMdFile('# WIP\n* [ ] Open\n') });
    await wrapper.get('.planning-archive-link').trigger('click');
    expect(wrapper.get('.planning-empty').text()).toContain('No archived tasks yet');
    wrapper.unmount();
  });
  it('shows every SELECTED and WIP heading in two source groups, without changing the file', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data, viewMode: 'plan' } });
    expect(wrapper.findAll('.planning-group')).toHaveLength(2);
    expect(wrapper.findAll('[data-planning-column]').map(el => el.attributes('data-planning-column')))
      .toEqual(['SELECTED', 'ONGOING', 'WIP']);
    Element.prototype.scrollIntoView = vi.fn();
    await wrapper.findAll('.planning-heading-link').find(button => button.text().includes('TODO')).trigger('click');
    expect(wrapper.findAll('[data-planning-column]').map(el => el.attributes('data-planning-column')))
      .toEqual(['TODO']);
    await wrapper.findAll('.planning-overview')[0].trigger('click');
    expect(wrapper.findAll('.planning-group')).toHaveLength(2);
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('derives all live scheduled work including explicit child dates without mutation or inheritance', () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const groups = derivePlanningSchedule(data, new Date(2026, 10, 1));
    expect(groups.map(group => group.label)).toEqual(['Today', 'This week', 'This month']);
    expect(groups.flatMap(group => group.entries.map(entry => entry.title)))
      .toEqual(['Child', 'Inbox task', 'Selected task', 'Parent']);
    expect(groups[0].entries[0].parent.text).toContain('Parent');
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('does not create missing SELECTED/WIP columns or save navigation', async () => {
    const data = parseTodoMdFile('# TODO\n* [ ] Only backlog\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data, viewMode: 'plan' } });
    expect(wrapper.findAll('[data-planning-column]')).toHaveLength(1);
    await wrapper.findAll('.planning-overview')[0].trigger('click');
    expect(wrapper.get('.planning-columns').text()).toContain('No SELECTED or WIP');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
    wrapper.unmount();
  });
});
