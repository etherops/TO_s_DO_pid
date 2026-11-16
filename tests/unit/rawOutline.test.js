import { describe, expect, it } from 'vitest';
import { rawOutline } from '../../src/utils/rawOutline';

describe('Raw Markdown outline', () => {
  it('uses the parser column categories and inherits them for subsection headings', () => {
    const source = '# TODO\n### Inbox\n# PROJECTS\n### Home\n# SELECTED\n### Ready\n'
      + '# SCHEDULED\n### This week\n# ARCHIVE\n### Last week\n';
    expect(rawOutline(source).map(heading => heading.tone)).toEqual([
      'TODO', 'TODO', 'SELECTED', 'SELECTED', 'SELECTED', 'SELECTED', 'WIP', 'WIP', 'DONE', 'DONE'
    ]);
  });
  it('retains exact CRLF offsets, duplicate headings, levels and Unicode', () => {
    const source = '# TODO\r\n### Café ##\r\n* [ ] work\r\n### Café\r\n';
    const headings = rawOutline(source);
    expect(headings.map(({ title, level, line }) => [title, level, line]))
      .toEqual([['TODO', 1, 0], ['Café', 3, 1], ['Café', 3, 3]]);
    expect(headings.map(item => source.slice(item.start, item.end)))
      .toEqual(['# TODO', '### Café ##', '### Café']);
  });
  it('ignores fenced examples, indented code and non-heading hashes', () => {
    expect(rawOutline('```md\n# hidden\n```\n~~~\n## hidden\n~~~\n    # code\n#tag\n# Real\n')
      .map(item => item.title)).toEqual(['Real']);
    expect(rawOutline('plain text')).toEqual([]);
  });
});
