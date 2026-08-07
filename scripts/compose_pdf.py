#!/usr/bin/env python3
"""Slice a full-page screenshot into A4 pages at section boundaries and assemble a
pixel-perfect PDF with a "current / total" page-number band on every page.

    python3 compose_pdf.py <full.png> <geom.json> <out.pdf>

geom.json: { scale, cssWidth, cuts:[y...], height, width }  (cuts are CSS-px bottoms of
the header and each section — the only places a page is allowed to end).
"""
import sys, json, io
from PIL import Image, ImageDraw, ImageFont
import img2pdf

A4_W_MM, A4_H_MM = 210.0, 297.0

def load_font(px):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(p, px)
        except Exception:
            pass
    return ImageFont.load_default()

def main():
    png_path, geom_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    geom = json.load(open(geom_path))
    scale = geom["scale"]

    img = Image.open(png_path).convert("RGB")
    W, H = img.size  # pixels (already at `scale`)

    # A4 page geometry in device pixels (page width == screenshot width).
    page_h = round(W * (A4_H_MM / A4_W_MM))
    top_band = round(34 * scale)   # room for the page-number line
    bottom_pad = round(14 * scale)
    content_h = page_h - top_band - bottom_pad

    # Sheet background (blends the page margins). Sample the LEFT margin low down — the
    # top-left is inside the hero/banner, so its colour would be wrong.
    bg = img.getpixel((2, H - 3))

    # Allowed page-end positions (device px, ascending). The last real content is the
    # largest cut (the footer / last section bottom) — do NOT paginate past it into the
    # sheet's trailing padding, or we'd emit a blank final page.
    cuts = sorted({round(c * scale) for c in geom["cuts"] if 0 < c * scale <= H})
    content_bottom = cuts[-1] if cuts else H

    # Greedy pack sections into pages: end each page at the lowest cut that still fits.
    spans, start = [], 0
    while start < content_bottom - 1:
        target = start + content_h
        fit = [c for c in cuts if start < c <= target]
        end = fit[-1] if fit else min(start + content_h, content_bottom)  # giant section → hard split
        spans.append((start, end))
        start = end
    n = len(spans)

    font = load_font(round(11 * scale))
    pages = []
    for i, (a, b) in enumerate(spans, 1):
        page = Image.new("RGB", (W, page_h), bg)
        page.paste(img.crop((0, a, W, b)), (0, top_band))
        d = ImageDraw.Draw(page)
        label = f"{i} / {n}"
        tw = d.textlength(label, font=font)
        d.text((W - tw - round(20 * scale), round(11 * scale)), label, fill=(150, 160, 176), font=font)
        buf = io.BytesIO(); page.save(buf, format="PNG"); pages.append(buf.getvalue())

    layout = img2pdf.get_layout_fun((img2pdf.mm_to_pt(A4_W_MM), img2pdf.mm_to_pt(A4_H_MM)))
    with open(out_path, "wb") as f:
        f.write(img2pdf.convert(pages, layout_fun=layout))
    print(f"  {n} A4 pages, section-aware cuts, page numbers on each")

if __name__ == "__main__":
    main()
