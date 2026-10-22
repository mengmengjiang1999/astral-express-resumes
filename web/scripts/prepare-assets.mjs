import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
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
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Copied the original templates, presets, images and licensed fonts.');
