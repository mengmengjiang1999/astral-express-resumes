#!/usr/bin/env python3
"""Build adaptive-height strip themes, PNG exports, and an A4 cut sheet when they fit."""

import argparse
import io
import json
import math
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
PARAGRAPH_FIELDS = frozenset((
    "about_me", "fandoms", "favorites", "boundaries", "other",
    # strip.typ migrates these only when their replacement field is absent.
    "interests", "cp", "looking_for", "preferences", "event", "message", "same_fans",
))
STRING_FIELDS = frozenset((
    "nickname", "tagline", "closing", "intro", "location", "call_me",
    "contact_platform", "contact", "contact_note", "uid",
))
ASSET_FIELDS = frozenset(("portrait", "qr_image"))
PROFILE_FIELDS = PARAGRAPH_FIELDS | STRING_FIELDS | ASSET_FIELDS | {"show_qr", "contacts"}
CONTACT_FIELDS = frozenset(("id", "platform", "account", "note", "show_qr", "qr_image"))
HIDDEN_FIELDS = ASSET_FIELDS | {"id", "show_qr"}
LEGACY_FALLBACK_FIELDS = {
    "about_me": frozenset(("intro", "location", "call_me")),
    "other": frozenset(("interests", "cp", "looking_for", "preferences", "event", "message", "same_fans")),
    "contacts": frozenset(("contact_platform", "contact", "contact_note")),
}
STRIP_WIDTH = 80 * mm
A4_MAX_HEIGHT = 267 * mm
PRINT_SHEET_NAME = "trailblazer-strip-a4-print.pdf"


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


def project_directory(value, label):
    """Resolve an output directory inside the project without creating it yet."""
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
    if path.exists() and not path.is_dir():
        raise ValueError(f"{label} 已存在且不是目录：{value}")
    return path


