import { COMPACT_LAYOUT_QUERY } from "./responsive";
/** Reuse the original controls so mobile and desktop cannot drift in state or behavior. */
export function initMobileActions(): { close: (restoreFocus?: boolean) => void } {
  const mobile = window.matchMedia(COMPACT_LAYOUT_QUERY);
  const trigger = document.getElementById('mobile-actions-toggle')!;
  const dialog = document.createElement('dialog');
  dialog.id = 'mobile-actions-dialog'; dialog.className = 'command-dialog mobile-actions-dialog';
  dialog.setAttribute('aria-labelledby','mobile-actions-title');
  dialog.innerHTML = '<div class="command-header"><h2 id="mobile-actions-title">Note actions</h2><button type="button" aria-label="Close note actions">×</button></div><div class="mobile-note-actions"></div><h3 class="mobile-theme-title">Appearance</h3><div class="mobile-theme-slot"></div>';
  document.body.append(dialog);
  const actions = dialog.querySelector('.mobile-note-actions')!;
  const ids = ['copy-markdown-btn','export-btn','focus-mode-btn','writing-width-btn','shortcuts-btn','privacy-fab','theme-toggle'];
  const homes = ids.map(id => {
    const element = document.getElementById(id)!;
    const marker = document.createComment(`home:${id}`); element.before(marker);
    if (id !== 'theme-toggle' && id !== 'export-btn') {
      const label = document.createElement('span'); label.className = 'mobile-action-label';
      label.textContent = id === 'shortcuts-btn' ? 'Commands & shortcuts' : id === 'privacy-fab' ? 'Privacy policy' : element.getAttribute('aria-label');
      element.append(label);
    }
    return {element,marker};
  });
  for (const theme of document.querySelectorAll<HTMLElement>('.theme-opt')) {
    const label = document.createElement('span'); label.className = 'mobile-action-label';
    label.textContent = {system:'System',light:'Light',dark:'Dark'}[theme.dataset.themeValue! as 'system'|'light'|'dark']; theme.append(label);
  }
  const newNote = document.getElementById('new-snippet-btn')!;
  const newNoteHome = document.createComment('home:new-snippet-btn');
  newNote.before(newNoteHome);
  let restore = true;
  function close(restoreFocus = true): void {
    restore = restoreFocus;
    if (dialog.open) dialog.close();
  }
  function layout(): void {
    const focused = document.activeElement as HTMLElement | null;
    const hadFocus = dialog.contains(focused);
    close(false);
    if (mobile.matches) document.getElementById('sidebar-close')!.before(newNote);
    else newNoteHome.after(newNote);
    if (focused === newNote) newNote.focus();
    for (const {element,marker} of homes) {
      if (mobile.matches) (element.id === 'theme-toggle' ? dialog.querySelector('.mobile-theme-slot')! : actions).append(element);
      else marker.after(element);
    }
    if (hadFocus) {
      if (mobile.matches) trigger.focus();
      else (homes.some(home => home.element.contains(focused)) ? focused : document.getElementById('shortcuts-btn'))?.focus();
    } else if (mobile.matches && homes.some(home => home.element.contains(focused))) trigger.focus();
  }
  trigger.addEventListener('click', () => {
    if (!mobile.matches) return;
    restore = true; dialog.showModal(); trigger.setAttribute('aria-expanded','true');
    dialog.querySelector<HTMLButtonElement>('.command-header button')!.focus();
  });
  dialog.querySelector('.command-header button')!.addEventListener('click', () => close());
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded','false');
    if (restore && mobile.matches) trigger.focus();
  });
  dialog.addEventListener('click', event => {
    const target = (event.target as Element).closest('button,a');
    if (target && actions.contains(target)) close();
  }, true);
  mobile.addEventListener('change',layout); layout();
  return {close};
}
