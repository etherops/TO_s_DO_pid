import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import RawMode from '../../../src/components/RawMode.vue';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const original = '# WIP\n\n* [ ] Keep  spacing (note)\n  ??? unsupported\n';
let wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: { content: original } });
  axios.post.mockResolvedValue({ data: { success: true } });
});
afterEach(() => wrapper?.unmount());
const open = async () => {
  wrapper = mount(RawMode, { props: { filePath: '/fixture.todo.md', fileLabel: 'Fixture' } });
  await flushPromises();
};

describe('Raw source safety', () => {
  it('matches source and ToC colors without interpreting HTML or changing source bytes', async () => {
    const source = '# TODO\n### Inbox\n* [ ] <img src=x onerror=alert(1)>\n'
      + '# WIP\n### Active\n* [ ] Work\n';
    axios.get.mockResolvedValue({ data: { content: source } });
    await open();
    expect(wrapper.get('textarea').element.value).toBe(source);
    expect(wrapper.findAll('.raw-outline-link').map(item => item.classes().find(name => name.startsWith('raw-tone-'))))
      .toEqual(['raw-tone-TODO', 'raw-tone-TODO', 'raw-tone-WIP', 'raw-tone-WIP']);
    expect(wrapper.findAll('.raw-source-heading').map(item => item.classes().find(name => name.startsWith('raw-tone-'))))
      .toEqual(['raw-tone-TODO', 'raw-tone-TODO', 'raw-tone-WIP', 'raw-tone-WIP']);
    expect(wrapper.find('.raw-source-highlight img').exists()).toBe(false);
    expect(wrapper.get('.raw-source-highlight').text()).toContain('<img src=x onerror=alert(1)>');
    await wrapper.get('.raw-actions button').trigger('click');
    await wrapper.get('textarea').setValue(source.replace('# WIP', '# PROJECTS'));
    expect(wrapper.findAll('.raw-source-heading.raw-tone-SELECTED')).toHaveLength(2);
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('navigates the exact source and follows draft headings without saving', async () => {
    await open();
    expect(wrapper.get('.raw-outline').isVisible()).toBe(true);
    await wrapper.get('.raw-outline-link').trigger('click');
    const editor = wrapper.get('textarea').element;
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(5);
    expect(editor.readOnly).toBe(true);
    expect(editor.value).toBe(original);
    await wrapper.get('.raw-actions button').trigger('click');
    const edited = original + '### New section\n';
    await wrapper.get('textarea').setValue(edited);
    expect(wrapper.findAll('.raw-outline-link')).toHaveLength(2);
    await wrapper.findAll('.raw-outline-link')[1].trigger('click');
    expect(editor.selectionStart).toBe(original.length);
    expect(editor.value).toBe(edited);
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('shows exact source read-only, then saves an explicitly edited draft with its original precondition', async () => {
    await open();
    expect(wrapper.get('textarea').element.readOnly).toBe(true);
    expect(wrapper.get('textarea').element.value).toBe(original);
    expect(axios.post).not.toHaveBeenCalled();
    await wrapper.get('.raw-actions button').trigger('click');
    const edited = original.replace('Keep', 'Keep edited');
    await wrapper.get('textarea').setValue(edited);
    await wrapper.get('.raw-save').trigger('click');
    await flushPromises();
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/api/todos', {
      path: '/fixture.todo.md', content: edited, expectedContent: original
    });
    expect(wrapper.get('textarea').element.readOnly).toBe(true);
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });

  it('keeps the draft after a save conflict and protects navigation', async () => {
    await open();
    await wrapper.get('.raw-actions button').trigger('click');
    await wrapper.get('textarea').setValue(original + 'draft\n');
    axios.post.mockRejectedValue({ response: { status: 409 } });
    await wrapper.get('.raw-save').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('changed elsewhere');
    expect(wrapper.get('textarea').element.value).toContain('draft');
    const permission = wrapper.vm.confirmLeave();
    await flushPromises();
    await wrapper.get('.raw-modal button').trigger('click');
    expect(await permission).toBe(false);
    expect(wrapper.get('textarea').element.value).toContain('draft');
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('does not save blank text and resets editing when the file changes', async () => {
    await open();
    await wrapper.get('.raw-actions button').trigger('click');
    await wrapper.get('textarea').setValue('');
    expect(wrapper.get('.raw-save').element.disabled).toBe(true);
    await wrapper.get('textarea').trigger('keydown', { key: 's', ctrlKey: true });
    expect(axios.post).not.toHaveBeenCalled();
    await wrapper.setProps({ filePath: '/other.todo.md' });
    await flushPromises();
    expect(wrapper.get('textarea').element.readOnly).toBe(true);
  });
});
