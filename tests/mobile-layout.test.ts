import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mobileStyles = readFileSync('../src/editor/mobile.css', 'utf8');
const editorMarkup = readFileSync('../src/editor/index.html', 'utf8');

it('uses one compact mobile toggle instead of oversized view buttons', () => {
  expect(editorMarkup).toContain('id="mobile-view-toggle"');
  expect(mobileStyles).toContain('#view-toggle { display: none; }');
  expect(mobileStyles).toContain('.mobile-view-toggle { display: inline-flex;');
  expect(mobileStyles).toContain('width: 32px;');
  expect(mobileStyles).not.toContain('.view-opt.active::before');
});
