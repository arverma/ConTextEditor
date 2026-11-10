import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mobileStyles = readFileSync('../src/editor/mobile.css', 'utf8');
const editorStyles = readFileSync('../src/editor/editor.css', 'utf8');
const ownershipStyles = readFileSync('../src/editor/ownership.css', 'utf8');
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
  expect(mobileStyles).not.toContain('max-width: 1000px');
});

it('places the compact New note control in the sidebar heading row', () => {
  expect(editorMarkup).not.toContain('<h2>Notes</h2>');
  expect(editorMarkup).toMatch(/<div class="sidebar-heading">[\s\S]*id="new-snippet-btn"/);
  expect(editorStyles).toContain('.sidebar-heading');
  expect(editorStyles).toContain('border: 1px solid var(--accent);');
  expect(editorStyles).toContain('.btn-new span');
});

it('makes New note fill the sidebar heading without exceeding the toggle height', () => {
  expect(editorStyles).toContain('flex: 1 1 auto;');
  expect(editorStyles).toContain('min-width: 0;');
  expect(editorStyles).toContain('height: 32px;');
  expect(editorStyles).toContain('gap: 8px;');
  expect(mobileStyles).toContain('.sidebar-heading .btn-new { flex: 1 1 auto;');
  expect(mobileStyles).toContain('height: 44px;');
  expect(mobileStyles).toContain('.sidebar-heading .btn-new span { display: inline; }');
});

it('keeps note actions on the filename row', () => {
  expect(mobileStyles).toContain('grid-template-rows: 44px;');
  expect(mobileStyles).toContain('.titlebar-right { display: flex;');
  expect(mobileStyles).toContain('.toolbar-actions { display: flex;');
  expect(mobileStyles).toContain('.toolbar-actions #export-label { display: none; }');
});

it('keeps the live counter in the desktop note titlebar and mobile top bar', () => {
  const countsIndex = editorMarkup.indexOf('id="note-counts"');
  const titleIndex = editorMarkup.indexOf('id="note-title"');
  const actionsIndex = editorMarkup.indexOf('class="titlebar-right"');
  const mobileCountsIndex = editorMarkup.indexOf('id="mobile-note-counts"');
  expect(countsIndex).toBeGreaterThan(-1);
  expect(countsIndex).toBeGreaterThan(titleIndex);
  expect(countsIndex).toBeLessThan(actionsIndex);
  expect(mobileCountsIndex).toBeGreaterThan(-1);
  expect(editorMarkup.match(/id="note-counts"/g)).toHaveLength(1);
});

