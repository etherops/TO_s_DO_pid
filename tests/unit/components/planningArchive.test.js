import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlanningArchiveWeeks from '../../../src/components/PlanningArchiveWeeks.vue';
import KanbanBoard from '../../../src/components/KanbanBoard.vue';
import KanbanColumn from '../../../src/components/KanbanColumn.vue';
import { archiveTaskGroups, groupTasksForArchive, wipArchiveSections } from '../../../src/utils/archiveHelpers';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

const source = '# SELECTED\n### Ready\n* [x] Selected done | Oct 14 2026\n'
  + '# WIP\n### Work\n+ [x] Finished parent (note) ! Dec 2026 | Oct 14 2026\n'
  + '  - [ ] Retain child ! Nov 2 2026\n  * [~] Unsupported child\n'
  + '* [~] Still active\n* [!] Blocked\n* [x] Second week | Oct 21 2026\n'
  + '### Another section\n* [-] Cancelled | Oct 15 2026\n* [x] Third week | Oct 28 2026\n'
  + '* [x] No completion date\n# ARCHIVE\n### Oct Week #3 2026\n* [x] Already archived | Oct 12 2026\n';
beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Plan inline archive weeks', () => {
  it('places archive weeks inside WIP above source sections, once across multiple WIP headings', () => {
    const data = parseTodoMdFile(source + '# DOING\n### Extra\n* [~] Another active task\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(KanbanBoard, {
      props: { todoData: data }, global: { stubs: { TaskCard: true } }
    });
    const content = wrapper.get('[data-planning-column="WIP"] .column-content');
    const children = [...content.element.children];
    const archiveWeeks = children.filter(child => child.matches('.planning-archive-week'));
    expect(archiveWeeks.length).toBeGreaterThan(0);
    expect(children.indexOf(archiveWeeks.at(-1))).toBeLessThan(
      children.findIndex(child => child.matches('.section-list'))
    );
    expect(wrapper.findAll('.planning-archive')).toHaveLength(1);
    expect(wrapper.get('[data-planning-column="DOING"]').find('.planning-archive').exists()).toBe(false);
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('expands archived sections whose controls were removed by full collapse', async () => {
    const data = parseTodoMdFile(source);
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    });
    localStorage.setItem('section-collapse-Oct Week #3 2026', 'full');
    const wrapper = mount(KanbanColumn, { props: {
      columnType: 'DONE', title: 'ARCHIVE', sections: data.columnStacks.ARCHIVE.sections,
      columnData: data.columnStacks.ARCHIVE
    }, global: { stubs: { TaskCard: true } } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.fully-collapsed').exists()).toBe(true);
    await wrapper.get('.expand-all-btn').trigger('click');
    expect(storage.get('section-collapse-Oct Week #3 2026')).toBe('normal');
    expect(wrapper.find('.fully-collapsed').exists()).toBe(false);
    expect(wrapper.find('.collapse-controls').exists()).toBe(true);
    await wrapper.get('.hide-all-btn').trigger('click');
    expect(wrapper.find('.fully-collapsed').exists()).toBe(true);
    await wrapper.get('.expand-all-btn').trigger('click');
    expect(wrapper.find('.fully-collapsed').exists()).toBe(false);
    wrapper.unmount();
    localStorage.removeItem('section-collapse-Oct Week #3 2026');
  });

  it('previews all WIP sections without changing source and labels undated work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1));
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningArchiveWeeks, { props: { todoData: data } });
    expect(wrapper.findAll('.planning-archive-week')).toHaveLength(4);
    const first = wrapper.findAll('.planning-archive-week')[0];
    expect(first.text()).toContain('Oct Week #3 2026');
    expect(first.get('.archive-week-count').text()).toBe('2');
    await first.get('.archive-week-toggle').trigger('click');
    expect(first.get('ul').text()).toContain('Finished parent');
    expect(first.get('ul').text()).toContain('Cancelled');
    expect(wrapper.text()).not.toContain('Selected done');
    expect(wrapper.text()).toContain('1 without a completion date');
    await first.get('.archive-week-action').trigger('click');
    expect(wrapper.emitted('archive-week')[0]).toEqual(['Oct Week #3 2026']);
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('archives exactly one week across source sections and preserves children and all other work', () => {
    const data = parseTodoMdFile(source);
    const sections = wipArchiveSections(data);
    const parent = sections.flatMap(section => section.items).find(task => task.text.includes('Finished parent'));
    expect(archiveTaskGroups(data, sections, 'ARCHIVE', ['Oct Week #3 2026'], new Date(2026, 10, 1))).toBe(true);
    const archived = data.columnStacks.ARCHIVE.sections.find(section => section.name === 'Oct Week #3 2026');
    expect(archived.items).toHaveLength(3);
    expect(archived.items).toContain(parent);
    expect(parent.children).toHaveLength(2);
    const remaining = sections.flatMap(section => section.items).map(task => task.text).join('\n');
    for (const title of ['Still active', 'Blocked', 'Second week', 'Third week', 'No completion date']) {
      expect(remaining).toContain(title);
    }
    const output = renderTodoMdFile(data);
    expect(output).toContain('  * [~] Unsupported child');
    expect(output).toContain('Selected done');
    expect(output.match(/### Oct Week #3 2026/g)).toHaveLength(1);
    expect(archiveTaskGroups(data, sections, 'ARCHIVE', ['Oct Week #3 2026'])).toBe(false);
  });

  it('creates an archive only on action and revalidates a task that was reopened', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n* [x] Done | Oct 14 2026\n');
    const sections = wipArchiveSections(data);
    const task = sections.flatMap(section => section.items)[0];
    const week = groupTasksForArchive([task])[0].name;
    task.statusChar = '~';
    expect(archiveTaskGroups(data, sections, 'ARCHIVE', [week])).toBe(false);
    expect(data.columnStacks.ARCHIVE).toBeUndefined();
    task.statusChar = 'x';
    expect(archiveTaskGroups(data, sections, 'ARCHIVE', [week])).toBe(true);
    expect(data.columnOrder).toContain('ARCHIVE');
  });

  it('requires confirmation for every week and ignores repeated confirmations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1));
    const data = parseTodoMdFile(source);
    const wrapper = mount(KanbanBoard, {
      props: { todoData: data }, global: { stubs: { TaskCard: true } }
    });
    const preview = wrapper.findComponent(PlanningArchiveWeeks);
    preview.vm.$emit('archive-week', 'Oct Week #3 2026');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update')).toBeUndefined();
    const closedModal = wrapper.findComponent({ name: 'ArchiveConfirmationModal' });
    expect(closedModal.props('initialWeeks')).toEqual(['Oct Week #3 2026']);
    closedModal.vm.$emit('confirm', 'ARCHIVE', ['Oct Week #3 2026']);
    closedModal.vm.$emit('confirm', 'ARCHIVE', ['Oct Week #3 2026']);
    expect(wrapper.emitted('update')).toHaveLength(1);
    await wrapper.vm.$nextTick();
    preview.vm.$emit('archive-week', 'Nov Week #1 2026');
    await wrapper.vm.$nextTick();
    const modal = wrapper.findComponent({ name: 'ArchiveConfirmationModal' });
    expect(modal.props('initialWeeks')).toEqual(['Nov Week #1 2026']);
    modal.vm.$emit('close');
    data.columnStacks.DONE = { name: 'DONE', sections: [] };
    data.columnOrder.push('DONE');
    preview.vm.$emit('archive-week', 'Oct Week #4 2026');
    await wrapper.vm.$nextTick();
    const chooser = wrapper.findComponent({ name: 'ArchiveConfirmationModal' });
    expect(chooser.props('availableColumns')).toEqual(['ARCHIVE', 'DONE']);
    chooser.vm.$emit('confirm', 'DONE', ['Oct Week #4 2026']);
    expect(data.columnStacks.DONE.sections[0].items[0].text).toContain('Second week');
    wrapper.unmount();
  });

  it('reuses case/spacing variants and dated yearless weeks without merging different years', () => {
    for (const heading of ['  oct   week #3 2026  ', 'Oct Week #3']) {
      const data = parseTodoMdFile(source);
      data.columnStacks.ARCHIVE.sections.find(section => section.name === 'Oct Week #3 2026').name = heading;
      const count = data.columnStacks.ARCHIVE.sections.length;
      archiveTaskGroups(data, wipArchiveSections(data), 'ARCHIVE', ['Oct Week #3 2026']);
      expect(data.columnStacks.ARCHIVE.sections).toHaveLength(count);
      expect(data.columnStacks.ARCHIVE.sections.find(section => section.name === heading).items).toHaveLength(3);
    }
    const data = parseTodoMdFile(source.replace('### Oct Week #3 2026', '### Oct Week #3')
      .replace('Already archived | Oct 12 2026', 'Already archived | Oct 12 2025'));
    archiveTaskGroups(data, wipArchiveSections(data), 'ARCHIVE', ['Oct Week #3 2026']);
    expect(data.columnStacks.ARCHIVE.sections.some(section => section.name === 'Oct Week #3 2026')).toBe(true);
    expect(data.columnStacks.ARCHIVE.sections.find(section => section.name === 'Oct Week #3').items).toHaveLength(1);
  });
});
