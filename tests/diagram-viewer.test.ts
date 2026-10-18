import { beforeEach, expect, it } from 'vitest';
import { enhanceDiagrams } from '../src/editor/diagram-viewer';
beforeEach(()=>{
 document.body.innerHTML='<article><pre class="mermaid"><svg viewBox="0 0 900 1200" style="max-width:900px"><text>Readable source</text></svg></pre></article>';
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};
});
it('provides one scrollable frame and expand action without duplicating the SVG',()=>{
 const root=document.querySelector('article')!; enhanceDiagrams(root); enhanceDiagrams(root);
 expect(root.querySelectorAll('.diagram-frame')).toHaveLength(1);
 expect(root.querySelector<SVGSVGElement>('svg')!.style.getPropertyValue('--diagram-width')).toBe('900px');
 const expand=root.querySelector<HTMLButtonElement>('button')!; expand.click();
 expect(document.querySelectorAll('svg')).toHaveLength(1); expect(document.querySelector('.diagram-canvas svg')).not.toBeNull();
 document.querySelector<HTMLButtonElement>('[aria-label="Close diagram"]')!.click();
 expect(root.querySelector('svg')).not.toBeNull(); expect(document.activeElement).toBe(expand);
});
it('zooms with limits and restores the original SVG styles before printing',()=>{
 const root=document.querySelector('article')!; enhanceDiagrams(root); const svg=root.querySelector('svg')!; const style=svg.getAttribute('style');
 root.querySelector<HTMLButtonElement>('button')!.click();
 const zoom=document.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!;
 for(let i=0;i<8;i++) zoom.click();
 expect(document.querySelector('output')!.textContent).toBe('200%'); expect(zoom.disabled).toBe(true);
 window.dispatchEvent(new Event('beforeprint'));
 expect(document.querySelector('.diagram-dialog')).toBeNull(); expect(svg.getAttribute('style')).toBe(style); expect(root.contains(svg)).toBe(true);
});
it('leaves unrendered or invalid diagram source untouched',()=>{
 const root=document.querySelector('article')!; root.innerHTML='<pre class="mermaid">invalid source</pre>';
 enhanceDiagrams(root); expect(root.querySelector('.diagram-frame')).toBeNull(); expect(root.textContent).toBe('invalid source');
});
