import { createTypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { createTypstRenderer } from '@myriaddreamin/typst.ts/renderer';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import compilerWasmURL from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasmURL from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import { contactImageKey, normalizeStripProfile, stripImageKeys } from './strip-profile.js';

// JS wrappers and both WASM packages are pinned together in package-lock.json.
const VERSION = '0.8.0-rc3';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const resources = new Map();
const templateFiles = {
  strip: [
    'main.typ', 'components/strip.typ', 'config/themes.typ',
    'assets/stelle-id.png', 'assets/express-ticket-redrawn.png',
  ],
  resume: [
    'main.typ', 'template.typ', 'assets/frame.svg',
    'assets/stelle-id.png', 'assets/express-ticket-redrawn.png',
  ],
};

let compiler;
let renderer;
let baseURL;
let initialized = false;
let queue = Promise.resolve();

function progress(id, message) {
  self.postMessage({ type: 'progress', id, message });
}

function resourceURL(path) {
  return new URL(path, baseURL).href;
}

async function readResource(path, cache = true) {
  const url = resourceURL(path);
  if (cache && resources.has(url)) return resources.get(url);
  const loading = (async () => {
    let response;
    try {
      response = await fetch(url, {
        credentials: 'same-origin',
        // Revalidate templates after a site update; fonts retain normal caching.
        cache: path.startsWith('templates/') ? 'no-cache' : 'default',
      });
    } catch {
      throw new Error(`无法加载 ${path}，请检查网络后重试。`);
    }
    if (!response.ok) throw new Error(`无法加载 ${path}（HTTP ${response.status}）。`);
    return new Uint8Array(await response.arrayBuffer());
  })();
  if (cache) resources.set(url, loading);
  try {
    return await loading;
  } catch (error) {
    resources.delete(url);
    throw error;
  }
}

async function initialize(message) {
  const requestedURL = new URL(message.baseURL, self.location.href);
  if (requestedURL.origin !== self.location.origin) {
    throw new Error('模板与字体必须从当前网站加载。');
  }
  if (!requestedURL.pathname.endsWith('/')) requestedURL.pathname += '/';
  if (initialized) {
    if (baseURL !== requestedURL.href) throw new Error('编译器资源目录不能在运行中更改。');
    return;
  }
  baseURL = requestedURL.href;
  progress(message.id, '正在加载中文字体，首次打开需要稍等…');
  const fonts = await Promise.all([
    readResource('fonts/NotoSansSC.ttf', false),
    readResource('fonts/NotoSerifCJKsc-Bold.otf', false),
  ]);
  progress(message.id, '正在初始化本地排版引擎…');
  compiler = createTypstCompiler();
  renderer = createTypstRenderer();
  await Promise.all([
    compiler.init({
      getModule: () => compilerWasmURL,
      // Explicit false also prevents typst.ts from adding its default CDN fonts.
      beforeBuild: [loadFonts(fonts, { assets: false })],
    }),
    renderer.init({ getModule: () => rendererWasmURL }),
  ]);
  initialized = true;
}

function diagnosticsText(diagnostics = []) {
  return diagnostics.slice(0, 8).map((entry) => {
    if (typeof entry === 'string') return entry;
    const position = [entry.path, entry.range].filter(Boolean).join(':');
    return `${position ? `${position}: ` : ''}${entry.message || '未知排版错误'}`;
  }).join('\n');
}

function validateRequest(payload) {
  if (!payload || !['resume', 'strip'].includes(payload.kind)) {
    throw new Error('请选择简历或扩列条模板。');
  }
  if (!['dark', 'light'].includes(payload.theme)) throw new Error('请选择深色或浅色主题。');
  if (!payload.profile || typeof payload.profile !== 'object' || Array.isArray(payload.profile)) {
    throw new Error('填写内容格式不正确。');
  }
}

function mapUserImages(kind, profile, images = {}) {
  if (!images || typeof images !== 'object' || Array.isArray(images)) {
    throw new Error('上传图片格式不正确。');
  }
  const allowed = new Set(kind === 'strip' ? stripImageKeys(profile) : ['portrait']);
  if (Object.keys(images).some((key) => !allowed.has(key))) {
    throw new Error('上传图片对应的联系方式已移除或无效，请重新选择图片。');
  }
  // Browser requests never load caller-supplied paths. Only bundled/uploaded bytes
  // are mapped into this fresh virtual root; native JSON paths remain supported elsewhere.
  profile.portrait = 'assets/stelle-id.png';
  if (kind === 'strip') {
    for (const entry of profile.contacts) entry.qr_image = null;
  }
  for (const field of allowed) {
    const image = Object.prototype.hasOwnProperty.call(images, field) ? images[field] : undefined;
    if (!image) continue;
    if (!(image.data instanceof Uint8Array) || image.data.byteLength === 0) {
      throw new Error(`${field === 'portrait' ? '头像' : '二维码'}文件内容为空。`);
    }
    if (!['png', 'jpg'].includes(image.extension)) {
      throw new Error('上传图片请选择 PNG 或 JPG 格式。');
    }
    const path = `assets/upload-${field}.${image.extension}`;
    compiler.mapShadow(`/${path}`, image.data);
    if (field === 'portrait') profile.portrait = path;
    else {
      const entry = profile.contacts.find((item) => contactImageKey(item.id) === field);
      entry.qr_image = path;
    }
  }
}

async function compile(message) {
  if (!initialized) throw new Error('排版引擎尚未初始化，请刷新后重试。');
  const { payload, id } = message;
  validateRequest(payload);
  const { kind, theme } = payload;
  const folder = kind === 'strip' ? 'strip' : `resume-${theme}`;
  progress(id, '正在加载模板…');
  const files = await Promise.all(templateFiles[kind].map(async (path) => [
    path, await readResource(`templates/${folder}/${path}`),
  ]));

  // Every template gets its own virtual root. No path from a previous request survives.
  await compiler.reset();
  compiler.resetShadow();
  for (const [path, contents] of files) {
    if (path.endsWith('.typ')) compiler.addSource(`/${path}`, decoder.decode(contents));
    else compiler.mapShadow(`/${path}`, contents);
  }
  const profile = kind === 'strip' ? normalizeStripProfile(payload.profile)
    : structuredClone(payload.profile);
  mapUserImages(kind, profile, payload.images);
  compiler.mapShadow('/config/profile.json', encoder.encode(JSON.stringify(profile)));

  progress(id, '正在排版并生成 PDF…');
  // One snapshot serves both exports. Returning diagnostics rather than throwing inside
  // this callback lets the library release its WASM world on invalid user input too.
  const artifacts = await compiler.runWithWorld({
    mainFilePath: '/main.typ', root: '/',
    inputs: { theme, profile: 'config/profile.json' },
  }, async (world) => {
    try {
      const layout = await world.compile({ diagnostics: 'full' });
      if (layout.hasError) return { error: diagnosticsText(layout.diagnostics) };
      const vector = await world.vector({ diagnostics: 'full' });
      if (!vector.result?.byteLength) return { error: diagnosticsText(vector.diagnostics) };
      const pdf = await world.pdf({ diagnostics: 'full' });
      if (!pdf.result?.byteLength) return { error: diagnosticsText(pdf.diagnostics) };
      return { vector: vector.result, pdf: pdf.result };
    } catch (error) {
      // Upstream runWithWorld does not free its snapshot when this callback rejects.
      return { error: error?.message || String(error) };
    }
  });
  if ('error' in artifacts) {
    throw new Error(`排版失败，请检查填写内容：\n${artifacts.error || '未生成有效文档。'}`);
  }

  progress(id, '正在生成预览…');
  const renderedSVG = await renderer.runWithSession({
    format: 'vector', artifactContent: artifacts.vector,
  }, async (session) => {
    const pages = session.retrievePagesInfo();
    if (pages.length !== 1) {
      throw new Error(`当前内容排成了 ${pages.length} 页，请精简内容后重试。`);
    }
    return renderer.renderSvg({
      renderSession: session,
      // Static previews must also be valid standalone SVG for PNG export.
      data_selection: { body: true, defs: true, css: true, js: false },
    });
  });
  // These invisible HTML text-selection overlays taint a canvas drawn from an SVG
  // image in Chrome. Visible text is already included as vector glyphs.
  const svg = renderedSVG.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '');
  if (typeof svg !== 'string' || !svg.includes('<svg')) throw new Error('预览生成失败，请重试。');
  // Copy before transfer: never detach a buffer owned by the WASM engine.
  const pdf = new Uint8Array(artifacts.pdf);
  self.postMessage({ type: 'result', id, svg, pdf }, [pdf.buffer]);
}

async function handle(message) {
  try {
    if (message.type === 'init') {
      await initialize(message);
      self.postMessage({ type: 'ready', id: message.id, version: VERSION });
    } else if (message.type === 'compile') {
      await compile(message);
    } else {
      throw new Error('无法识别排版请求，请刷新页面。');
    }
  } catch (error) {
    self.postMessage({
      type: 'error', id: message.id,
      error: { name: error?.name || 'Error', message: error?.message || String(error) },
    });
  }
}

// A WASM compiler owns mutable file and input state; never run requests concurrently.
self.addEventListener('message', ({ data }) => {
  queue = queue.then(() => handle(data));
});
