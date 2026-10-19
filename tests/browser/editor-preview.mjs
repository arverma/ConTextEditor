import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.EDITOR_BASE_URL ?? 'http://127.0.0.1:5173/ConTextEditor/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('.cm-content').waitFor();
  await page.locator('.cm-content').click();
  await page.keyboard.type('Hello world');
  await page.waitForFunction(() => document.querySelector('#full-text-mirror')?.textContent === 'Hello world');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.locator('.rich-editor').waitFor();
  assert.equal(await page.locator('#full-text-mirror').textContent(), 'Hello world');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await page.locator('#full-text-mirror').textContent(), 'Hello world');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.locator('.rich-editor p').click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await page.waitForFunction(() => document.querySelector('#full-text-mirror')?.textContent?.includes('Hello world!'));
  assert.equal(errors.length, 0, errors.join('\n'));
} finally {
  await browser.close();
}
