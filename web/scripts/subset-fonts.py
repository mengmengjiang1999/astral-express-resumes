"""Regenerate the checked-in web font subsets (fonttools==4.60.2).
Original desktop fonts stay untouched. Keep outlines, metrics and variable weights.
"""
import gzip, hashlib, io, json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

WEB = Path(__file__).resolve().parents[1]
ROOT = WEB.parent
SOURCE = ROOT / 'trailblazer-social-strip/assets/fonts'
OUT = WEB / 'font-assets'
OUT.mkdir(exist_ok=True)
characters = set(range(0x3400))  # Latin, punctuation, symbols and kana.
for lead in range(0xa1, 0xf8):
    for trail in range(0xa1, 0xff):
        try: characters.update(map(ord, bytes([lead, trail]).decode('gb2312')))
        except UnicodeDecodeError: pass
for folder in ['trailblazer', 'trailblazer-light', 'trailblazer-social-strip']:
    for pattern in ['*.typ', 'components/*.typ', 'config/*.json', 'config/examples/*.json']:
        for path in (ROOT / folder).glob(pattern): characters.update(map(ord, path.read_text()))
manifest = {'version': 1, 'fonts': []}
sans_characters = set(TTFont(SOURCE / 'NotoSansSC.ttf').getBestCmap())
for key, name in [('sans', 'NotoSansSC.ttf'), ('serif', 'NotoSerifCJKsc-Bold.otf')]:
    raw = (SOURCE / name).read_bytes()
    font = TTFont(io.BytesIO(raw), recalcTimestamp=False)
    original_cmap = font.getBestCmap()
    options = subset.Options()
    options.layout_features = ['*']
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    buf = io.BytesIO(); font.save(buf); data = buf.getvalue()
    digest = hashlib.sha256(data).hexdigest()
    full_digest = hashlib.sha256(raw).hexdigest()
    filename = f'{key}-common-{digest[:16]}{Path(name).suffix}.gz'
    packed = gzip.compress(data, compresslevel=9, mtime=0)
    (OUT / filename).write_bytes(packed)
    manifest['fonts'].append({
        'key': key, 'source': name,
        'common': {'file': filename, 'sha256': digest, 'bytes': len(packed)},
        'full': {'file': f'{key}-full-{full_digest[:16]}{Path(name).suffix}.gz', 'sha256': full_digest, 'bytes': len(gzip.compress(raw, mtime=0))},
        'extraCharacters': ''.join(map(chr, sorted(set(original_cmap) - set(font.getBestCmap())))),
        'fallbackCharacters': ''.join(map(chr, sorted(set(original_cmap) - sans_characters - set(font.getBestCmap())))) if key == 'serif' else '',
        'originalBytes': len(raw), 'commonCharacters': len(font.getBestCmap()),
    })
    print(f'{key}: {len(raw):,} original bytes -> {len(packed):,} first-load bytes; {len(font.getBestCmap())} characters')
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))+'\n')
keep = {font['common']['file'] for font in manifest['fonts']}
for path in OUT.glob('*.gz'):
    if path.name not in keep: path.unlink()
