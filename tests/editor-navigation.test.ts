import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { CommandsRegistry } from 'monaco-editor/esm/vs/platform/commands/common/commands';
import { KeybindingsRegistry } from 'monaco-editor/esm/vs/platform/keybinding/common/keybindingsRegistry';
vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({default: class {}}));
beforeAll(async () => {
 vi.stubGlobal('matchMedia', () => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 await import('../src/editor/monaco-setup');
});
afterAll(() => vi.unstubAllGlobals());
it('loads native word, selection, and line commands with keyboard bindings', () => {
 for (const id of [
  'cursorWordLeft','cursorWordEndRight','cursorWordLeftSelect','cursorWordEndRightSelect',
  'editor.action.moveLinesUpAction','editor.action.moveLinesDownAction','editor.action.copyLinesUpAction','editor.action.copyLinesDownAction',
 ]) {
  expect(CommandsRegistry.getCommand(id),id).toBeDefined();
  expect(KeybindingsRegistry.getDefaultKeybindings().some(binding => binding.command === id),id).toBe(true);
 }
});
