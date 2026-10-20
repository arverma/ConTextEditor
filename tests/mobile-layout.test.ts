import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mobileStyles = readFileSync('../src/editor/mobile.css', 'utf8');

it('keeps the mobile view toggle paint inside its touch target', () => {
  expect(mobileStyles).toContain('#view-toggle {');
  expect(mobileStyles).toContain('box-sizing: border-box;');
  expect(mobileStyles).toContain('overflow: hidden;');
  expect(mobileStyles).toContain('inset-block: 8px;');
  expect(mobileStyles).toContain('inset-block: 10px;');
});
