#!/usr/bin/env python3
"""Compile with bundled fonts; publish only a complete, single-page A4 PDF."""
import argparse
import io
import json
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path

import typst
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]


def normalized(text):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text))


def build(character_path, output, preview=False):
    source = (ROOT / character_path).resolve()
    relative = source.relative_to(ROOT).as_posix()
    character = json.loads(source.read_text(encoding="utf-8"))
    portrait = Path(character["portrait"])
    if portrait.is_absolute() or not (ROOT / portrait).is_file():
        raise ValueError("portrait 必须是存在的项目内相对路径")
    (ROOT / portrait).resolve().relative_to(ROOT)
    for item in character["projects"]:
        for field in ("duty", "outcome"):
            if len(re.findall(r"[。！？]", item[field])) != 1:
                raise ValueError(f"项目 {item['id']} 的 {field} 必须各为一句")

    pdf = typst.compile(
        str(ROOT / "main.typ"), root=str(ROOT),
        font_paths=[str(ROOT / "assets/fonts")], ignore_system_fonts=True,
        sys_inputs={"character": relative},
    )
    reader = PdfReader(io.BytesIO(pdf))
    if len(reader.pages) != 1:
        raise ValueError(f"排版产生 {len(reader.pages)} 页；请精简文案或调整主题间距，未覆盖成品")
    page = reader.pages[0]
    if abs(float(page.mediabox.width) - 595.276) > 1 or abs(float(page.mediabox.height) - 841.89) > 1:
        raise ValueError("成品不是 A4 尺寸")
    extracted = normalized(page.extract_text())
    required = [character[k] for k in ("name", "role", "summary", "closing")]
    required += [item["title"] for item in character["sections"].values()]
    for item in character["stack"] + character["abilities"]:
        required += [item["name"], item["detail"]]
    for item in character["projects"]:
        required += [item[k] for k in ("title", "duty", "outcome")]
    for text in required:
        if normalized(text) not in extracted:
            raise ValueError(f"PDF 文本检查失败：{text[:35]}")
    target = (ROOT / output).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(pdf)
    print(f"PASS: A4 / 1 page / all {len(required)} text fields present\n{target}")
    if preview:
        renderer = shutil.which("pdftoppm")
        if not renderer:
            raise SystemExit("PDF 已生成；预览需安装 Poppler 的 pdftoppm。")
        subprocess.run([renderer, "-r", "180", "-png", "-singlefile", str(target),
                        str(target.with_name(target.stem + "-preview"))], check=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--character", default="config/character.json")
    parser.add_argument("--output", default="output/pdf/march7-resume.pdf")
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    build(args.character, args.output, args.preview)
