import { mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KanbanColumn from '../../../src/components/KanbanColumn.vue';
import KanbanSection from '../../../src/components/KanbanSection.vue';
import TaskCard from '../../../src/components/TaskCard.vue';
import draggable from 'vuedraggable';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Selected individual-task presentation', () => {
  let wrapper;
  beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() }));
  afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });

  const setup = (hideProjects = true) => {
    const data = reactive(parseTodoMdFile('# SELECTED\n+ [x] Project\n  - [ ] Project child\n'
      + '* [x] Finished task\n* [~] Regular parent\n  - [ ] Regular child\n- [ ] Low task\n'));
    const sections = data.columnStacks.SELECTED.sections;
    wrapper = mount(KanbanColumn, { props: {
      columnType: 'SELECTED', title: 'SELECTED', sections, hideProjects
    }, global: { stubs: { TaskCard: { props: ['task'], template: '<div>{{ task.text }}</div>' } } } });
    return { data, sections, section: wrapper.getComponent(KanbanSection) };
  };

  it('shows and counts regular/low tasks, including regular parents, without changing paper ownership', () => {
    const { data, sections } = setup();
    const before = renderTodoMdFile(data);
    expect(wrapper.text()).not.toContain('Project');
    expect(wrapper.text()).toContain('Regular parent');
    expect(wrapper.text()).toContain('Low task');
    expect(wrapper.get('.total-count').text()).toBe('3');
    expect(wrapper.get('.completed-count').text()).toBe('1');
    expect(wrapper.findAllComponents(TaskCard)).toHaveLength(3);
    expect(sections[0].items).toHaveLength(4);
    expect(sections[0].items[0].children).toHaveLength(1);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('excludes projects from collapsed summaries and keeps drag bindings on the full source list', async () => {
    const { sections, section } = setup();
    const items = sections[0].items;
    const taskDrag = section.getComponent(draggable);
    expect(taskDrag.props('modelValue')).toBe(items);
    const wrappers = section.findAll('.task-card-wrapper');
    expect(wrappers).toHaveLength(4);
    expect(wrappers[0].element.style.display).toBe('none');
    const event = new CustomEvent('set-collapse-state', { detail: { state: 'summary' } });
    section.element.dispatchEvent(event);
    await nextTick();
    expect(section.vm.fullCollapseSummary.total).toBe(3);
    expect(section.vm.collapsedSummary.completed).toBe(1);
    taskDrag.vm.$emit('update:modelValue', [items[0], items[3], items[1], items[2]]);
    await nextTick();
    expect(sections[0].items.map(item => item.text)).toEqual([
      'Project', 'Low task', 'Finished task', 'Regular parent'
    ]);
    expect(sections[0].items[0].children).toHaveLength(1);
  });

  it('updates presentation when a task changes type without removing its children', async () => {
    const { sections } = setup();
    const parent = sections[0].items[2];
    parent.listMarker = '+';
    await nextTick();
    expect(wrapper.text()).not.toContain('Regular parent');
    expect(wrapper.get('.total-count').text()).toBe('2');
    parent.listMarker = '*';
    await nextTick();
    expect(wrapper.text()).toContain('Regular parent');
    expect(wrapper.get('.total-count').text()).toBe('3');
    expect(parent.children).toHaveLength(1);
  });

  it('leaves unfiltered source columns unchanged', () => {
    setup(false);
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.get('.total-count').text()).toBe('4');
  });
});
