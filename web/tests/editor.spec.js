import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

// Observe the real compiler boundary; no template, renderer, or result is mocked.
// One test can hold an actual result to reproduce out-of-order UI delivery.
test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const requests = new Map();
    window.Worker = class extends NativeWorker {
      postMessage(message, ...rest) {
        if (message.type === 'compile') requests.set(message.id, structuredClone(message.payload));
        return super.postMessage(message, ...rest);
      }
      addEventListener(type, listener, options) {
        if (type !== 'message') return super.addEventListener(type, listener, options);
        return super.addEventListener(type, (event) => {
          const deliver = () => {
            if (event.data.type === 'result') {
              window.__lastCompilation = { request: requests.get(event.data.id), pdf: event.data.pdf };
            }
            listener.call(this, event);
          };
          if (event.data.type === 'result' && window.__holdNextResult) {
            window.__holdNextResult = false;
            window.__releaseResult = deliver;
            window.__resultHeld = true;
          } else deliver();
        }, options);
      }
    };
  });
});

async function ready(page) {
  await expect(page.locator('#download-pdf')).toBeEnabled();
  await expect(page.locator('#download-png')).toBeEnabled();
  await expect(page.locator('#preview-stage')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#preview-image')).toBeVisible();
  await page.locator('#preview-image').evaluate((image) => image.decode());
}

async function start(page) {
  await page.goto('./');
  await ready(page);
}

async function input(page, path) {
  const field = page.locator(`[data-path="${path}"]`);
  const details = field.locator('xpath=ancestor::details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  return field;
}

async function fill(page, path, value) {
  await (await input(page, path)).fill(value);
}

async function exportFile(page, selector) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  return { bytes: await readFile(await download.path()), name: download.suggestedFilename() };
}

async function savedDraft(page) {
  return JSON.parse((await exportFile(page, '#save-draft')).bytes.toString('utf8'));
}

async function currentPDF(page) {
  const file = await exportFile(page, '#download-pdf');
  expect(file.bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const hash = await page.evaluate(async () => {
    const digest = await crypto.subtle.digest('SHA-256', window.__lastCompilation.pdf);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  });
  expect(createHash('sha256').update(file.bytes).digest('hex')).toBe(hash);
  const pdf = await PDFDocument.load(file.bytes);
  expect(pdf.getPageCount()).toBe(1);
  const { width, height } = pdf.getPage(0).getSize();
  return { ...file, width: width * 25.4 / 72, height: height * 25.4 / 72 };
}

async function preset(page, value) {
  await page.locator('#preset').selectOption(value);
  await page.locator('#apply-preset').click();
  await ready(page);
}

async function uploadFixture(page, color, name) {
  const base64 = await page.evaluate((fillStyle) => {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const context = canvas.getContext('2d');
    context.fillStyle = fillStyle;
    context.fillRect(0, 0, 16, 16);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color);
  return { name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

test('edits, CP boundary and theme produce matching PDF/PNG without sending personal content', async ({ page, context, baseURL }, testInfo) => {
  const requests = [];
  context.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  await start(page);
  await page.locator('#auto-preview').uncheck();
  await fill(page, 'nickname', '测试旅人');
  await fill(page, 'cp', '拒所有 CP');
  await page.locator('[data-theme="dark"]').click();
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await page.locator('#refresh').click();
  await ready(page);
  const request = await page.evaluate(() => window.__lastCompilation.request);
  expect(request).toMatchObject({ kind: 'strip', theme: 'dark', profile: { nickname: '测试旅人', cp: '拒所有 CP' } });
  const pdf = await currentPDF(page);
  expect(pdf.name).toBe('trailblazer-strip-dark.pdf');
  expect(pdf.width).toBeCloseTo(80, 1);
  const png = await exportFile(page, '#download-png');
  expect(png.name).toBe('trailblazer-strip-dark.png');
  expect(png.bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.bytes.readUInt32BE(16)).toBe(Math.round(pdf.width * 300 / 25.4));
  expect(png.bytes.readUInt32BE(20)).toBe(Math.round(pdf.height * 300 / 25.4));
  const host = new URL(baseURL);
  for (const request of requests.filter(({ url }) => /^https?:/.test(url))) {
    const url = new URL(request.url);
    expect(url.origin).toBe(host.origin);
    expect(url.pathname.startsWith(host.pathname)).toBe(true);
    expect(request.method).toBe('GET');
    expect(decodeURIComponent(url.href)).not.toContain('测试旅人');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('strip-desktop.png'), fullPage: true });
});

test('resume switches in both palettes, remains one A4 page and preserves the strip draft', async ({ page }, testInfo) => {
  await start(page);
  await fill(page, 'nickname', '独立扩列资料');
  await page.locator('[data-kind="resume"]').click();
  await ready(page);
  for (const theme of ['light', 'dark']) {
    await page.locator(`[data-theme="${theme}"]`).click();
    await ready(page);
    const pdf = await currentPDF(page);
    expect(pdf.name).toBe(`trailblazer-resume-${theme}.pdf`);
    expect(pdf.width).toBeCloseTo(210, 1);
    expect(pdf.height).toBeCloseTo(297, 1);
  }
  const png = await exportFile(page, '#download-png');
  await writeFile(testInfo.outputPath('resume-dark.png'), png.bytes);
  await page.locator('[data-kind="strip"]').click();
  await expect(page.locator('[data-path="nickname"]')).toHaveValue('独立扩列资料');
  await ready(page);
});

test('long/short presets resize the strip and entirely blank optional groups collapse', async ({ page }, testInfo) => {
  await start(page);
  const standard = await currentPDF(page);
  await preset(page, 'long');
  const long = await currentPDF(page);
  expect(long.height).toBeGreaterThan(300);
  expect(long.height).toBeGreaterThan(standard.height * 1.7);
  await expect(page.locator('#export-note')).toContainText('长条');
  const png = await exportFile(page, '#download-png');
  await writeFile(testInfo.outputPath('strip-long.png'), png.bytes);
  await preset(page, 'short');
  const short = await currentPDF(page);
  expect(short.height).toBeLessThan(130);
  expect(short.height).toBeLessThan(standard.height);
  await page.locator('#auto-preview').uncheck();
  for (const key of ['fandoms', 'favorites', 'interests', 'looking_for', 'cp', 'boundaries', 'preferences']) await fill(page, key, '');
  await page.locator('#refresh').click();
  await ready(page);
  const minimal = await currentPDF(page);
  expect(minimal.height).toBeLessThan(short.height - 20);
  const draft = await savedDraft(page);
  expect(draft.profile.fandoms).toBe('');
  expect(draft.profile.preferences).toBe('');
});

test('late compilation cannot restore stale exports after rapid edits', async ({ page }) => {
  await start(page);
  await page.locator('#auto-preview').uncheck();
  await page.evaluate(() => { window.__holdNextResult = true; });
  await fill(page, 'nickname', '旧版名字');
  await page.locator('#refresh').click();
  await page.waitForFunction(() => window.__resultHeld);
  await fill(page, 'nickname', '最终版名字');
  await fill(page, 'cp', '拒所有 CP');
  await page.locator('[data-theme="dark"]').click();
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await expect(page.locator('#download-png')).toBeDisabled();
  await page.locator('#refresh').click();
  await page.evaluate(() => window.__releaseResult());
  await ready(page);
  expect(await page.evaluate(() => window.__lastCompilation.request)).toMatchObject({
    kind: 'strip', theme: 'dark', profile: { nickname: '最终版名字', cp: '拒所有 CP' },
  });
  await currentPDF(page);
});

test('overfull A4 is rejected and exports stay disabled until content is repaired', async ({ page }) => {
  await start(page);
  await page.locator('[data-kind="resume"]').click();
  await ready(page);
  await page.locator('#auto-preview').uncheck();
  const original = await (await input(page, 'projects.0.duty')).inputValue();
  await fill(page, 'projects.0.duty', '这是用于验证超出 A4 页面时拒绝导出的测试段落。'.repeat(50));
  await page.locator('#refresh').click();
  await expect(page.locator('#status')).toHaveClass(/error/);
  await expect(page.locator('#status')).toContainText(/页|A4|精简/);
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await expect(page.locator('#download-png')).toBeDisabled();
  await fill(page, 'projects.0.duty', original);
  await page.locator('#refresh').click();
  await ready(page);
  expect((await currentPDF(page)).height).toBeCloseTo(297, 1);
});

test('image uploads survive draft round-trip but do not leak into another template or reset preset', async ({ page }) => {
  await start(page);
  const portrait = await uploadFixture(page, '#e43131', 'sample-portrait.png');
  const qr = await uploadFixture(page, '#2534f0', 'sample-qr.png');
  await page.locator('#upload-portrait').setInputFiles(portrait);
  await expect(page.locator('.upload-field').filter({ has: page.locator('#upload-portrait') })).toContainText(portrait.name);
  await ready(page);
  await (await input(page, 'contact')).fill('sample-account-only');
  await page.locator('#upload-qr_image').setInputFiles(qr);
  await expect(page.locator('.upload-field').filter({ has: page.locator('#upload-qr_image') })).toContainText(qr.name);
  await ready(page);
  const exported = await exportFile(page, '#save-draft');
  const draft = JSON.parse(exported.bytes.toString());
  expect(draft.images.portrait.base64).toBe(portrait.buffer.toString('base64'));
  expect(draft.images.qr_image.base64).toBe(qr.buffer.toString('base64'));
  await page.locator('[data-kind="resume"]').click();
  await ready(page);
  expect((await savedDraft(page)).images).toEqual({});
  await page.locator('[data-kind="strip"]').click();
  await ready(page);
  expect((await savedDraft(page)).images).toEqual(draft.images);
  await preset(page, 'short');
  expect((await savedDraft(page)).images).toEqual({});
  await page.locator('#draft-file').setInputFiles({ name: 'restored-draft.json', mimeType: 'application/json', buffer: exported.bytes });
  await expect(page.locator('[data-path="contact"]')).toHaveValue('sample-account-only');
  await ready(page);
  const restored = await savedDraft(page);
  expect(restored.profile).toEqual(draft.profile);
  expect(restored.images).toEqual(draft.images);
  await currentPDF(page);
  await page.locator('#draft-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
  await expect(page.locator('#status')).toContainText('导入失败');
  expect((await savedDraft(page)).images).toEqual(draft.images);
});

test('pending image reads disable exports and clearing the image cancels late completion', async ({ page }) => {
  await page.addInitScript(() => {
    const native = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function (...args) {
      if (this.name !== 'delayed-portrait.png') return native.apply(this, args);
      return new Promise((resolve, reject) => {
        window.__finishImageRead = () => native.apply(this, args).then(resolve, reject);
      });
    };
  });
  await start(page);
  const portrait = await uploadFixture(page, '#34ad31', 'delayed-portrait.png');
  await page.locator('#upload-portrait').setInputFiles(portrait);
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await expect(page.locator('#download-png')).toBeDisabled();
  await page.locator('[data-clear-image="portrait"]').click();
  await page.evaluate(() => window.__finishImageRead());
  await ready(page);
  expect((await savedDraft(page)).images).toEqual({});
  await expect(page.locator('.upload-field').filter({ has: page.locator('#upload-portrait') })).not.toContainText(portrait.name);
  await currentPDF(page);
});

test('small-screen editor has no horizontal overflow and supports export', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await fill(page, 'nickname', '手机示例');
  await ready(page);
  await currentPDF(page);
  await page.screenshot({ path: testInfo.outputPath('strip-mobile.png'), fullPage: true });
});
