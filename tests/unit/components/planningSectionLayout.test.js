import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KanbanSection from '../../../src/components/KanbanSection.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Plan section partial collapse', () => {
  beforeEach(() => {
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps active cards in normal flow for a saved partial-collapse state without changing tasks', async () => {
    const data = parseTodoMdFile('# SELECTED\n### HOLD/WAIT\n'
      + '* [~] First active\n* [~] Second active\n* [ ] Waiting\n');
    const before = renderTodoMdFile(data);
    const column = data.columnStacks.SELECTED;
    localStorage.setItem('section-collapse-HOLD/WAIT', 'partial');
    const wrapper = mount(KanbanSection, {
      props: { section: column.sections[0], column: 'SELECTED', columnType: 'SELECTED', columnData: column },
      global: { provide: { planningWorkspace: true } }
    });
    try {
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll('.collapsed-in-progress')).toHaveLength(0);
      const cards = wrapper.findAll('.task-card-wrapper');
      expect(cards).toHaveLength(3);
      cards.forEach(card => expect(card.element.style.position).not.toBe('absolute'));
      expect(wrapper.get('.section-items').element.style.getPropertyValue('--collapsed-stack-height')).toBe('0');
      expect(renderTodoMdFile(data)).toBe(before);
      expect(wrapper.emitted('task-updated')).toBeUndefined();
    } finally { wrapper.unmount(); }
  });
});
