#!/usr/bin/env python3
"""Build both editable strip themes, PNG exports, and a two-page A4 cut sheet."""

import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import typst
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("dark", "light")
TEXT_FIELDS = (
    "nickname", "about_me", "location", "tagline", "favorites", "fandoms",
    "same_fans", "looking_for", "cp", "boundaries", "preferences", "contact_platform", "contact", "uid",
    "contact_note", "closing", "event", "message",
)
STRIP_WIDTH = 80 * mm
STRIP_HEIGHT = 180 * mm


def normalized(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value))


def project_file(value, label):
    """Resolve an existing file without allowing absolute or escaping paths."""
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label} 必须是非空的项目内相对路径")
    relative = Path(value)
    if relative.is_absolute():
        raise ValueError(f"{label} 不能使用绝对路径")
    path = (ROOT / relative).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError as error:
        raise ValueError(f"{label} 必须位于项目目录内") from error
    if not path.is_file():
        raise ValueError(f"{label} 指向的文件不存在：{value}")
    return path


def load_profile(relative):
    source = project_file(relative, "--profile")
    try:
        profile = json.loads(source.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError(f"资料配置必须是有效的 UTF-8 JSON：{error}") from error
    if not isinstance(profile, dict):
        raise ValueError("资料配置必须是 JSON 对象")
    for field in TEXT_FIELDS:
        if field not in profile or not isinstance(profile[field], str):
            raise ValueError(f"资料字段 {field} 必须存在且为字符串；不填时使用空字符串")
    nickname = profile["nickname"].strip()
    if not nickname:
        raise ValueError("nickname 不能为空")
    if len(nickname) > 8:
        raise ValueError("nickname 最多 8 个字符，请精简昵称后重新构建")
    project_file(profile.get("portrait"), "portrait")
    if "qr_image" not in profile:
        raise ValueError("缺少 qr_image 字段；未设置二维码时使用 null")
    if profile["qr_image"] is not None:
        project_file(profile["qr_image"], "qr_image")
    return source, profile


def validate_strip(data, profile, theme):
    reader = PdfReader(io.BytesIO(data))
    if len(reader.pages) != 1:
        raise ValueError(f"{theme} 产生了 {len(reader.pages)} 页；请精简资料，未覆盖成品")
    page = reader.pages[0]
    if (abs(float(page.mediabox.width) - STRIP_WIDTH) > 0.1
            or abs(float(page.mediabox.height) - STRIP_HEIGHT) > 0.1):
        raise ValueError(f"{theme} 成品尺寸不是 80 × 180 mm，未覆盖成品")
    text = normalized(page.extract_text() or "")
    for field, value in profile.items():
        if field in ("portrait", "qr_image") or not isinstance(value, str):
            continue
        expected = normalized(value)
        if expected and expected not in text:
            raise ValueError(f"{theme} 的 {field} 内容未完整出现在 PDF 中，未覆盖成品")


def crop_marks(sheet, x, y):
    """Crop ticks stay outside the finished 80 × 180 mm strip."""
    gap, length = 1 * mm, 3 * mm
    sheet.setStrokeColorRGB(0.36, 0.36, 0.36)
    sheet.setLineWidth(0.35)
    for edge_x in (x, x + STRIP_WIDTH):
        for edge_y in (y, y + STRIP_HEIGHT):
            direction_x = -1 if edge_x == x else 1
            direction_y = -1 if edge_y == y else 1
            sheet.line(edge_x + direction_x * gap, edge_y,
                       edge_x + direction_x * (gap + length), edge_y)
            sheet.line(edge_x, edge_y + direction_y * gap,
                       edge_x, edge_y + direction_y * (gap + length))


def make_print_sheet(pdfs, target, profile):
    """Place two vector copies per A4 page, without scaling or rasterization."""
    pdfmetrics.registerFont(TTFont("StripSans", str(ROOT / "assets/fonts/NotoSansSC.ttf")))
    base = io.BytesIO()
    sheet = canvas.Canvas(base, pagesize=A4, pageCompression=1)
    y = 58.5 * mm
    positions = (20 * mm, 110 * mm)
    for theme in THEMES:
        sheet.setFillColorRGB(1, 1, 1)
        sheet.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        sheet.setFillColorRGB(0.35, 0.35, 0.35)
        sheet.setFont("StripSans", 9)
        sheet.drawCentredString(A4[0] / 2, 267 * mm,
                                f"{theme.upper()} / Print at 100% (80 x 180 mm)")
        for x in positions:
            crop_marks(sheet, x, y)
        sheet.showPage()
    sheet.save()
    base.seek(0)
    reader = PdfReader(base)
    writer = PdfWriter()
    for index, theme in enumerate(THEMES):
        page = reader.pages[index]
        strip = PdfReader(io.BytesIO(pdfs[theme])).pages[0]
        for x in positions:
            page.merge_transformed_page(strip, Transformation().translate(tx=x, ty=y))
        writer.add_page(page)
    writer.add_metadata({"/Title": "Trailblazer social strips - A4 cut sheet"})
    with target.open("wb") as handle:
        writer.write(handle)
    check = PdfReader(target)
    if len(check.pages) != 2:
        raise ValueError("A4 拼版页数异常，未覆盖成品")
    for page in check.pages:
        if (abs(float(page.mediabox.width) - A4[0]) > 0.1
                or abs(float(page.mediabox.height) - A4[1]) > 0.1):
            raise ValueError("A4 拼版尺寸异常，未覆盖成品")
        if normalized(page.extract_text() or "").count(normalized(profile["nickname"])) < 2:
            raise ValueError("A4 拼版未保留两份完整条目，未覆盖成品")


def publish(source, destination):
    """Replace a final file only after every staged output has passed validation."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as handle:
            temporary = Path(handle.name)
            with source.open("rb") as original:
                shutil.copyfileobj(original, handle)
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def make_comparison(pdfs, target):
    """Side-by-side proof used only to render the two-theme PNG preview."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=172 * mm, height=188 * mm)
    for theme, x in zip(THEMES, (4 * mm, 88 * mm)):
        source = PdfReader(io.BytesIO(pdfs[theme])).pages[0]
        page.merge_transformed_page(source, Transformation().translate(tx=x, ty=4 * mm))
    with target.open("wb") as handle:
        writer.write(handle)


def build(profile_path):
    source, profile = load_profile(profile_path)
    fonts = ROOT / "assets/fonts"
    if not fonts.is_dir() or not any(fonts.glob("*.ttf")):
        raise ValueError("缺少 assets/fonts 中的随包字体")
    renderer = shutil.which("pdftoppm")
    if renderer is None:
        raise ValueError("需要 Poppler 的 pdftoppm 导出预览；安装后重新运行，未覆盖成品")
    if not (ROOT / "main.typ").is_file():
        raise ValueError("缺少 main.typ 排版入口")
    with tempfile.TemporaryDirectory(prefix="trailblazer-strip-") as temporary:
        staging = Path(temporary)
        pdfs = {}
        outputs = []
        for theme in THEMES:
            pdf = typst.compile(
                str(ROOT / "main.typ"), root=str(ROOT),
                font_paths=[str(fonts)], ignore_system_fonts=True,
                sys_inputs={"theme": theme, "profile": source.relative_to(ROOT).as_posix()},
            )
            validate_strip(pdf, profile, theme)
            pdfs[theme] = pdf
            stem = f"trailblazer-strip-{theme}"
            draft = staging / f"{stem}.pdf"
            draft.write_bytes(pdf)
            outputs.append((draft, ROOT / "output/pdf" / draft.name))
            for dpi, suffix in ((180, "preview"), (600, "600dpi")):
                image_stem = staging / f"{stem}-{suffix}"
                subprocess.run([renderer, "-r", str(dpi), "-png", "-singlefile",
                                str(draft), str(image_stem)], check=True)
                image = image_stem.with_suffix(".png")
                if not image.is_file() or image.stat().st_size == 0:
                    raise ValueError(f"{theme} 的 {suffix} 图片导出失败，未覆盖成品")
                outputs.append((image, ROOT / "output/images" / image.name))
        print_sheet = staging / "trailblazer-strip-a4-print.pdf"
        make_print_sheet(pdfs, print_sheet, profile)
        outputs.append((print_sheet, ROOT / "output/pdf" / print_sheet.name))
        comparison = staging / "comparison.pdf"
        make_comparison(pdfs, comparison)
        comparison_image = staging / "trailblazer-strip-comparison"
        subprocess.run([renderer, "-r", "180", "-png", "-singlefile",
                        str(comparison), str(comparison_image)], check=True)
        outputs.append((comparison_image.with_suffix(".png"),
                        ROOT / "output/images/trailblazer-strip-comparison.png"))
        for original, destination in outputs:
            publish(original, destination)
    print("PASS: 深浅两版均为单页 80 × 180 mm，所有非空资料字段完整；已生成 180/600 dpi PNG。")
    print("PASS: A4 拼版共两页，每页两张同色扩列条，保持原尺寸；打印请选择 100% / 实际大小。")
    print(ROOT / "output")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", default="config/profile.json",
                        help="项目内的资料 JSON 相对路径（默认：config/profile.json）")
    args = parser.parse_args()
    try:
        build(args.profile)
    except Exception as error:
        print(f"构建失败：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
