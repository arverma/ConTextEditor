const SVG_NS = 'http://www.w3.org/2000/svg';

/** Freeze inherited theme styles so the image can render outside the preview. */
function styledClone<T extends Element>(source: T): T {
  const clone = source.cloneNode(true) as T;
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((element, index) => {
    const computed = getComputedStyle(element);
    const style = (copies[index] as HTMLElement | SVGElement).style;
    for (const property of Array.from(computed)) style.setProperty(property, computed.getPropertyValue(property));
  });
  return clone;
}

export async function downloadPreviewImage(source: SVGSVGElement | HTMLTableElement, name: string): Promise<void> {
  await document.fonts?.ready;
  const isSvg = source.namespaceURI === SVG_NS;
  const viewBox = isSvg ? source.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number) : undefined;
  const width = Math.ceil(viewBox?.[2] ?? source.scrollWidth);
  const height = Math.ceil(viewBox?.[3] ?? source.scrollHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Empty image');
  const clone = styledClone(source);
  let imageSvg: SVGSVGElement;
  if (isSvg) {
    imageSvg = clone as SVGSVGElement;
    imageSvg.style.width = `${width}px`;
    imageSvg.style.height = `${height}px`;
    imageSvg.style.maxWidth = 'none';
  } else {
    imageSvg = document.createElementNS(SVG_NS, 'svg');
    const content = document.createElementNS(SVG_NS, 'foreignObject');
    content.setAttribute('width', '100%'); content.setAttribute('height', '100%');
    const table = clone as HTMLTableElement;
    table.style.display = 'table'; table.style.width = `${width}px`;
    table.style.maxWidth = 'none'; table.style.margin = '0'; table.style.overflow = 'visible';
    content.append(table); imageSvg.append(content);
  }
  imageSvg.setAttribute('width', String(width)); imageSvg.setAttribute('height', String(height));
  // Data URLs keep SVG foreignObject labels origin-clean when drawn to a canvas.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(imageSvg))}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('Image could not load'));
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  // Keep large diagrams within common browser canvas limits while exporting at 2× when possible.
  const scale = Math.min(2, 8192 / Math.max(width, height), Math.sqrt(16_000_000 / (width * height)));
  canvas.width = Math.max(1, Math.floor(width * scale)); canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image could not export')), 'image/png'));
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = downloadUrl; link.download = `${name}.png`;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); }
}

export function createPreviewAction(label: string, icon: 'expand' | 'download'): HTMLButtonElement {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'preview-icon-button';
  button.setAttribute('aria-label', label); button.title = label;
  const path = icon === 'expand' ? 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5' : 'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5';
  button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return button;
}

export function addImageDownload(heading: HTMLElement, source: SVGSVGElement | HTMLTableElement, name: string, label: string): void {
  const button = createPreviewAction(`Download ${label} as PNG`, 'download');
  button.classList.add('image-download-button');
  const status = document.createElement('span'); status.className = 'image-download-status'; status.setAttribute('role', 'status');
  heading.append(button, status);
  button.addEventListener('click', async () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true'); status.textContent = '';
    try { await downloadPreviewImage(source, name); }
    catch { status.textContent = "Couldn't download image. Please try again."; }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  });
}

export function enhanceTables(root: HTMLElement): void {
  root.querySelectorAll<HTMLTableElement>('table').forEach((table, index) => {
    if (table.closest('.table-frame, .mermaid')) return;
    const frame = document.createElement('figure'); frame.className = 'table-frame';
    const heading = document.createElement('figcaption'); heading.className = 'table-actions';
    addImageDownload(heading, table, `table-${index + 1}`, `table ${index + 1}`);
    table.before(frame); frame.append(table, heading);
  });
}
