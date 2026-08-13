import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileTabBar from '../../../src/components/FileTabBar.vue';

describe('FileTabBar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('offers filesystem and browser-ready paths from the tab context menu', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    const selectedFile = {
      name: 'My list.todo.md',
      path: '/Users/patrick/My lists/My list.todo.md',
      isBuiltIn: false,
      source: 'file'
    };
    const wrapper = mount(FileTabBar, {
      props: { availableFiles: [selectedFile], selectedFile }
    });
    vi.spyOn(wrapper.get('.file-selector-trigger').element, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 42,
      left: 20,
      right: 160,
      width: 140,
      height: 32,
      x: 20,
      y: 10,
      toJSON: () => ({})
    });

    await wrapper.get('.file-selector-trigger').trigger('contextmenu');
    let menuItems = document.body.querySelectorAll('.file-tab-context-menu button');
    let pathValues = document.body.querySelectorAll('.file-tab-context-menu code');

    expect([...pathValues].map(item => item.textContent)).toEqual([
      '/Users/patrick/My lists/My list.todo.md',
      'file:///Users/patrick/My%20lists/My%20list.todo.md'
    ]);
    expect([...menuItems].map(item => item.getAttribute('aria-label'))).toEqual([
      'Copy absolute file path',
      'Copy file URL for browser'
    ]);
    const contextMenu = document.body.querySelector('.file-tab-context-menu');
    expect(contextMenu.style.top).toBe('46px');
    expect(Number.parseFloat(contextMenu.style.width)).toBeLessThan(500);
    menuItems[0].click();
    await wrapper.vm.$nextTick();
    expect(writeText).toHaveBeenLastCalledWith('/Users/patrick/My lists/My list.todo.md');

    await wrapper.get('.file-selector-trigger').trigger('contextmenu');
    menuItems = document.body.querySelectorAll('.file-tab-context-menu button');
    menuItems[1].click();
    await wrapper.vm.$nextTick();

    expect(writeText).toHaveBeenLastCalledWith('file:///Users/patrick/My%20lists/My%20list.todo.md');
    await vi.waitFor(() => {
      expect(document.body.querySelector('.file-tab-context-menu')).toBeNull();
    });
    wrapper.unmount();
  });

  it('selects files from a custom popover rather than a native select', async () => {
    const files = [
      { name: 'First.todo.md', path: '/tmp/First.todo.md', isBuiltIn: true,
        taskCounts: { total: 13, open: 7, active: 2, done: 3, skipped: 1 } },
      { name: 'Second.todo.md', path: '/tmp/Second.todo.md', isBuiltIn: false,
        taskCounts: { total: 1, open: 1, active: 0, done: 0, skipped: 0 } }
    ];
    const wrapper = mount(FileTabBar, {
      props: { availableFiles: files, selectedFile: files[0] }
    });

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.find('.file-selector-popover').exists()).toBe(false);
    await wrapper.get('.file-selector-trigger').trigger('click');
    expect(wrapper.findAll('.file-selector-option')).toHaveLength(2);
    expect(wrapper.findAll('.file-option-name').map(node => node.text())).toEqual(['First', 'tmp/Second']);
    expect(wrapper.findAll('.file-count-total')).toHaveLength(0);
    const popover = wrapper.get('.file-selector-popover');
    expect(popover.findAll('.file-status-icon.unchecked')).toHaveLength(2);
    expect(popover.findAll('.file-status-icon.in-progress')).toHaveLength(1);
    expect(popover.findAll('.file-status-icon.checked')).toHaveLength(1);
    expect(popover.findAll('.file-status-icon.cancelled')).toHaveLength(1);
    expect(wrapper.get('.selected-file-status-summary').text()).toContain('7');
    expect(wrapper.findAll('.selected-file-status-summary .file-status-icon')).toHaveLength(4);
    await wrapper.findAll('.file-selector-option')[1].trigger('click');

    expect(wrapper.emitted('file-selected')?.[0]).toEqual([files[1]]);
    expect(wrapper.find('.file-selector-popover').exists()).toBe(false);
    wrapper.unmount();
  });
});
