import { createTypstFontBuilder } from '@myriaddreamin/typst.ts/compiler';
import manifest from '../font-assets/manifest.json';

const CACHE_NAME = 'astral-express-fonts-v1';

export class FontManager {
  constructor(baseURL, wasmURL) {
    this.baseURL = baseURL;
    this.wasmURL = wasmURL;
    this.fonts = manifest.fonts.map((font) => ({ ...font, extra: new Set(font.extraCharacters), fallback: new Set(font.fallbackCharacters), data: null, expanded: false }));
  }

  async load(font, variant) {
    const compressed = typeof DecompressionStream !== 'undefined';
    const entry = compressed ? font[variant] : font.full;
    const path = compressed ? `fonts/${entry.file}` : `fonts/${font.source}?v=${font.full.sha256}`;
    const url = new URL(path, this.baseURL).href;
    let cache;
    try { cache = await caches.open(CACHE_NAME); } catch { /* Private browsing/storage limits: use HTTP caching. */ }
    const decode = async (packed) => {
      const data = compressed && packed[0] === 0x1f && packed[1] === 0x8b
        ? new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
        : packed;
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== entry.sha256) throw new Error('字体文件校验失败，请重新生成预览。');
      return data;
    };
    try {
      const cached = await cache?.match(url);
      if (cached) return await decode(new Uint8Array(await cached.arrayBuffer()));
    } catch { try { await cache?.delete(url); } catch {} }
    const response = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    if (!response.ok) throw new Error(`字体加载失败（HTTP ${response.status}），请检查网络后重试。`);
    const packed = new Uint8Array(await response.arrayBuffer());
    const data = await decode(packed);
    try { await cache?.put(url, new Response(packed)); } catch { /* Caching is optional. */ }
    return data;
  }

  async loadCommon() {
    await Promise.all(this.fonts.map(async (font) => { font.data = await this.load(font, 'common'); }));
  }

  async install(compiler) {
    const builder = createTypstFontBuilder();
    await builder.init({ getModule: () => this.wasmURL });
    for (const font of this.fonts) await builder.addFontData(font.data);
    // Replace the resolver, so overlapping subset/full families never compete.
    await builder.build((resolver) => compiler.setFonts(resolver));
  }

  async ensure(compiler, kind, profile, templateText, onProgress) {
    const allText = JSON.stringify(profile) + templateText;
    const serifText = (kind === 'strip' ? profile.nickname : profile.name + profile.closing) + templateText;
    const needed = this.fonts.filter((font) => !font.expanded
      && ([...(font.key === 'serif' ? serifText : allText)].some((char) => font.extra.has(char))
        || [...allText].some((char) => font.fallback.has(char))));
    if (!needed.length) return;
    onProgress('正在补充生僻字字库，下载后会在本机缓存…');
    // Do not mark an upgrade complete until every download and font install succeeds.
    const data = await Promise.all(needed.map((font) => this.load(font, 'full')));
    const previous = needed.map((font) => font.data);
    needed.forEach((font, index) => { font.data = data[index]; });
    try {
      await this.install(compiler);
      needed.forEach((font) => { font.expanded = true; });
    } catch (error) {
      needed.forEach((font, index) => { font.data = previous[index]; });
      throw error;
    }
  }
}
