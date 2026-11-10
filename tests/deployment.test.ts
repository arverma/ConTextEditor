// @vitest-environment node
import { expect, it } from 'vitest';
import { loadConfigFromFile } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

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

it('publishes crawlable editor content and metadata', () => {
  const homepage = readFileSync(resolve('../src/editor/index.html'), 'utf8');
  const features = readFileSync(resolve('../src/editor/features.html'), 'utf8');
  const sitemap = readFileSync(resolve('../src/editor/public/sitemap.xml'), 'utf8');

  expect(homepage).toContain('<details class="seo-intro"');
  expect(homepage).toContain('"@type": "SoftwareApplication"');
  expect(features).toContain('<h1>Write Markdown without leaving your browser</h1>');
  expect(features).toContain('https://arverma.dev/');
  expect(sitemap).toContain('https://editor.arverma.dev/features.html');
});
