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

it('aligns the mobile sidebar icon and note title to the brand column', () => {
  expect(mobileStyles).toContain('grid-template-columns: 28px minmax(0, 1fr) auto;');
  expect(mobileStyles).toContain('padding: 0 12px;');
  expect(mobileStyles).toContain('transform: translateX(-8px);');
});

it('keeps note actions on the filename row', () => {
  expect(mobileStyles).toContain('grid-template-rows: 44px;');
  expect(mobileStyles).toContain('.titlebar-right { display: flex;');
  expect(mobileStyles).toContain('.toolbar-actions { display: flex;');
  expect(mobileStyles).toContain('.toolbar-actions #export-label { display: none; }');
});

it('places the live counter in the top bar before the saved status', () => {
  const countsIndex = editorMarkup.indexOf('id="note-counts"');
  const savedIndex = editorMarkup.indexOf('id="save-status"');
  expect(countsIndex).toBeGreaterThan(-1);
  expect(countsIndex).toBeLessThan(savedIndex);
  expect(editorMarkup.match(/id="note-counts"/g)).toHaveLength(1);
});

it('keeps mobile appearance controls compact without shrinking their touch targets', () => {
  expect(mobileStyles).toContain('.mobile-theme-slot .theme-opt { position: relative;');
  expect(mobileStyles).toContain('min-height: 44px;');
  expect(mobileStyles).toContain('inset: 4px 2px;');
  expect(mobileStyles).toContain('.mobile-theme-slot .theme-opt.active::before');
});
