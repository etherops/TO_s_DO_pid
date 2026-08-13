import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileTabBar from '../../../src/components/FileTabBar.vue';

describe('FileTabBar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a file URL for the tab source on right click', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(FileTabBar, {
      props: {
        availableFiles: [{
          name: 'My list.todo.md',
          path: '/Users/patrick/My lists/My list.todo.md',
          isBuiltIn: false,
          source: 'file'
        }]
      }
    });

    await wrapper.get('.file-tab').trigger('contextmenu');

    expect(open).toHaveBeenCalledWith(
      'file:///Users/patrick/My%20lists/My%20list.todo.md',
      '_blank',
      'noopener'
    );
  });
});