it('orders the desktop filename, save status, count, and controls', () => {
  const metadataIndex = editorMarkup.indexOf('class="titlebar-note-meta"');
  const titleIndex = editorMarkup.indexOf('id="note-title"');
  const statusIndex = editorMarkup.indexOf('id="desktop-save-status"');
  const countsIndex = editorMarkup.indexOf('id="note-counts"');
  const controlsIndex = editorMarkup.indexOf('class="titlebar-right"');
  expect(metadataIndex).toBeGreaterThan(-1);
  expect(titleIndex).toBeGreaterThan(metadataIndex);
  expect(statusIndex).toBeGreaterThan(titleIndex);
  expect(countsIndex).toBeGreaterThan(statusIndex);
  expect(controlsIndex).toBeGreaterThan(countsIndex);
  expect(editorStyles).toMatch(/#note-title\s*\{[\s\S]*?flex: 0 1 auto;/);
  expect(editorStyles).toMatch(/#note-title\s*\{[\s\S]*?max-width: 45ch;/);
  expect(editorStyles).toMatch(/#note-title\s*\{[\s\S]*?width: auto;/);
  expect(editorStyles).not.toContain('margin-left: -4px;');
  expect(editorStyles).toMatch(/#note-titlebar\s*\{[\s\S]*?justify-content: flex-start(?: !important)?;/);
  expect(editorStyles).toMatch(/\.titlebar-note-meta\s*\{[\s\S]*?display: flex;[\s\S]*?gap: 12px;/);
  expect(editorStyles).toContain('#note-titlebar > #desktop-save-status');
  expect(editorStyles).toMatch(/\.titlebar-right\s*\{[\s\S]*?margin-left: auto;/);
  expect(ownershipStyles).not.toContain('#note-title { flex: 1 1 0; }');
  expect(editorStyles).not.toContain('#note-titlebar { height: auto; min-height: 42px;');
  expect(editorStyles).not.toContain('@container writing-workspace (max-width: 650px)');
  expect(editorMarkup).not.toContain('id="save-status"');
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

it('lets the rich formatting toolbar scroll sideways when focus mode does not fit', () => {
  expect(editorStyles).toContain('overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;');
  expect(editorStyles).toContain('.preview-format-group { display: flex; align-items: center; flex: 0 0 auto; gap: 2px; }');
  expect(editorStyles).toContain('touch-action: none;');
  expect(editorStyles).toContain('background: linear-gradient(to right, var(--surface), transparent);');
  expect(editorStyles).toContain('background: linear-gradient(to left, var(--surface), transparent);');
  expect(editorMarkup).toContain('class="preview-tools-scroll"');
});

it('provides a mobile-only focus mode action in the preview toolbar', () => {
  expect(editorMarkup).toContain('id="mobile-focus-mode-btn"');
  expect(editorMarkup).toContain('aria-label="Focus mode"');
  expect(editorMarkup).toContain('aria-pressed="false"');
  expect(editorStyles).toContain('.mobile-focus-group { display: none; }');
  expect(mobileStyles).toContain('.preview-tools .mobile-focus-group { display: flex; }');
});

it('uses an accessible icon-only control to exit focus mode', () => {
  expect(editorMarkup).toMatch(/id="focus-exit"[^>]*aria-label="Exit focus mode"/);
  expect(editorMarkup).toMatch(/id="focus-exit"[\s\S]*?<svg/);
  expect(editorMarkup).not.toContain('<kbd>Esc</kbd>');
  expect(editorStyles).toContain('width: 36px; height: 36px;');
  expect(editorStyles).toContain('padding: 0;');
  expect(mobileStyles).toContain('.focus-exit { top: max(12px,env(safe-area-inset-top)); right: 12px; width: 44px; height: 44px;');
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

it('keeps view tools in the top bar and note actions in the note titlebar', () => {
  const topbar = editorMarkup.slice(editorMarkup.indexOf('id="topbar"'), editorMarkup.indexOf('id="note-titlebar"'));
  const titlebar = editorMarkup.slice(editorMarkup.indexOf('id="note-titlebar"'), editorMarkup.indexOf('id="save-error"'));
  for (const id of ['focus-mode-btn', 'writing-width-btn', 'diff-checker-btn']) {
    expect(topbar).toContain(`id="${id}"`);
    expect(titlebar).not.toContain(`id="${id}"`);
  }
  for (const id of ['view-toggle', 'export-btn']) expect(titlebar).toContain(`id="${id}"`);
  expect(mobileStyles).toContain('.toolbar-tools { display: none; }');
});

it('collapses save status and counts before they can collide with the view switch', () => {
  expect(ownershipStyles).toMatch(/max-width: 900px\)[\s\S]*?\.desktop-note-counts \{ display: none; \}[\s\S]*?\.desktop-save-status \{ font-size: 0;/);
});

it('keeps the dark workspace gutter visibly distinct from the writing page', () => {
  const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const root = editorStyles.slice(0, editorStyles.indexOf(':root[data-theme="light"]'));
  const bg = root.match(/--bg: (#[0-9a-f]{6})/)![1];
  const page = root.match(/--editor-bg: (#[0-9a-f]{6})/)![1];
  expect((lum(page) + 0.05) / (lum(bg) + 0.05)).toBeGreaterThanOrEqual(1.3);
});

it('paints the page edge from per-theme palette variables so light mode never inherits the dark edge', () => {
  expect(editorStyles).toContain('var(--page-edge) calc(var(--page-l) - 1px) var(--page-l)');
  expect(editorStyles).not.toMatch(/:root:not\(\[data-theme="light"\]\)[^{]*\.markdown-preview/);
  const lightBlocks = editorStyles.match(/data-theme="light"\][^{]*\{\s*--page-edge: var\(--border\)/g) ?? [];
  expect(lightBlocks.length).toBe(2);
});

it('scrolls on full-width surfaces so the scrollbar sits at the workspace edge, not inside the page', () => {
  expect(editorStyles).not.toMatch(/\.markdown-preview \{[^}]*max-width: 806px/);
  expect(editorStyles).toMatch(/\.markdown-preview \{\s*padding-inline: calc\(\(100% - var\(--page-w\)\) \/ 2 \+ 28px\)/);
  expect(editorStyles).toContain('scrollbar-width: thin;');
});
