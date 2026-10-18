export interface SelectionAnchor {
  rect: { left: number; right: number; top: number; bottom: number };
  bounds: { top: number; bottom: number };
  key: string;
  editor: HTMLElement;
}

/** Keep formatting beside a live editor selection without taking pointer focus. */
export function selectionToolbar(toolbar: HTMLElement, anchor: () => SelectionAnchor | null) {
  let frame = 0;
  let dismissed = '';
  let lastAnchor: SelectionAnchor | null = null;
  let selecting = false;

  function update() {
    frame = 0;
    if (selecting) { toolbar.hidden = true; return; }
    const selected = anchor();
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
    const x = Math.max(left + 8, Math.min(left + width - size.width - 8, (rect.left + rect.right - size.width) / 2));
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
