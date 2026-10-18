import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { downloadPreviewImage, addImageDownload } from '../src/editor/preview-image';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

beforeEach(() => {
  document.body.innerHTML = '<svg viewBox="0 0 900 1200" style="width:450px;max-width:100%"><text>Full diagram</text></svg>';
});

it.each(['diagram', 'table'])('downloads the full %s as PNG without changing the preview and cleans up the link', async (kind) => {
  vi.useFakeTimers();
  let imageSource = '';
  vi.stubGlobal('Image', class {
    onload?: () => void;
    set src(value: string) { imageSource = value; queueMicrotask(() => this.onload?.()); }
  });
  const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  const create = vi.fn((_blob: Blob) => 'blob:png'); const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  let filename = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download; });
  if (kind === 'table') document.body.innerHTML = '<table style="max-width:300px;overflow:auto"><tbody><tr><td>Full table Ω</td></tr></tbody></table>';
  const source = document.querySelector<SVGSVGElement | HTMLTableElement>(kind === 'table' ? 'table' : 'svg')!;
  if (kind === 'table') Object.defineProperties(source, { scrollWidth: { value: 900 }, scrollHeight: { value: 1200 } });
  const style = source.getAttribute('style');
  await downloadPreviewImage(source, `${kind}-1`);
  const exported = new DOMParser().parseFromString(decodeURIComponent(imageSource.split(',')[1]), 'image/svg+xml');
  expect(exported.querySelector('parsererror')).toBeNull();
  expect(exported.documentElement.getAttribute('width')).toBe('900');
  expect(exported.documentElement.getAttribute('height')).toBe('1200');
  expect(exported.documentElement.textContent).toContain(kind === 'diagram' ? 'Full diagram' : 'Full table Ω');
  if (kind === 'table') expect(exported.querySelector('foreignObject table')).not.toBeNull();
  expect(context.drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 1800, 2400]);
  expect(filename).toBe(`${kind}-1.png`);
  expect(create.mock.calls[0][0].type).toBe('image/png');
  expect(document.querySelector('a[download]')).toBeNull();
  expect(source.getAttribute('style')).toBe(style);
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:png');
});

it('shows a recoverable error and enables retry when image decoding fails', async () => {
  vi.stubGlobal('Image', class {
    onerror?: () => void;
    set src(_: string) { queueMicrotask(() => this.onerror?.()); }
  });
  const heading = document.createElement('div'); document.body.append(heading);
  addImageDownload(heading, document.querySelector('svg')!, 'diagram-1', 'diagram 1');
  const button = heading.querySelector('button')!;
  button.click(); expect(button.disabled).toBe(true);
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(heading.querySelector('[role="status"]')!.textContent).toContain("Couldn't download");
  expect(button.textContent).toBe('');
  expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  expect(button.hasAttribute('aria-busy')).toBe(false);
});
