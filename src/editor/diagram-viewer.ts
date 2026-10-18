import { addImageDownload, createPreviewAction } from './preview-image';

/** Keep rendered diagrams readable without shrinking their text to fit a phone. */
export function enhanceDiagrams(root: HTMLElement): void {
  for (const [index, block] of [...root.querySelectorAll<HTMLElement>('pre.mermaid')].entries()) {
    const svg = block.querySelector<SVGSVGElement>('svg');
    if (!svg || svg.querySelector('.error-icon, .error-text') || block.closest('.diagram-frame')) continue;
    const width = Number(svg.getAttribute('viewBox')?.trim().split(/[\s,]+/)[2]);
    if (Number.isFinite(width) && width > 0) svg.style.setProperty('--diagram-width', `${width}px`);
    const frame = document.createElement('figure'); frame.className = 'diagram-frame';
    const heading = document.createElement('div'); heading.className = 'diagram-actions';
    const expand = createPreviewAction(`Expand diagram ${index + 1}`, 'expand');
    heading.append(expand);
    addImageDownload(heading, svg, `diagram-${index + 1}`, `diagram ${index + 1}`);
    const scroll = document.createElement('div'); scroll.className = 'diagram-scroll'; scroll.tabIndex = 0;
    scroll.setAttribute('role','region'); scroll.setAttribute('aria-label',`Diagram ${index + 1}, scroll to explore`);
    block.before(frame); scroll.append(block); frame.append(heading,scroll);
    expand.addEventListener('click', () => openDiagram(svg,expand,index + 1));
  }
}

function openDiagram(svg: SVGSVGElement, trigger: HTMLButtonElement, index: number): void {
  if (document.querySelector('.diagram-dialog[open]')) return;
  const originalStyle = svg.getAttribute('style');
  const preview = svg.closest<HTMLElement>('#markdown-preview');
  const previewScroll = preview?.scrollTop;
  const inline = svg.closest<HTMLElement>('.diagram-scroll');
  const minHeight = inline?.style.minHeight ?? '';
  const inlinePosition = inline ? {top:inline.scrollTop,left:inline.scrollLeft} : null;
  if (inline) inline.style.minHeight = `${inline.getBoundingClientRect().height}px`;
  const marker = document.createComment('expanded diagram'); svg.before(marker);
  const dialog = document.createElement('dialog'); dialog.className = 'diagram-dialog'; dialog.setAttribute('aria-label','Expanded diagram');
  dialog.innerHTML = '<div class="diagram-dialog-header"><div class="diagram-zoom"><button type="button" class="preview-icon-button" title="Zoom out" aria-label="Zoom out">−</button><output aria-live="polite">100%</output><button type="button" class="preview-icon-button" title="Zoom in" aria-label="Zoom in">+</button></div><button type="button" class="preview-icon-button" title="Close diagram" aria-label="Close diagram">×</button></div><div class="diagram-canvas" tabindex="0" role="region" aria-label="Expanded diagram, scroll to explore"></div>';
  addImageDownload(dialog.querySelector<HTMLElement>('.diagram-dialog-header')!, svg, `diagram-${index}`, `diagram ${index}`);
  dialog.querySelector('.diagram-dialog-header')!.append(dialog.querySelector('[aria-label="Close diagram"]')!);
  const canvas = dialog.querySelector<HTMLElement>('.diagram-canvas')!;
  canvas.append(svg); document.body.append(dialog);
  let scale = 1;
  const natural = Number(svg.getAttribute('viewBox')?.trim().split(/[\s,]+/)[2]);
  const width = Number.isFinite(natural) && natural > 0 ? natural : 640;
  const naturalHeight = Number(svg.getAttribute('viewBox')?.trim().split(/[\s,]+/)[3]);
  dialog.style.width = `${Math.max(320, width + 40)}px`;
  if (Number.isFinite(naturalHeight) && naturalHeight > 0) dialog.style.height = `${naturalHeight + 96}px`;
  function zoom(delta: number): void {
    scale = Math.min(2,Math.max(0.25,scale + delta));
    svg.style.width = `${width * scale}px`;
    dialog.querySelector('output')!.textContent = `${Math.round(scale * 100)}%`;
    dialog.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.disabled = scale <= 0.25;
    dialog.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.disabled = scale >= 2;
  }
  dialog.querySelector('[aria-label="Zoom out"]')!.addEventListener('click',()=>zoom(-0.25));
  dialog.querySelector('[aria-label="Zoom in"]')!.addEventListener('click',()=>zoom(0.25));
  const close = () => dialog.close();
  dialog.querySelector('[aria-label="Close diagram"]')!.addEventListener('click',close);
  function restore(): void {
    if (originalStyle === null) svg.removeAttribute('style'); else svg.setAttribute('style',originalStyle);
    if (marker.isConnected) marker.replaceWith(svg);
    if (inline) {
      inline.style.minHeight = minHeight;
      if (inlinePosition) { inline.scrollTop = inlinePosition.top; inline.scrollLeft = inlinePosition.left; }
    }
    if (preview && previewScroll !== undefined) preview.scrollTop = previewScroll;
    window.removeEventListener('beforeprint',close); dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }
  dialog.addEventListener('close',restore,{once:true});
  window.addEventListener('beforeprint',close);
  zoom(0);
  try { dialog.showModal(); dialog.querySelector<HTMLButtonElement>('[aria-label="Close diagram"]')!.focus(); }
  catch { restore(); }
}
