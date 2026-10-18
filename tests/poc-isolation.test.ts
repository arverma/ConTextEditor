// @vitest-environment node
import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfigFromFile } from 'vite';
it('keeps the prototype outside production build entries', async () => {
 const config=await loadConfigFromFile({command:'build',mode:'production'},resolve('../vite.editor.config.ts'));
 expect(JSON.stringify(config!.config.build!.rollupOptions!.input)).not.toContain('poc');
 expect(readFileSync('../src/editor/editor.ts','utf8')).not.toMatch(/from ["'].*poc\//);
});
it('keeps prototype code independent of persistent note storage', () => {
 for(const file of readdirSync('../src/editor/poc').filter(file=>file.endsWith('.ts'))) {
  expect(readFileSync(`../src/editor/poc/${file}`,'utf8')).not.toMatch(/localStorage|sessionStorage|indexedDB|from ['"].*(?:storage|note-session|ownership)['"]/);
 }
});
