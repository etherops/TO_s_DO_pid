import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Focus note editing', () => {
  it.each([
    ['.panel-upnext', 'Nov Week #2 2026'],
    ['.panel-now', 'Nov 10 2026'],
    ['.panel-in-progress-queued', 'Nov 12 2026']
  ])('displays and edits subtask notes in %s while preserving nesting', async (panel, due) => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Parent\n'
      + `  - [~] Child (Original note) ! ${due}\n  - [ ] Sibling (keep me)\n`);
    const parent = data.columnStacks.SELECTED.sections[0].items[0];
    const child = parent.children[0];
    const sibling = { ...parent.children[1] };
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
      expect(wrapper.get(`${panel} .focus-row-note`).text()).toBe('Original note');
      await wrapper.get(`${panel} .focus-row-note`).trigger('click');
      expect(wrapper.get('.focus-edit-note').element.value).toBe('Original note');
      expect(wrapper.find('.add-subtasks-control').exists()).toBe(false);
      await wrapper.get('.focus-edit-name').setValue('Renamed (Typed note)');
      await wrapper.get('.focus-edit-save').trigger('click');
      expect(child.text).toBe(`Renamed (Typed note) ! ${due}`);
      expect(wrapper.get(`${panel} .focus-row-note`).text()).toBe('Typed note');
      await wrapper.get(`${panel} .focus-row-note`).trigger('click');
      await wrapper.get('.focus-edit-note').setValue('Changed note');
      await wrapper.get('.focus-edit-save').trigger('click');
      expect(child.text).toBe(`Renamed (Changed note) ! ${due}`);
      await wrapper.get(`${panel} .focus-row-note`).trigger('click');
      await wrapper.get('.focus-edit-note').setValue('Discard this');
      await wrapper.get('.focus-edit-cancel').trigger('click');
      expect(child.text).toBe(`Renamed (Changed note) ! ${due}`);
      const reparsed = parseTodoMdFile(renderTodoMdFile(data));
      expect(reparsed.columnStacks.SELECTED.sections[0].items[0].children[0].text).toBe(child.text);
      await wrapper.get(`${panel} .focus-row-note`).trigger('click');
      await wrapper.get('.focus-edit-note').setValue('');
      await wrapper.get('.focus-edit-save').trigger('click');
      expect(child.text).toBe(`Renamed ! ${due}`);
      expect(wrapper.find(`${panel} .focus-row-note`).exists()).toBe(false);
      expect(parent.children[0]).toBe(child);
      expect(parent.children[1]).toEqual(sibling);
      expect(child.statusChar).toBe('~');
    } finally { wrapper.unmount(); }
  });

  it.each(['', ' (Previous note)'])('preserves a note typed in the title, with existing note %s', async oldNote => {
    const data = parseTodoMdFile(`# WIP\n### Work\n* [~] Original${oldNote} ! Nov 10 2026\n`);
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    await wrapper.get('.focus-row-title').trigger('click');
    await wrapper.get('.focus-edit-name').setValue('test (some test note)');
    await wrapper.get('.focus-edit-save').trigger('click');
    expect(task.text).toBe('test (some test note) ! Nov 10 2026');
    expect(task.statusChar).toBe('~');
    expect(wrapper.get('.focus-row-title').text()).toBe('test');
    expect(wrapper.get('.focus-row-note').text()).toBe('some test note');
    await wrapper.get('.focus-row-title').trigger('click');
    expect(wrapper.get('.focus-edit-note').element.value).toBe('some test note');
    await wrapper.get('.focus-edit-save').trigger('click');
    expect(task.text).toBe('test (some test note) ! Nov 10 2026');
    wrapper.unmount();
  });

  it('shows notes inline after titles in every upper pane without changing task data', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n'
      + '* [ ] Weekly task (Weekly note) ! Nov Week #2 2026\n'
      + '* [ ] Today task (Today note) ! Nov 10 2026\n'
      + '- [ ] Later task (Later note) ! Nov 12 2026\n'
      + '* [ ] No note ! Nov 10 2026\n');
    const original = renderTodoMdFile(data);
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    for (const [panel, note] of [
      ['.panel-upnext', 'Weekly note'],
      ['.panel-now', 'Today note'],
      ['.panel-in-progress-queued', 'Later note']
    ]) {
      const inline = wrapper.get(`${panel} .focus-row-main > .focus-row-note`);
      expect(inline.text()).toBe(note);
      expect(inline.element.previousElementSibling.matches('.focus-row-title')).toBe(true);
      await inline.trigger('mouseenter');
      expect(document.querySelector('.focus-note-tooltip')?.textContent.trim()).toBe(note);
      await inline.trigger('mouseleave');
    }
    expect(wrapper.findAll('.focus-row-note')).toHaveLength(3);
    expect(wrapper.find('.focus-note-indicator').exists()).toBe(false);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(data)).toBe(original);
    wrapper.unmount();
  });

  it('adds, edits, cancels and removes notes without changing lifecycle metadata', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n- [~] Task ! Nov 10 2026\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    await wrapper.get('button.focus-row-title').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('Line one\nLine two');
    await wrapper.get('.focus-edit-note').trigger('keydown', { key: 'Enter', shiftKey: true });
    expect(wrapper.find('.focus-edit-note').exists()).toBe(true);
    await wrapper.get('.focus-edit-note').trigger('keydown', { key: 'Enter' });
    expect(wrapper.find('.focus-edit-note').exists()).toBe(false);
    expect(task.text).toBe('Task (Line one\\nLine two) ! Nov 10 2026');
    expect(task.statusChar).toBe('~');
    expect(task.listMarker).toBe('-');
    expect(wrapper.get('.focus-row-note').text()).toBe('Line one\nLine two');
    await wrapper.get('.focus-row-note').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('Discard me');
    await wrapper.get('.focus-edit-cancel').trigger('click');
    expect(task.text).toContain('Line one');
    await wrapper.get('.focus-row-note').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('');
    await wrapper.get('.focus-edit-save').trigger('click');
    expect(task.text).toBe('Task ! Nov 10 2026');
    expect(wrapper.find('.focus-row-note').exists()).toBe(false);
    await wrapper.get('[aria-label="Preview previous day"]').trigger('click');
    await wrapper.get('button.focus-row-title').trigger('click');
    expect(wrapper.find('.focus-edit-note').exists()).toBe(true);
    wrapper.unmount();
  });
});
