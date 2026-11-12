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

it('links back to the main site, has a single H1, and ships social tags', () => {
  const read = (f: string) => readFileSync(resolve('../src/editor/' + f), 'utf8');
  const [home, privacy, features] = ['index.html', 'privacy.html', 'features.html'].map(read);

  for (const page of [home, privacy]) expect(page).toContain('href="https://arverma.dev/">More work at arverma.dev</a>');
  expect(home.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(home).toContain('"price": "0"');
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) expect(privacy).toContain(`property="${tag}"`);
  expect(privacy).toContain('og:url" content="https://editor.arverma.dev/privacy.html"');
  expect(privacy).toContain('name="twitter:card"');
  expect(features).toContain('name="twitter:card"');
});

it('uses a 1200x630 PNG for og:image/twitter:image on every page (no SVG)', () => {
  const read = (f: string) => readFileSync(resolve('../src/editor/' + f), 'utf8');
  const url = 'https://editor.arverma.dev/og-image.png';
  const png = readFileSync(resolve('../src/editor/public/og-image.png'));
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  for (const f of ['index.html', 'features.html', 'privacy.html']) {
    const page = read(f);
    expect(page, f).toContain(`property="og:image" content="${url}"`);
    expect(page, f).toContain(`name="twitter:image" content="${url}"`);
    expect(page, f).toContain('property="og:image:type" content="image/png"');
    expect(page, f).toContain('property="og:image:width" content="1200"');
    expect(page, f).toContain('property="og:image:height" content="630"');
    expect(page, f).toContain('name="twitter:card" content="summary_large_image"');
    expect(page, f).not.toContain('content="https://editor.arverma.dev/logo.svg"');
  }
  expect(read('index.html')).toContain(`"image": "${url}"`);
});
