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

it('shows only the keyboard toolbar on mobile and pins it above the visual viewport', async () => {
  const toolbar = document.createElement('div');
  const editor = document.createElement('div');
  editor.tabIndex = 0;
  document.body.append(toolbar, editor);
  editor.focus();
  vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 40 } as DOMRect);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', visualViewport(800));
  const keyboardOpen = vi.fn(() => false);
  const view = selectionToolbar(toolbar, () => anchor(editor), {
    isMobile: () => true,
    mobileKeyboard: { isOpen: keyboardOpen, anchor: () => anchor(editor) },
  });

  view.schedule();
  await nextFrame();
  expect(toolbar.hidden).toBe(true);

  keyboardOpen.mockReturnValue(true);
  vi.stubGlobal('visualViewport', visualViewport(500));
  view.schedule();
  await nextFrame();

  expect(toolbar.hidden).toBe(false);
  expect(toolbar.style.top).toBe('452px');
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
