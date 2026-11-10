import { expect, it, vi } from 'vitest';
import { selectionToolbar, type SelectionAnchor } from '../src/editor/selection-toolbar';

function anchor(editor: HTMLElement): SelectionAnchor {
  const bounds = { top: 0, bottom: 600, left: 0, right: 400, width: 400, height: 600 };
  return { rect: bounds, bounds, key: 'selection', editor };
}

function visualViewport(height: number): VisualViewport {
  const viewport = new EventTarget();
  return Object.assign(viewport, { height, width: 400, offsetLeft: 0, offsetTop: 0 }) as VisualViewport;
}

async function nextFrame(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

it('uses the existing selection behavior on desktop', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  document.body.append(toolbar, editor);
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  const view = selectionToolbar(toolbar, () => anchor(editor));

  view.schedule();
  await nextFrame();

  expect(toolbar.hidden).toBe(false);
  expect(toolbar.style.top).not.toBe('');
});

it('keeps the mobile toolbar visible without a selection or keyboard', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  editor.tabIndex = 0;
  document.body.append(toolbar, editor);
  editor.focus();
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(800));
  const view = selectionToolbar(toolbar, () => null, {
    isMobile: () => true,
    mobileKeyboard: { isOpen: () => true, anchor: () => anchor(editor), placement: () => "top" },
  });

  view.schedule();
  await nextFrame();
  expect(toolbar.hidden).toBe(false);
  expect(toolbar.style.top).toBe('8px');
});

it('keeps the mobile toolbar visible while text selection is in progress', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  document.body.append(toolbar, editor);
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  selectionToolbar(toolbar, () => null, {
    isMobile: () => true,
    mobileKeyboard: { isOpen: () => true, anchor: () => anchor(editor), placement: () => "top" },
  });

  document.dispatchEvent(new MouseEvent('pointerdown'));
  await nextFrame();

  expect(toolbar.hidden).toBe(false);
});

it('reserves the iPhone keyboard accessory area below the toolbar', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  editor.tabIndex = 0;
  document.body.append(toolbar, editor);
  editor.focus();
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(500));
  const view = selectionToolbar(toolbar, () => anchor(editor), {
    isMobile: () => true,
    mobileKeyboard: {
      isOpen: () => true,
      anchor: () => anchor(editor),
      bottomInset: () => 104,
    },
  });

  view.schedule();
  await nextFrame();

  expect(toolbar.style.top).toBe('348px');
});

it('shows the mobile toolbar when iOS keeps the viewport height unchanged', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  editor.tabIndex = 0;
  document.body.append(toolbar, editor);
  editor.focus();
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(800));
  const view = selectionToolbar(toolbar, () => anchor(editor), {
    isMobile: () => true,
    mobileKeyboard: {
      isOpen: () => editor === document.activeElement,
      anchor: () => anchor(editor),
      bottomInset: () => 104,
      placement: () => "top",
    },
  });

  view.schedule();
  await nextFrame();

  expect(toolbar.hidden).toBe(false);
  expect(toolbar.style.top).toBe('8px');
});

it('docks full width flush above the keyboard and hides when typing stops', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  document.body.append(toolbar, editor);
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 44 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(500)); // keyboard takes the bottom 300px
  let typing = true;
  const view = selectionToolbar(toolbar, () => anchor(editor), {
    isMobile: () => true,
    mobileKeyboard: { isOpen: () => typing, anchor: () => anchor(editor), placement: () => 'dock' },
  });

  view.schedule();
  await nextFrame();
  expect(toolbar.hidden).toBe(false);
  expect(toolbar.classList.contains('docked')).toBe(true);
  expect(toolbar.style.width).toBe('400px');
  expect(toolbar.style.left).toBe('0px');
  expect(toolbar.style.top).toBe('456px'); // 500 - 44: the bar's bottom edge meets the keyboard

  typing = false;
  view.schedule();
  await nextFrame();
  expect(toolbar.hidden).toBe(true);
});

it('clears the dock width when the bar is no longer docked', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  document.body.append(toolbar, editor);
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 44 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(500));
  let placement: 'dock' | 'top' = 'dock';
  const view = selectionToolbar(toolbar, () => anchor(editor), {
    isMobile: () => true,
    mobileKeyboard: { isOpen: () => true, anchor: () => anchor(editor), placement: () => placement },
  });
  view.schedule(); await nextFrame();
  placement = 'top'; view.schedule(); await nextFrame();
  expect(toolbar.style.width).toBe('');
  expect(toolbar.classList.contains('docked')).toBe(false);
});
