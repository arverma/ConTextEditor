// @vitest-environment node
import { expect, it } from 'vitest';
import { loadConfigFromFile } from 'vite';
import { resolve } from 'node:path';

it('builds and previews custom-domain assets at the root while preserving the local development URL', async () => {
  const configFile = resolve('../vite.editor.config.ts');
  for (const [command, isPreview, expected] of [
    ['build', false, '/'],
    ['serve', true, '/'],
    ['serve', false, '/ConTextEditor/'],
  ] as const) {
    const loaded = await loadConfigFromFile({command, isPreview, mode: command === 'build' ? 'production' : 'development'}, configFile);
    expect(loaded?.config.base).toBe(expected);
  }
});
