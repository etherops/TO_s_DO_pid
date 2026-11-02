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
