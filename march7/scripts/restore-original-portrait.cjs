// Composite only the caption repair over the decoded original; never resample the original.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
async function main() {
  const width = 522, height = 676;
  const original = await sharp(path.join(root, 'assets/march7-user-portraits.jpg'))
    .extract({left: 548, top: 22, width, height}).removeAlpha().raw().toBuffer();
  const repair = await sharp(path.join(root, 'assets/reference/march7-caption-repair.png'))
    .resize(150, 66, {fit: 'fill'}).removeAlpha().raw().toBuffer();
  const seed = new Uint8Array(width * height);
  // White caption plus antialiasing, restricted to the original bottom-left text.
  const box = {left: 8, top: 649, right: 103, bottom: 668};
  for (let y = 651; y < 666; y++) for (let x = 10; x < 101; x++) {
    const i = (y * width + x) * 3;
    const rgb = original.subarray(i, i + 3);
    if (Math.min(...rgb) > 175 && Math.max(...rgb) - Math.min(...rgb) < 55) seed[y * width + x] = 1;
  }
  const mask = new Uint8Array(width * height);
  for (let y = box.top; y < box.bottom; y++) for (let x = box.left; x < box.right; x++) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (seed[(y + dy) * width + x + dx]) mask[y * width + x] = 255;
    }
  }
  const output = Buffer.from(original);
  let changed = 0;
  for (let y = box.top; y < box.bottom; y++) for (let x = box.left; x < box.right; x++) {
    if (!mask[y * width + x]) continue;
    const dst = (y * width + x) * 3, src = ((y - 610) * 150 + x) * 3;
    repair.copy(output, dst, src, src + 3);
  }
  const outputPath = path.join(root, 'assets/march7-portrait-clean.png');
  await sharp(output, {raw: {width, height, channels: 3}}).png().toFile(outputPath);
  await sharp(Buffer.from(mask), {raw: {width, height, channels: 1}}).png()
    .toFile(path.join(root, 'assets/reference/march7-caption-mask.png'));
  const verified = await sharp(outputPath).removeAlpha().raw().toBuffer();
  let outsideDifferences = 0, insidePixels = 0;
  for (let p = 0; p < mask.length; p++) {
    if (mask[p]) insidePixels++;
    const differs = [0, 1, 2].some(c => verified[p * 3 + c] !== original[p * 3 + c]);
    if (differs) { changed++; if (!mask[p]) outsideDifferences++; }
  }
  if (outsideDifferences) throw new Error('Unexpected pixel changes outside caption mask');
  const report = {width, height, captionBounds: box, maskPixels: insidePixels,
    changedPixels: changed, outsideMaskChangedPixels: outsideDifferences,
    originalSource: 'assets/march7-user-portraits.jpg', originalCrop: {x:548,y:22,width,height}};
  fs.writeFileSync(path.join(root, 'docs/portrait-pixel-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch(e => {console.error(e); process.exit(1);});
