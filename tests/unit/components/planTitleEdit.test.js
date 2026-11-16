import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import TaskCard from '../../../src/components/TaskCard.vue';

let wrapper;
const mountCard = ({ planning = true, frozen = false } = {}) => {
  const task = { id: 'title-edit', type: 'task', text: 'Original (keep note) ! Nov 2026',
    statusChar: ' ', listMarker: '*' };
  wrapper = mount(TaskCard, { props: { task, section: { items: [task] }, column: 'TODO', isOnIce: frozen },
    global: { provide: { planningWorkspace: planning } } });
  return task;
};
afterEach(() => wrapper?.unmount());

describe('Direct Plan title editing', () => {
  it('opens on a single click and preserves metadata when saving the title', async () => {
    const task = mountCard();
    await wrapper.get('.task-title').trigger('click');
    expect(wrapper.get('.task-text-edit').element.value).toBe('Original');
    expect(wrapper.emitted('task-click')).toBeUndefined();
    await wrapper.get('.task-text-edit').setValue('Renamed');
    await wrapper.get('.edit-actions-row .confirm-edit-btn').trigger('click');
    expect(task.text).toBe('Renamed (keep note) ! Nov 2026');
    expect(task.statusChar).toBe(' ');
  });
  it.each(['Enter', ' '])('supports keyboard activation with %s', async key => {
    mountCard();
    expect(wrapper.get('.task-title').attributes('tabindex')).toBe('0');
    await wrapper.get('.task-title').trigger('keydown', { key });
    expect(wrapper.find('.task-text-edit').exists()).toBe(true);
  });
  it.each(['metaKey', 'ctrlKey', 'shiftKey'])('retains selection with %s', async modifier => {
    mountCard();
    await wrapper.get('.task-title').trigger('click', { [modifier]: true });
    expect(wrapper.find('.task-text-edit').exists()).toBe(false);
    expect(wrapper.emitted('task-click')).toHaveLength(1);
  });
  it.each([{ planning: false }, { frozen: true }])('does not change legacy or frozen behavior: %o', async options => {
    mountCard(options);
    await wrapper.get('.task-title').trigger('click');
    expect(wrapper.find('.task-text-edit').exists()).toBe(false);
    expect(wrapper.get('.task-title').attributes('tabindex')).toBeUndefined();
  });
});
