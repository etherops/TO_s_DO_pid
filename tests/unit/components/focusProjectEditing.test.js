import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Focus project editing', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 10)); });
  afterEach(() => vi.useRealTimers());

  it('opens details from the child badge without writing on expansion or cancellation', async () => {
    const todoData = parseTodoMdFile('# SELECTED\n### Work\n+ [ ] Project ! Nov Week #2 2026\n'
      + '  - [ ] Child\n  * Keep raw\n');
    const original = renderTodoMdFile(todoData);
    const wrapper = mount(FocusMode, { props: { todoData, theme: 'light' } });
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    await wrapper.get('.panel-upnext .subtask-indicator').trigger('click');
    expect(wrapper.get('.focus-edit-name').element.value).toBe('Project');
    expect(wrapper.get('[aria-label="Subtask title"]').element.value).toBe('Child');
    await wrapper.get('.focus-edit-cancel').trigger('click');
    expect(wrapper.find('.subtask-editor').exists()).toBe(false);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(todoData)).toBe(original);
    wrapper.unmount();
  });

  it('keeps the three panels available when empty, without internal tabs', () => {
    const wrapper = mount(FocusMode, { props: { todoData: parseTodoMdFile('# WIP\n### Work\n') } });
    expect(wrapper.findAll('.focus-panel')).toHaveLength(3);
    expect(wrapper.find('.focus-queue-tabs').exists()).toBe(false);
    expect(wrapper.findAll('[data-schedule-date]')).toHaveLength(7);
    expect(wrapper.get('.panel-now').classes()).toContain('is-focused');
    expect(wrapper.emitted('update')).toBeUndefined();
    wrapper.unmount();
  });

  it('saves a project title and note without changing children or source metadata', async () => {
    const todoData = parseTodoMdFile('# SELECTED\n### Work\n+ [~] Project (Old note) ! Nov Week #2 2026\n'
      + '  - [x] Child (Hidden note) | Oct 1 2026\n  * Keep raw\n');
    const wrapper = mount(FocusMode, { props: { todoData, theme: 'light' } });
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    await wrapper.get('.panel-upnext .focus-row-title').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('New note');
    await wrapper.get('.focus-edit-name').setValue('Renamed project');
    await wrapper.get('.focus-edit-save').trigger('click');
    const saved = renderTodoMdFile(todoData);
    expect(saved).toContain('+ [~] Renamed project (New note) ! Nov Week #2 2026');
    expect(saved).toContain('  - [x] Child (Hidden note) | Oct 1 2026\n  * Keep raw');
    expect(wrapper.emitted('update')).toHaveLength(1);
    wrapper.unmount();
  });
});
