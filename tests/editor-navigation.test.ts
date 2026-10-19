import { expect, it } from 'vitest';
import { writingKeymapMatchesDefaults } from '../src/editor/source-editor';

it('keeps the documented line, word, and document bindings', () => {
  expect(writingKeymapMatchesDefaults()).toBe(true);
});
