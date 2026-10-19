import { beforeEach, expect, it, vi } from 'vitest';
import { enhanceDiagrams } from '../src/editor/diagram-viewer';
import { renderMermaidBlocks } from '../src/editor/markdown-preview';
import { enhanceTables } from '../src/editor/preview-image';
const run=vi.hoisted(()=>vi.fn());
vi.mock('mermaid',()=>({default:{initialize:vi.fn(),run}}));
beforeEach(()=>{
 document.body.innerHTML='<article></article>'; document.documentElement.dataset.theme='light'; run.mockReset();
});
it('shows invalid diagram source instead of enlarging Mermaid error artwork',async()=>{
 run.mockImplementation(async({nodes})=>{
  nodes[0].innerHTML='<svg viewBox="0 0 1000 1000"><path class="error-icon" /></svg>'; throw Error('parse');
 });
 const root=document.querySelector('article')!;
 root.innerHTML='<pre class="mermaid">invalid diagram</pre>';
 await renderMermaidBlocks(root);
 expect(root.querySelector('svg')).toBeNull(); expect(root.querySelector('.mermaid-error')!.textContent).toBe('invalid diagram');
 expect(root.textContent).toContain("Couldn't render this diagram."); expect(root.querySelector('.diagram-frame')).toBeNull();
});
it('enhances successful diagrams with a scrollable frame and an expand action',async()=>{
 run.mockImplementation(async({nodes})=>{nodes[0].innerHTML='<svg viewBox="0 0 800 400"><text>Diagram</text></svg>';});
 const root=document.querySelector('article')!;
 root.innerHTML='<pre class="mermaid">flowchart LR\nA-->B</pre>';
 await renderMermaidBlocks(root);
 enhanceDiagrams(root);
 expect(root.querySelector('.diagram-scroll svg')).not.toBeNull(); expect(root.querySelector('button')!.getAttribute('aria-label')).toBe('Expand diagram 1');
});
it('adds image download actions to Markdown tables without changing their cells', () => {
 const root = document.querySelector('article')!;
 root.innerHTML = '<table><tr><td>Alpha</td></tr></table>';
 enhanceTables(root);
 expect(root.querySelectorAll('.table-frame')).toHaveLength(1);
 expect(root.querySelector('[aria-label="Download table 1 as PNG"]')).not.toBeNull();
 expect(root.querySelector('td')!.textContent).toBe('Alpha');
 const frame = root.querySelector('.table-frame')!;
 expect(frame.querySelector('.diagram-heading')).toBeNull();
 expect(frame.firstElementChild!.tagName).toBe('TABLE');
 expect(frame.lastElementChild!.className).toBe('table-actions');
 expect(frame.querySelector('button')!.textContent).toBe('');
});
