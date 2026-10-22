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
  await expect(page.locator('[data-path="closing"]')).toHaveCount(0);
  expect(await page.locator('#preset option').evaluateAll((options) => options.map((option) => option.value))).toEqual(['default', 'short']);
  expect(await page.locator('[data-path="about_me"]').inputValue()).not.toContain('CN');
  await fill(page, 'uid', '123456789');
  await fill(page, 'nickname', '测试旅人');
  await fill(page, 'boundaries', '拒所有 CP');
  await page.locator('[data-theme="dark"]').click();
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await page.locator('#refresh').click();
  await ready(page);
  const request = await page.evaluate(() => window.__lastCompilation.request);
  expect(request).toMatchObject({ kind: 'strip', theme: 'dark', profile: { nickname: '测试旅人', uid: '123456789', closing: '愿此行，终抵群星！', boundaries: '拒所有 CP' } });
  const pdf = await currentPDF(page);
  expect(pdf.name).toBe('trailblazer-strip-dark.pdf');
  await writeFile(testInfo.outputPath('uid-footer.pdf'), pdf.bytes);
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

test('long content expands the standard strip and blank optional groups collapse', async ({ page }, testInfo) => {
  await start(page);
  const standard = await currentPDF(page);
  await fill(page, 'fandoms', Array.from({ length: 35 }, (_, index) => `第${index + 1}项：喜欢的游戏与动画作品，记录共同的话题。`).join('\n'));
  await ready(page);
  const long = await currentPDF(page);
  expect(long.height).toBeGreaterThan(300);
  expect(long.height).toBeGreaterThan(standard.height * 1.5);
  await expect(page.locator('#export-note')).toContainText('长条');
  const png = await exportFile(page, '#download-png');
  await writeFile(testInfo.outputPath('strip-long.png'), png.bytes);
  await preset(page, 'short');
  const short = await currentPDF(page);
  expect(short.height).toBeLessThan(150);
  expect(short.height).toBeLessThan(standard.height);
  await page.locator('#auto-preview').uncheck();
  for (const key of ['fandoms', 'favorites', 'boundaries', 'other']) await fill(page, key, '');
  await page.locator('#refresh').click();
  await ready(page);
  const minimal = await currentPDF(page);
  expect(minimal.height).toBeLessThan(short.height - 20);
  const draft = await savedDraft(page);
  expect(draft.profile.fandoms).toBe('');
  expect(draft.profile.other).toBe('');
});

