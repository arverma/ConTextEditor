import { afterEach, expect, it, vi } from 'vitest';
import { newId } from '../src/editor/ids';
afterEach(() => vi.unstubAllGlobals());
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
it('uses crypto.randomUUID when the page is a secure context', () => {
  vi.stubGlobal('crypto', { randomUUID: () => 'fixed-id' });
  expect(newId()).toBe('fixed-id');
});
it('still makes valid unique v4 ids on insecure http pages where randomUUID is undefined', () => {
  vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } });
  const ids = new Set(Array.from({ length: 200 }, newId));
  expect(ids.size).toBe(200);
  for (const id of ids) expect(id).toMatch(V4);
});
it('does not throw even without any crypto object', () => {
  vi.stubGlobal('crypto', undefined);
  expect(newId()).toMatch(V4);
});
