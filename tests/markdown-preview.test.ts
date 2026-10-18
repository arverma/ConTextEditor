import { beforeEach, expect, it, vi } from 'vitest';
const run=vi.hoisted(()=>vi.fn());
vi.mock('mermaid',()=>({default:{initialize:vi.fn(),run}}));
import { setPreviewContent } from '../src/editor/markdown-preview';
beforeEach(()=>{
 document.body.innerHTML='<article></article>'; document.documentElement.dataset.theme='light'; run.mockReset();
});
it('shows invalid diagram source instead of enlarging Mermaid error artwork',async()=>{
 run.mockImplementation(async({nodes})=>{
  nodes[0].innerHTML='<svg viewBox="0 0 1000 1000"><path class="error-icon" /></svg>'; throw Error('parse');
 });
 const root=document.querySelector('article')!; await setPreviewContent(root,'```mermaid\ninvalid diagram\n```');
 expect(root.querySelector('svg')).toBeNull(); expect(root.querySelector('.mermaid-error')!.textContent).toBe('invalid diagram');
 expect(root.textContent).toContain("Couldn't render this diagram."); expect(root.querySelector('.diagram-frame')).toBeNull();
});
it('enhances successful diagrams with a scrollable frame and an expand action',async()=>{
 run.mockImplementation(async({nodes})=>{nodes[0].innerHTML='<svg viewBox="0 0 800 400"><text>Diagram</text></svg>';});
 const root=document.querySelector('article')!; await setPreviewContent(root,'```mermaid\nflowchart LR\nA-->B\n```');
 expect(root.querySelector('.diagram-scroll svg')).not.toBeNull(); expect(root.querySelector('button')!.getAttribute('aria-label')).toBe('Expand diagram 1');
});
it('keeps imported HTML sanitized before rendering preview',async()=>{
 const root=document.querySelector('article')!; await setPreviewContent(root,'<img src="x" onerror="alert(1)"><script>alert(1)</script>');
 expect(root.querySelector('script')).toBeNull(); expect(root.querySelector('[onerror]')).toBeNull();
});

it('adds image download actions to Markdown tables without changing their cells', async () => {
 const root = document.querySelector('article')!;
 await setPreviewContent(root, '| Name | Value |\n| --- | --- |\n| Alpha | 42 |');
 expect(root.querySelectorAll('.table-frame')).toHaveLength(1);
 expect(root.querySelector('[aria-label="Download table 1 as PNG"]')).not.toBeNull();
 expect(root.querySelector('td')!.textContent).toBe('Alpha');
 const frame = root.querySelector('.table-frame')!;
 expect(frame.querySelector('.diagram-heading')).toBeNull();
 expect(frame.firstElementChild!.tagName).toBe('TABLE');
 expect(frame.lastElementChild!.className).toBe('table-actions');
 expect(frame.querySelector('button')!.textContent).toBe('');
});
