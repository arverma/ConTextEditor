import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initMobileActions } from '../src/editor/mobile-actions';
const shell = readFileSync('../src/editor/index.html','utf8');
let mobile = true; let resize: () => void;
beforeEach(() => {
 document.documentElement.innerHTML = shell; mobile = true;
 vi.stubGlobal('matchMedia', () => ({get matches(){return mobile;},addEventListener:(_:string,fn:()=>void)=>{resize=fn;}}));
 HTMLDialogElement.prototype.showModal = function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close = function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};
});
it('moves the existing controls into mobile actions and restores the same nodes on desktop', () => {
 const privacy = document.getElementById('privacy-fab')!; const original = privacy.parentNode;
 initMobileActions(); expect(privacy.closest('.mobile-actions-dialog')).not.toBeNull();
 expect(privacy.closest('.mobile-actions-dialog')).not.toBeNull();
 expect(document.querySelectorAll('#privacy-fab')).toHaveLength(1);
 mobile=false; resize(); expect(privacy.parentNode).toBe(original);
});
it('leaves copy and PDF actions in the mobile title bar', () => {
 initMobileActions();
 expect(document.getElementById('copy-markdown-btn')!.closest('.mobile-actions-dialog')).toBeNull();
 expect(document.getElementById('export-btn')!.closest('.mobile-actions-dialog')).toBeNull();
 expect(document.getElementById('focus-mode-btn')!.closest('.mobile-actions-dialog')).toBeNull();
 expect(document.getElementById('writing-width-btn')!.closest('.mobile-actions-dialog')).toBeNull();
 expect(document.getElementById('shortcuts-btn')!.closest('.mobile-actions-dialog')).toBeNull();
});
it('closes the sheet before running actions so a second modal or focus mode can open safely', () => {
 initMobileActions(); document.getElementById('mobile-actions-toggle')!.click();
 const dialog = document.querySelector<HTMLDialogElement>('.mobile-actions-dialog')!; expect(dialog.open).toBe(true);
 const run = vi.fn(()=>expect(dialog.open).toBe(false)); document.getElementById('privacy-fab')!.addEventListener('click',run);
 document.getElementById('privacy-fab')!.click(); expect(run).toHaveBeenCalled(); expect(document.activeElement?.id).toBe('mobile-actions-toggle');
});
it('keeps theme choice in the sheet and closes cleanly on resize', () => {
 initMobileActions(); document.getElementById('mobile-actions-toggle')!.click();
 document.querySelector<HTMLButtonElement>('[data-theme-value="dark"]')!.click();
 expect(document.querySelector<HTMLDialogElement>('.mobile-actions-dialog')!.open).toBe(true);
 mobile=false; resize(); expect(document.querySelector<HTMLDialogElement>('.mobile-actions-dialog')!.open).toBe(false);
 expect(document.querySelector('#theme-toggle')!.closest('.topbar-right')).not.toBeNull();
});

it('keeps New note as the same working control when moving it into the compact history heading', () => {
 const button = document.getElementById('new-snippet-btn')!;
 const next = button.nextElementSibling;
 const create = vi.fn(); button.addEventListener('click', create);
 initMobileActions();
 expect(button.closest('.sidebar-heading')).not.toBeNull();
 expect(button.getAttribute('aria-label')).toBe('New note');
 button.click(); expect(create).toHaveBeenCalledTimes(1);
 mobile=false; resize();
 expect(button.closest('.sidebar-heading')).toBeNull();
 expect(button.nextElementSibling).toBe(next);
 expect(document.querySelectorAll('#new-snippet-btn')).toHaveLength(1);
 mobile=true; resize(); button.click(); expect(create).toHaveBeenCalledTimes(2);
});
