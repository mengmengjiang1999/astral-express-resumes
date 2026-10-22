import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const web = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(web, '..');
const output = path.join(web, 'public');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
async function copy(from, to) {
  const destination = path.join(output, to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(repo, from), destination, { recursive: true });
}
for (const [source, target] of [['trailblazer', 'resume-dark'], ['trailblazer-light', 'resume-light']]) {
  for (const file of ['main.typ', 'template.typ', 'config/profile.json', 'assets/frame.svg', 'assets/stelle-id.png', 'assets/express-ticket-redrawn.png']) {
    await copy(`${source}/${file}`, `templates/${target}/${file}`);
  }
}
for (const file of ['main.typ', 'components/strip.typ', 'config/themes.typ', 'config/profile.json', 'config/examples/short.json', 'assets/stelle-id.png', 'assets/express-ticket-redrawn.png']) {
  await copy(`trailblazer-social-strip/${file}`, `templates/strip/${file}`);
}
await copy('trailblazer-social-strip/assets/fonts', 'fonts');
const fonts = JSON.parse(await readFile(path.join(web, 'font-assets/manifest.json'), 'utf8'));
for (const font of fonts.fonts) {
  await copy(`web/font-assets/${font.common.file}`, `fonts/${font.common.file}`);
  const raw = await readFile(path.join(repo, 'trailblazer-social-strip/assets/fonts', font.source));
  if (createHash('sha256').update(raw).digest('hex') !== font.full.sha256) {
    throw new Error('Original fonts changed: regenerate web subsets with scripts/subset-fonts.py.');
  }
  await writeFile(path.join(output, 'fonts', font.full.file), gzipSync(raw, { level: 9 }));
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Copied the original templates, presets, images and licensed fonts.');