def load_profile(relative):
    source = project_file(relative, "--profile")
    try:
        profile = json.loads(source.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError(f"资料配置必须是有效的 UTF-8 JSON：{error}") from error
    if not isinstance(profile, dict):
        raise ValueError("资料配置必须是 JSON 对象")
    for field, value in profile.items():
        if field not in PROFILE_FIELDS:
            raise ValueError(f"未知资料字段 {field}，请检查拼写或将补充内容移到 other")
        if field in ASSET_FIELDS or field in ("show_qr", "contacts"):
            continue
        if field in PARAGRAPH_FIELDS and isinstance(value, list):
            if not all(isinstance(item, str) for item in value):
                raise ValueError(f"资料字段 {field} 的数组元素必须全为字符串，每项为一段")
        elif not isinstance(value, str):
            allowed = "字符串或字符串数组" if field in PARAGRAPH_FIELDS else "字符串"
            raise ValueError(f"资料字段 {field} 必须为{allowed}；不填时省略或使用空字符串")
    nickname = profile.get("nickname", "").strip()
    if not nickname:
        raise ValueError("nickname 不能为空")
    if len(nickname) > 24:
        raise ValueError("nickname 最多 24 个字符，请精简昵称后重新构建")
    if not isinstance(profile.get("show_qr", True), bool):
        raise ValueError("show_qr 必须为 true 或 false")
    project_file(profile.get("portrait", "assets/stelle-id.png"), "portrait")
    if profile.get("qr_image") is not None:
        project_file(profile["qr_image"], "qr_image")
    contacts = profile.get("contacts", [])
    if not isinstance(contacts, list):
        raise ValueError("contacts 必须为数组；不填写联系方式时省略或使用 []")
    if len(contacts) > 12:
        raise ValueError("contacts 最多填写 12 个联系方式")
    seen_ids = set()
    for index, contact in enumerate(contacts):
        label = f"contacts[{index}]"
        if not isinstance(contact, dict):
            raise ValueError(f"{label} 必须为联系方式对象")
        unknown = sorted(set(contact) - CONTACT_FIELDS)
        if unknown:
            raise ValueError(f"{label} 包含未知字段：{', '.join(unknown)}")
        contact_id = contact.get("id")
        if not isinstance(contact_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", contact_id):
            raise ValueError(f"{label}.id 必须是 1 至 64 字符且仅含 ASCII 字母、数字、下划线或连字符的字符串")
        if contact_id in seen_ids:
            raise ValueError(f"{label}.id 重复：{contact_id}；每个联系方式必须使用唯一 id")
        seen_ids.add(contact_id)
        for field in ("platform", "account", "note"):
            if not isinstance(contact.get(field, ""), str):
                raise ValueError(f"{label}.{field} 必须为字符串；不填时省略或使用空字符串")
        # Omitted show_qr follows qr_image in Typst; validate explicit overrides only.
        if "show_qr" in contact and not isinstance(contact["show_qr"], bool):
            raise ValueError(f"{label}.show_qr 必须为 true 或 false")
        if contact.get("qr_image") is not None:
            project_file(contact["qr_image"], f"{label}.qr_image")
    return source, profile


def actual_text(profile):
    """Check visible text, matching Typst's new-field-first legacy normalization."""
    def walk(value, label):
        if isinstance(value, dict):
            for field, child in value.items():
                if field not in HIDDEN_FIELDS:
                    yield from walk(child, f"{label}.{field}" if label else field)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                yield from walk(child, f"{label}[{index}]")
        elif isinstance(value, str) and normalized(value):
            yield label, normalized(value)

    ignored_legacy = {"closing"}
    for replacement, legacy_fields in LEGACY_FALLBACK_FIELDS.items():
        if replacement in profile:
            ignored_legacy.update(legacy_fields)
    for field, value in profile.items():
        if field not in HIDDEN_FIELDS and field not in ignored_legacy:
            yield from walk(value, field)


def validate_strip(data, profile, theme):
    reader = PdfReader(io.BytesIO(data))
    if len(reader.pages) != 1:
        raise ValueError(f"{theme} 产生了 {len(reader.pages)} 页；扩列条应随内容增长为单页，未覆盖成品")
    page = reader.pages[0]
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    if not math.isfinite(width) or abs(width - STRIP_WIDTH) > 0.1:
        raise ValueError(f"{theme} 成品宽度不是 80 mm，未覆盖成品")
    if not math.isfinite(height) or height <= 0:
        raise ValueError(f"{theme} 成品高度无效，未覆盖成品")
    text = normalized(page.extract_text() or "")
    for field, expected in actual_text(profile):
        if expected not in text:
            raise ValueError(f"{theme} 的 {field} 内容未完整出现在 PDF 中，未覆盖成品")
    return {"width_pt": width, "height_pt": height,
            "width_mm": round(width / mm, 3), "height_mm": round(height / mm, 3)}


def crop_marks(sheet, x, y, height):
    """Crop ticks stay outside the actual strip dimensions."""
    gap, length = 1 * mm, 3 * mm
    sheet.setStrokeColorRGB(0.36, 0.36, 0.36)
    sheet.setLineWidth(0.35)
    for edge_x in (x, x + STRIP_WIDTH):
        for edge_y in (y, y + height):
            direction_x = -1 if edge_x == x else 1
            direction_y = -1 if edge_y == y else 1
            sheet.line(edge_x + direction_x * gap, edge_y,
                       edge_x + direction_x * (gap + length), edge_y)
            sheet.line(edge_x, edge_y + direction_y * gap,
                       edge_x, edge_y + direction_y * (gap + length))


def make_print_sheet(pdfs, dimensions, target, profile):
    """Place two vector copies per A4 page, without scaling or rasterization."""
    pdfmetrics.registerFont(TTFont("StripSans", str(ROOT / "assets/fonts/NotoSansSC.ttf")))
    base = io.BytesIO()
    sheet = canvas.Canvas(base, pagesize=A4, pageCompression=1)
    positions = (20 * mm, 110 * mm)
    for theme in THEMES:
        height = dimensions[theme]["height_pt"]
        y = (A4[1] - height) / 2
        sheet.setFillColorRGB(1, 1, 1)
        sheet.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        sheet.setFillColorRGB(0.35, 0.35, 0.35)
        sheet.setFont("StripSans", 9)
        sheet.drawCentredString(A4[0] / 2, 289 * mm,
                                f"{theme.upper()} / Print at 100% (80 x {height / mm:.1f} mm)")
        for x in positions:
            crop_marks(sheet, x, y, height)
        sheet.showPage()
    sheet.save()
    base.seek(0)
    reader = PdfReader(base)
    writer = PdfWriter()
    for index, theme in enumerate(THEMES):
        page = reader.pages[index]
        strip = PdfReader(io.BytesIO(pdfs[theme])).pages[0]
        y = (A4[1] - dimensions[theme]["height_pt"]) / 2
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


def make_comparison(pdfs, dimensions, target):
    """Side-by-side proof used only to render the two-theme PNG preview."""
    writer = PdfWriter()
    maximum_height = max(item["height_pt"] for item in dimensions.values())
    page = writer.add_blank_page(width=172 * mm, height=maximum_height + 8 * mm)
    for theme, x in zip(THEMES, (4 * mm, 88 * mm)):
        source = PdfReader(io.BytesIO(pdfs[theme])).pages[0]
        y = maximum_height - dimensions[theme]["height_pt"] + 4 * mm
        page.merge_transformed_page(source, Transformation().translate(tx=x, ty=y))
    with target.open("wb") as handle:
        writer.write(handle)


def build(profile_path, output_path="output"):
    source, profile = load_profile(profile_path)
    output = project_directory(output_path, "--output-dir")
    previous_print_sheet = output / "pdf" / PRINT_SHEET_NAME
    if previous_print_sheet.is_dir():
        raise ValueError(f"A4 输出路径被同名目录占用：{previous_print_sheet}")
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
        dimensions = {}
        theme_manifest = {}
        outputs = []
        for theme in THEMES:
            pdf = typst.compile(
                str(ROOT / "main.typ"), root=str(ROOT),
                font_paths=[str(fonts)], ignore_system_fonts=True,
                sys_inputs={"theme": theme, "profile": source.relative_to(ROOT).as_posix()},
            )
            dimensions[theme] = validate_strip(pdf, profile, theme)
            pdfs[theme] = pdf
            stem = f"trailblazer-strip-{theme}"
            draft = staging / f"{stem}.pdf"
            draft.write_bytes(pdf)
            outputs.append((draft, output / "pdf" / draft.name))
            theme_manifest[theme] = {
                "width_mm": dimensions[theme]["width_mm"],
                "height_mm": dimensions[theme]["height_mm"],
                "pages": 1,
                "pdf": f"pdf/{draft.name}",
                "preview": f"images/{stem}-preview.png",
                "image_600dpi": f"images/{stem}-600dpi.png",
            }
            for dpi, suffix in ((180, "preview"), (600, "600dpi")):
                image_stem = staging / f"{stem}-{suffix}"
                subprocess.run([renderer, "-r", str(dpi), "-png", "-singlefile",
                                str(draft), str(image_stem)], check=True)
                image = image_stem.with_suffix(".png")
                if not image.is_file() or image.stat().st_size == 0:
                    raise ValueError(f"{theme} 的 {suffix} 图片导出失败，未覆盖成品")
                outputs.append((image, output / "images" / image.name))
        a4_available = all(item["height_pt"] <= A4_MAX_HEIGHT + 0.01
                           for item in dimensions.values())
        if a4_available:
            print_sheet = staging / PRINT_SHEET_NAME
            make_print_sheet(pdfs, dimensions, print_sheet, profile)
            outputs.append((print_sheet, output / "pdf" / print_sheet.name))
        comparison = staging / "comparison.pdf"
        make_comparison(pdfs, dimensions, comparison)
        comparison_image = staging / "trailblazer-strip-comparison"
        subprocess.run([renderer, "-r", "180", "-png", "-singlefile",
                        str(comparison), str(comparison_image)], check=True)
        outputs.append((comparison_image.with_suffix(".png"),
                        output / "images/trailblazer-strip-comparison.png"))
        manifest = {
            "profile": source.relative_to(ROOT).as_posix(),
            "themes": theme_manifest,
            "comparison": "images/trailblazer-strip-comparison.png",
            "a4": {
                "available": a4_available,
                "max_strip_height_mm": 267,
                "pdf": f"pdf/{PRINT_SHEET_NAME}" if a4_available else None,
                "pages": 2 if a4_available else 0,
                "copies_per_page": 2,
                "scale": 1,
                "reason": ("两版高度均不超过 267 mm，可按实际尺寸打印"
                           if a4_available else "至少一版高度超过 267 mm，未缩放或裁切，不生成 A4 拼版"),
            },
        }
        manifest_path = staging / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for original, destination in outputs:
            publish(original, destination)
        if not a4_available:
            previous_print_sheet.unlink(missing_ok=True)
        publish(manifest_path, output / "manifest.json")
    for theme in THEMES:
        print(f"PASS: {theme} 为单页 80 × {dimensions[theme]['height_mm']:g} mm，所有非空资料字段完整。")
    print("PASS: 已生成 180/600 dpi PNG、自适应高度的对照图及 manifest.json。")
    if a4_available:
        print("PASS: A4 拼版共两页，每页两张同色扩列条，保持原尺寸；打印请选择 100% / 实际大小。")
    else:
        print("提示：至少一版高度超过 267 mm，本次仅导出长条 PDF/PNG，不生成 A4 拼版；目标目录中旧的 A4 文件已清除。")
    print(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", default="config/profile.json",
                        help="项目内的资料 JSON 相对路径（默认：config/profile.json）")
    parser.add_argument("--output-dir", default="output",
                        help="项目内的输出目录（默认：output；样例可另选目录以免覆盖正式稿）")
    args = parser.parse_args()
    try:
        build(args.profile, args.output_dir)
    except Exception as error:
        print(f"构建失败：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
