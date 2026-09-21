import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Focus note editing', () => {
  it('adds, edits, cancels and removes notes without changing lifecycle metadata', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n- [~] Task ! Dec 2099\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('button.focus-row-title').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('Line one\nLine two');
    await wrapper.get('.focus-edit-note').trigger('keydown', { key: 'Enter', shiftKey: true });
    expect(wrapper.find('.focus-edit-note').exists()).toBe(true);
    await wrapper.get('.focus-edit-note').trigger('keydown', { key: 'Enter' });
    expect(wrapper.find('.focus-edit-note').exists()).toBe(false);
    expect(task.text).toBe('Task (Line one\\nLine two) ! Dec 2099');
    expect(task.statusChar).toBe('~');
    expect(task.listMarker).toBe('-');
    await wrapper.get('.focus-note-indicator').trigger('click');
    await wrapper.get('.focus-edit-note').setValue('Discard me');
    await wrapper.get('.focus-edit-cancel').trigger('click');
    expect(task.text).toContain('Line one');
    await wrapper.get('.focus-note-indicator').trigger('keydown', { key: 'Enter' });
    await wrapper.get('.focus-edit-note').setValue('');
    await wrapper.get('.focus-edit-save').trigger('click');
    expect(task.text).toBe('Task ! Dec 2099');
    await wrapper.get('[aria-label="Preview next day"]').trigger('click');
    await wrapper.get('button.focus-row-title').trigger('click');
    expect(wrapper.find('.focus-edit-note').exists()).toBe(false);
    wrapper.unmount();
  });
});