test('late compilation cannot restore stale exports after rapid edits', async ({ page }) => {
  await start(page);
  await page.locator('#auto-preview').uncheck();
  await page.evaluate(() => { window.__holdNextResult = true; });
  await fill(page, 'nickname', '旧版名字');
  await page.locator('#refresh').click();
  await page.waitForFunction(() => window.__resultHeld);
  await fill(page, 'nickname', '最终版名字');
  await fill(page, 'boundaries', '拒所有 CP');
  await page.locator('[data-theme="dark"]').click();
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await expect(page.locator('#download-png')).toBeDisabled();
  await page.locator('#refresh').click();
  await page.evaluate(() => window.__releaseResult());
  await ready(page);
  expect(await page.evaluate(() => window.__lastCompilation.request)).toMatchObject({
    kind: 'strip', theme: 'dark', profile: { nickname: '最终版名字', boundaries: '拒所有 CP' },
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

test('multiple QR components retain their identity through sorting, removal and draft round-trip', async ({ page }, testInfo) => {
  await start(page);
  const portrait = await uploadFixture(page, '#e43131', 'sample-portrait.png');
  const qqQR = await uploadFixture(page, '#2534f0', 'qq-qr.png');
  const wechatQR = await uploadFixture(page, '#25ad37', 'wechat-qr.png');
  await page.locator('#upload-portrait').setInputFiles(portrait);
  await ready(page);
  await fill(page, 'contacts.0.account', 'QQ-account');
  await fill(page, 'contacts.1.account', 'wechat-account');
  const ids = await page.locator('.contact-item').evaluateAll((items) => items.map((item) => item.dataset.contactId));
  for (const [id, fixture] of [[ids[0], qqQR], [ids[1], wechatQR]]) {
    await page.locator(`#upload-contact-${id}`).setInputFiles(fixture);
    await expect(page.locator(`.contact-item[data-contact-id="${id}"]`)).toContainText(fixture.name);
    await ready(page);
  }
  // Verify both uploads are in the actual rendered SVG, not just the form model.
  const svg = await page.locator('#preview-image').evaluate(async (img) => (await fetch(img.src)).text());
  expect(svg).toContain(qqQR.buffer.toString('base64'));
  expect(svg).toContain(wechatQR.buffer.toString('base64'));
  await page.locator('[data-add-contact="小红书"]').click();
  await fill(page, 'contacts.2.account', 'redbook-account');
  await (await input(page, 'contacts.2.show_qr')).uncheck();
  await page.locator(`[data-contact-action="up"][data-contact-id="${ids[1]}"]`).click();
  await expect(page.locator('[data-path="contacts.0.account"]')).toHaveValue('wechat-account');
  await expect(page.locator('[data-path="contacts.1.account"]')).toHaveValue('QQ-account');
  await ready(page);
  const exported = await exportFile(page, '#save-draft');
  const draft = JSON.parse(exported.bytes.toString());
  expect(draft.version).toBe(2);
  expect(draft.images.portrait.base64).toBe(portrait.buffer.toString('base64'));
  expect(draft.images[`contact-${ids[0]}`].base64).toBe(qqQR.buffer.toString('base64'));
  expect(draft.images[`contact-${ids[1]}`].base64).toBe(wechatQR.buffer.toString('base64'));
  expect(draft.profile.contacts.map((contact) => contact.account)).toEqual(['wechat-account', 'QQ-account', 'redbook-account']);
  const pdf = await currentPDF(page);
  await writeFile(testInfo.outputPath('multi-contact.pdf'), pdf.bytes);
  await writeFile(testInfo.outputPath('multi-contact.png'), (await exportFile(page, '#download-png')).bytes);
  await page.locator('[data-kind="resume"]').click();
  await ready(page);
  expect((await savedDraft(page)).images).toEqual({});
  await page.locator('[data-kind="strip"]').click();
  await ready(page);
  expect((await savedDraft(page)).images).toEqual(draft.images);
  await preset(page, 'short');
  expect((await savedDraft(page)).images).toEqual({});
  await page.locator('#draft-file').setInputFiles({ name: 'restored-draft.json', mimeType: 'application/json', buffer: exported.bytes });
  await expect(page.locator('[data-path="contacts.0.account"]')).toHaveValue('wechat-account');
  await ready(page);
  const restored = await savedDraft(page);
  expect(restored.profile).toEqual(draft.profile);
  expect(restored.images).toEqual(draft.images);
  // Removing one component must remove only its own image.
  await (await input(page, 'contacts.1.account')).focus();
  await page.locator(`[data-contact-action="remove"][data-contact-id="${ids[0]}"]`).click();
  await ready(page);
  const removed = await savedDraft(page);
  expect(removed.profile.contacts.map((contact) => contact.account)).toEqual(['wechat-account', 'redbook-account']);
  expect(removed.images[`contact-${ids[0]}`]).toBeUndefined();
  expect(removed.images[`contact-${ids[1]}`]).toEqual(draft.images[`contact-${ids[1]}`]);
  await page.locator('#draft-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
  await expect(page.locator('#status')).toContainText('导入失败');
  expect((await savedDraft(page)).images).toEqual(removed.images);
});

test('old drafts migrate all personal content and their QR into the new structure', async ({ page }) => {
  await start(page);
  const qr = await uploadFixture(page, '#713ada', 'legacy-qr.png');
  const old = {
    version: 1, kind: 'strip', theme: 'dark',
    profile: { nickname: '旧版旅人', intro: '慢热但喜欢聊天', location: '上海', fandoms: '星穹铁道', favorites: '开拓者', interests: '音乐', looking_for: '同好朋友', cp: '拒所有 CP', boundaries: '不催回', preferences: '偶尔发日常', event: '漫展见', message: '欢迎扩列', contact_platform: 'QQ', contact: 'legacy-account', contact_note: '加好友备注漫展', uid: '123456789', closing: '旧版自定义尾句不应显示', show_qr: true, qr_image: null },
    images: { qr_image: { name: qr.name, base64: qr.buffer.toString('base64') } },
  };
  await page.locator('#draft-file').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) });
  await expect(page.locator('[data-path="nickname"]')).toHaveValue('旧版旅人');
  await ready(page);
  const migrated = await savedDraft(page);
  const paragraphs = (value) => Array.isArray(value) ? value.join('\n') : value;
  expect(paragraphs(migrated.profile.about_me)).toContain('慢热但喜欢聊天');
  expect(paragraphs(migrated.profile.about_me)).toContain('上海');
  for (const value of ['音乐', '同好朋友', '拒所有 CP', '偶尔发日常', '漫展见', '欢迎扩列']) expect(paragraphs(migrated.profile.other)).toContain(value);
  expect(migrated.profile.contacts[0]).toMatchObject({ platform: 'QQ', account: 'legacy-account', note: '加好友备注漫展', show_qr: true });
  expect(migrated.profile.uid).toBe('123456789');
  expect(migrated.profile.contacts).toHaveLength(1);
  expect(migrated.profile.closing).toBe('愿此行，终抵群星！');
  expect(migrated.images[`contact-${migrated.profile.contacts[0].id}`].base64).toBe(qr.buffer.toString('base64'));
  const svg = await page.locator('#preview-image').evaluate(async (img) => (await fetch(img.src)).text());
  expect(svg).toContain(qr.buffer.toString('base64'));
  await currentPDF(page);
  // Explicit empty new fields must not be repopulated by legacy data.
  old.profile = { ...old.profile, about_me: '', other: '', contacts: [] };
  await page.locator('#draft-file').setInputFiles({ name: 'explicit-empty.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) });
  await expect(page.locator('[data-path="about_me"]')).toHaveValue('');
  await ready(page);
  const empty = await savedDraft(page);
  expect(empty.profile.contacts).toEqual([]);
  expect(empty.profile.other).toBe('');
  expect(empty.images).toEqual({});
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

test('deleting a contact while its QR is loading cannot restore the removed image', async ({ page }) => {
  await page.addInitScript(() => {
    const native = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function (...args) {
      if (this.name !== 'delayed-contact.png') return native.apply(this, args);
      return new Promise((resolve, reject) => {
        window.__finishContactRead = () => native.apply(this, args).then(resolve, reject);
      });
    };
  });
  await start(page);
  await fill(page, 'contacts.0.account', 'deleted-account');
  const id = await page.locator('.contact-item').first().getAttribute('data-contact-id');
  await page.locator(`#upload-contact-${id}`).setInputFiles(await uploadFixture(page, '#a34a61', 'delayed-contact.png'));
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await page.locator(`[data-contact-action="remove"][data-contact-id="${id}"]`).click();
  await page.evaluate(() => window.__finishContactRead());
  await ready(page);
  const draft = await savedDraft(page);
  expect(draft.profile.contacts.some((contact) => contact.id === id)).toBe(false);
  expect(draft.images[`contact-${id}`]).toBeUndefined();
  await currentPDF(page);
});

test('hiding a QR while it loads preserves the latest choice after reordering', async ({ page }) => {
  await page.addInitScript(() => {
    const native = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function (...args) {
      if (this.name !== 'hidden-contact.png') return native.apply(this, args);
      return new Promise((resolve, reject) => {
        window.__finishHiddenRead = () => native.apply(this, args).then(resolve, reject);
      });
    };
  });
  await start(page);
  await fill(page, 'contacts.0.account', 'hidden-QR-account');
  const id = await page.locator('.contact-item').first().getAttribute('data-contact-id');
  const qr = await uploadFixture(page, '#a16e24', 'hidden-contact.png');
  await (await input(page, 'contacts.0.show_qr')).uncheck();
  await page.locator(`#upload-contact-${id}`).setInputFiles(qr);
  await expect(page.locator('[data-path="contacts.0.show_qr"]')).toBeChecked();
  await (await input(page, 'contacts.0.show_qr')).uncheck();
  await page.locator(`[data-contact-action="down"][data-contact-id="${id}"]`).click();
  await page.evaluate(() => window.__finishHiddenRead());
  await ready(page);
  await expect(page.locator('[data-path="contacts.1.show_qr"]')).not.toBeChecked();
  const draft = await savedDraft(page);
  expect(draft.profile.contacts[1]).toMatchObject({ id, account: 'hidden-QR-account', show_qr: false });
  expect(draft.images[`contact-${id}`].base64).toBe(qr.buffer.toString('base64'));
  const svg = await page.locator('#preview-image').evaluate(async (img) => (await fetch(img.src)).text());
  expect(svg).not.toContain(qr.buffer.toString('base64'));
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

test('first preview only downloads compact fonts and reload reuses their local cache', async ({ page }) => {
  const fontRequests = [];
  const fontResponses = [];
  page.on('request', (request) => { if (request.url().includes('/fonts/')) fontRequests.push(request.url()); });
  page.on('response', (response) => { if (response.url().includes('/fonts/')) fontResponses.push(response); });
  await start(page);
  expect(fontRequests).toHaveLength(2);
  expect(fontRequests.every((url) => /-common-.*\.gz$/.test(url))).toBe(true);
  // response.body() is already decompressed by browsers when the server marks
  // .gz files with Content-Encoding. Content-Length measures the download.
  const bytes = fontResponses.reduce((sum, response) => sum + Number(response.headers()['content-length']), 0);
  expect(bytes).toBeGreaterThan(0);
  expect(bytes).toBeLessThan(8_000_000);
  // CacheStorage must work even when a new network font request would fail.
  await page.route('**/fonts/**', (route) => route.abort());
  fontRequests.length = 0;
  await page.reload();
  await ready(page);
  expect(fontRequests).toEqual([]);
  await currentPDF(page);
});

test('rare characters load complete fonts on demand and failed upgrades can be retried', async ({ page }, testInfo) => {
  const fullRequests = [];
  page.on('request', (request) => { if (request.url().includes('-full-')) fullRequests.push(request.url()); });
  await start(page);
  const originalName = await page.locator('[data-path="nickname"]').inputValue();
  const originalOther = await (await input(page, 'other')).inputValue();
  // Normalize the textarea representation before comparing identical content.
  await fill(page, 'other', originalOther);
  await ready(page);
  const baseline = await exportFile(page, '#download-png');
  // This supplementary-plane character exists only in the original serif font,
  // so body fallback must still work even though the body normally uses sans.
  await fill(page, 'other', '𠮷（生僻字测试）');
  await ready(page);
  expect(fullRequests).toHaveLength(1);
  expect(fullRequests[0]).toContain('/serif-full-');
  await writeFile(testInfo.outputPath('rare-body.pdf'), (await currentPDF(page)).bytes);
  await fill(page, 'other', originalOther);
  await ready(page);
  await page.route('**/fonts/sans-full-*', (route) => route.abort());
  await fill(page, 'nickname', '龘');
  await expect(page.locator('#status')).toHaveClass(/error/);
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await page.unroute('**/fonts/sans-full-*');
  await page.locator('#refresh').click();
  await ready(page);
  await writeFile(testInfo.outputPath('rare-name.pdf'), (await currentPDF(page)).bytes);
  await fill(page, 'nickname', originalName);
  await ready(page);
  // Restoring the same content must produce the same pixels with full/subset fonts.
  const restored = await exportFile(page, '#download-png');
  expect(createHash('sha256').update(restored.bytes).digest('hex')).toBe(createHash('sha256').update(baseline.bytes).digest('hex'));
});
