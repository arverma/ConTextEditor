export interface SelectionAnchor {
  rect: { left: number; right: number; top: number; bottom: number };
  bounds: { top: number; bottom: number };
  key: string;
  editor: HTMLElement;
}

export interface SelectionToolbarOptions {
  isMobile?: () => boolean;
  mobileKeyboard?: {
    isOpen: () => boolean;
    anchor: () => SelectionAnchor | null;
    bottomInset?: () => number;
    placement?: () => "bottom" | "top";
  };
}

/** Keep formatting beside a live editor selection without taking pointer focus. */
export function selectionToolbar(toolbar: HTMLElement, anchor: () => SelectionAnchor | null, options: SelectionToolbarOptions = {}) {
  let frame = 0;
  let dismissed = '';
  let lastAnchor: SelectionAnchor | null = null;
  let selecting = false;

  function update() {
    frame = 0;
    if (selecting) { toolbar.hidden = true; return; }
    const mobileKeyboard = options.isMobile?.() && options.mobileKeyboard?.isOpen();
    const selected = mobileKeyboard ? options.mobileKeyboard?.anchor() ?? null : options.isMobile?.() ? null : anchor();
    lastAnchor = selected;
    if (!selected) {
      dismissed = '';
      toolbar.hidden = true;
      return;
    }
    if (selected.key === dismissed) {
      toolbar.hidden = true;
      return;
    }
    dismissed = '';
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth;
    const height = viewport?.height ?? innerHeight;
    const rect = selected.rect;
    if (rect.bottom < top || rect.top > top + height || rect.right < left || rect.left > left + width) {
      toolbar.hidden = true;
      return;
    }
    toolbar.hidden = false;
    const size = toolbar.getBoundingClientRect();
    if (mobileKeyboard) {
      toolbar.style.left = `${Math.max(left + 8, left + (width - size.width) / 2)}px`;
      if (options.mobileKeyboard?.placement?.() === "top") {
        const toolbarTop = Math.max(top + 8, selected.bounds.top + 8);
        toolbar.style.top = `${toolbarTop}px`;
        return;
      }
      const bottomInset = options.mobileKeyboard?.bottomInset?.() ?? 0;
      toolbar.style.top = `${Math.max(top + 8, top + height - size.height - bottomInset - 8)}px`;
      return;
    }
    const editorBox = selected.editor.getBoundingClientRect();
    const minX = Math.max(left + 8, editorBox.left + 4);
    const maxX = Math.min(left + width - size.width - 8, editorBox.right - size.width - 4);
    const preferred = (rect.left + rect.right - size.width) / 2;
    const x = maxX < minX ? Math.max(left + 8, Math.min(left + width - size.width - 8, preferred)) : Math.max(minX, Math.min(maxX, preferred));
    const minimumY = Math.max(top + 8, selected.bounds.top + 4);
    const maximumY = Math.min(top + height - size.height - 8, selected.bounds.bottom - size.height - 4);
    const above = rect.top - size.height - 8;
    const y = above >= minimumY ? above : Math.min(maximumY, rect.bottom + 8);
    toolbar.style.left = `${x}px`;
    toolbar.style.top = `${Math.max(minimumY, y)}px`;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  document.addEventListener('selectionchange', schedule);
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && toolbar.contains(event.target)) return;
    selecting = true;
    dismissed = '';
    toolbar.hidden = true;
  });
  document.addEventListener('pointerup', () => { selecting = false; schedule(); });
  document.addEventListener('pointercancel', () => { selecting = false; schedule(); });
  document.addEventListener('keyup', schedule);
  document.addEventListener('focusin', schedule);
  document.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !toolbar.hidden) {
      event.preventDefault();
      dismissed = lastAnchor?.key ?? '';
      toolbar.hidden = true;
      if (toolbar.contains(document.activeElement)) lastAnchor?.editor.focus({ preventScroll: true });
    }
    if (event.altKey && event.key === 'F10' && !toolbar.hidden) {
      event.preventDefault();
      toolbar.querySelector<HTMLButtonElement>('button')?.focus();
    }
  });
  schedule();
  return { schedule };
}
