import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mobileStyles = readFileSync('../src/editor/mobile.css', 'utf8');
const editorStyles = readFileSync('../src/editor/editor.css', 'utf8');
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

it('places the compact New note control in the sidebar heading row', () => {
  expect(editorMarkup).not.toContain('<h2>Notes</h2>');
  expect(editorMarkup).toMatch(/<div class="sidebar-heading">[\s\S]*id="new-snippet-btn"/);
  expect(editorStyles).toContain('.sidebar-heading');
  expect(editorStyles).toContain('border: 1px solid var(--accent);');
  expect(editorStyles).toContain('.btn-new span');
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

it('places the GitHub link at the end of the desktop top bar', () => {
  const githubIndex = editorMarkup.indexOf('id="github-link"');
  const themeIndex = editorMarkup.indexOf('id="theme-toggle"');
  expect(githubIndex).toBeGreaterThan(themeIndex);
  expect(editorMarkup).toContain('href="https://github.com/arverma/ConTextEditor"');
});

it('uses the same bold filename weight across responsive layouts', () => {
  expect(editorStyles).toMatch(/#note-title\s*\{[\s\S]*?font-weight: 600;/);
});

it('keeps mobile appearance controls compact without shrinking their touch targets', () => {
  expect(mobileStyles).toContain('.mobile-theme-slot .theme-opt { position: relative;');
  expect(mobileStyles).toContain('min-height: 44px;');
  expect(mobileStyles).toContain('inset: 4px 2px;');
  expect(mobileStyles).toContain('.mobile-theme-slot .theme-opt.active::before');
});

it('uses accessible vector icons for preview formatting actions', () => {
  for (const command of ['link', 'bullet', 'ordered', 'quote', 'code']) {
    expect(editorMarkup).toMatch(new RegExp(`data-command="${command}"[\\s\\S]*?<svg`));
  }
  expect(editorMarkup).not.toMatch(/data-command="bullet"[^>]*>•</);
  expect(editorMarkup).not.toMatch(/data-command="quote"[^>]*>“</);
  expect(editorMarkup).not.toContain('data-command="code" aria-label="Inline code" title="Inline code">&lt;/&gt;');
});

it('provides a mobile-only focus mode action in the preview toolbar', () => {
  expect(editorMarkup).toContain('id="mobile-focus-mode-btn"');
  expect(editorMarkup).toContain('aria-label="Focus mode"');
  expect(editorMarkup).toContain('aria-pressed="false"');
  expect(editorStyles).toContain('.mobile-focus-group { display: none; }');
  expect(mobileStyles).toContain('.preview-tools .mobile-focus-group { display: flex; }');
});

it('centers formatting controls and uses theme surfaces for their states', () => {
  expect(editorStyles).toContain('display: inline-flex; align-items: center; justify-content: center;');
  expect(editorStyles).toContain('appearance: none; -webkit-appearance: none;');
  expect(editorStyles).toContain('background: var(--surface-hover); color: var(--text);');
  expect(editorStyles).toContain('.preview-tools button[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }');
});

it('uses Markdown and Rich as the view labels', () => {
  expect(editorMarkup).toContain('<span>Markdown</span>');
  expect(editorMarkup).toContain('<span>Rich</span>');
  expect(editorMarkup).toContain('aria-label="Rich formatting"');
  expect(editorMarkup).not.toMatch(/data-view-value="edit"><span>Edit<\/span>/);
  expect(editorMarkup).not.toMatch(/data-view-value="preview"><span>Preview<\/span>/);
});

it('removes mobile safe-area top padding in focus mode', () => {
  expect(mobileStyles).toContain('#app[data-focus-mode="true"] { padding-top: 0 !important;');
});
