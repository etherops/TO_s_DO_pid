import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ArchiveConfirmationModal from '../../../src/components/ArchiveConfirmationModal.vue';
import { groupTasksForArchive } from '../../../src/utils/archiveHelpers';

const items = [
  { id: 1, type: 'task', statusChar: 'x', text: 'Old | Sep 24 2026' },
  { id: 2, type: 'task', statusChar: '-', text: 'Current | Oct 1 2026' },
  { id: 3, type: 'task', statusChar: 'x', text: 'Undated' },
  { id: 4, type: 'task', statusChar: 'x', text: 'Future | Oct 8 2026' },
  { id: 5, type: 'task', statusChar: '~', text: 'Still open' }
];

describe('Archive week selection', () => {
  it('explains existing destinations, warns about duplicate sections and blocks double submission', async () => {
    const wrapper = mount(ArchiveConfirmationModal, { props: {
      sectionName: 'WIP', sectionItems: items, fallbackDate: new Date(2026, 9, 2),
      archiveColumns: { ARCHIVE: { sections: [
        { type: 'section', name: 'Sep Week #4 2026', items: [items[0]] },
        { type: 'section', name: 'sep week #4 2026', items: [] }
      ] } }
    } });
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true');
    expect(wrapper.get('.archive-destination-summary').text()).toContain('No new week section');
    expect(wrapper.get('.archive-duplicate-warning').text()).toContain('2 matching sections already exist');
    await wrapper.get('.btn-confirm').trigger('click');
    await wrapper.get('.btn-confirm').trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    wrapper.unmount();
  });

  it('defaults to closed weeks and emits only the chosen weeks', async () => {
    const wrapper = mount(ArchiveConfirmationModal, { props: {
      sectionName: 'WIP', sectionItems: items, fallbackDate: new Date(2026, 9, 2)
    } });
    try {
      const choices = wrapper.findAll('input[type="checkbox"]');
      expect(choices.map(choice => choice.element.checked)).toEqual([true, false, false]);
      expect(wrapper.get('.archive-selection-count').text()).toBe('1 task selected');
      expect(wrapper.get('.task-list').text()).toContain('Old');
      await choices[0].setValue(false);
      expect(wrapper.get('.btn-confirm').element.disabled).toBe(true);
      await wrapper.get('.btn-confirm').trigger('click');
      expect(wrapper.emitted('confirm')).toBeUndefined();
      await choices[1].setValue(true);
      expect(wrapper.get('.archive-selection-count').text()).toBe('2 tasks selected');
      expect(wrapper.get('.task-list').text()).not.toContain('Old');
      await wrapper.get('.btn-confirm').trigger('click');
      expect(wrapper.emitted('confirm')[0]).toEqual(['ARCHIVE', ['Oct Week #1 2026']]);
    } finally { wrapper.unmount(); }
  });

  it('keeps Saturday open and closes that week on Sunday, across month boundaries', () => {
    const task = [{ type: 'task', statusChar: 'x', text: 'Done | Sep 26 2026' }];
    expect(groupTasksForArchive(task, new Date(2026, 8, 26, 23, 59))[0].closed).toBe(false);
    expect(groupTasksForArchive(task, new Date(2026, 8, 27))[0].closed).toBe(true);
  });
});
