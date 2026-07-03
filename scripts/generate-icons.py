#!/usr/bin/env python3
"""Generate Breadcrumb icons — a trail of crumbs on a warm amber gradient."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "public" / "icon"
ASSETS_DIR = ROOT / "assets"

MASTER = 1024

AMBER_LIGHT = (251, 191, 36)
AMBER_MID = (245, 158, 11)
AMBER_DARK = (180, 83, 9)
WHITE = (255, 255, 255, 255)

# Trail of crumbs: (x, y, radius) as fractions of the canvas, small -> large.
CRUMBS = [
    (0.26, 0.75, 0.052),
    (0.43, 0.60, 0.072),
    (0.60, 0.44, 0.094),
    (0.77, 0.27, 0.120),
]


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def blend(c1: tuple[int, ...], c2: tuple[int, ...], t: float) -> tuple[int, int, int]:
    return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def rounded_gradient(size: int, box: tuple[int, int, int, int], radius: int):
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    h = max(y1 - y0, 1)

    for y in range(y0, y1 + 1):
        t = (y - y0) / h
        if t < 0.45:
            color = blend(AMBER_LIGHT, AMBER_MID, t / 0.45)
        else:
            color = blend(AMBER_MID, AMBER_DARK, (t - 0.45) / 0.55)
        draw.line([(x0, y), (x1, y)], fill=(*color, 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(layer, mask=mask)
    return out, mask


def draw_trail(draw: ImageDraw.ImageDraw, size: int, *, minimal: bool = False) -> None:
    """Draw the breadcrumb trail of dots."""
    s = float(size)
    crumbs = CRUMBS[1:] if minimal else CRUMBS

    for cx, cy, cr in crumbs:
        x = cx * s
        y = cy * s
        r = cr * s
        # soft shadow for depth on the larger renders
        if not minimal:
            shadow_off = max(1.0, s * 0.008)
            draw.ellipse(
                (
                    x - r + shadow_off,
                    y - r + shadow_off,
                    x + r + shadow_off,
                    y + r + shadow_off,
                ),
                fill=(120, 53, 6, 90),
            )
        draw.ellipse((x - r, y - r, x + r, y + r), fill=WHITE)


def draw_background(size: int, *, flat: bool = False) -> Image.Image:
    if flat and size <= 64:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        radius = max(3, size // 5)
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=AMBER_MID)
        draw.line([(2, 2), (size - 3, 2)], fill=AMBER_LIGHT, width=max(1, size // 16))
        return img

    inset = max(1, size // 20)
    radius = max(3, int(size // 4.5))
    box = (inset, inset, size - inset - 1, size - inset - 1)

    img, mask = rounded_gradient(size, box, radius)

    shine = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shine)
    shine_box = (
        box[0] + max(1, size // 50),
        box[1] + max(1, size // 50),
        box[2] - max(1, size // 50),
        box[1] + int((box[3] - box[1]) * 0.4),
    )
    sdraw.rounded_rectangle(
        shine_box,
        radius=max(2, int(radius * 0.9)),
        fill=(255, 255, 255, 34),
    )
    return Image.alpha_composite(
        img,
        Image.composite(shine, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask),
    )


def make_icon(size: int, *, flat: bool = False, minimal: bool = False) -> Image.Image:
    img = draw_background(size, flat=flat)
    draw = ImageDraw.Draw(img)
    draw_trail(draw, size, minimal=minimal or (flat and size <= 64))
    return img


def make_master() -> Image.Image:
    return make_icon(MASTER)


def export_icon(master: Image.Image, size: int) -> Image.Image:
    if size == 16:
        return make_icon(64, flat=True, minimal=True).resize(
            (16, 16), Image.Resampling.LANCZOS
        )
    return master.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    master = make_master()

    for icon_size in (16, 32, 48, 128):
        path = ICON_DIR / f"{icon_size}.png"
        export_icon(master, icon_size).save(path, "PNG", optimize=True)
        print(f"wrote {path}")

    export_icon(master, 128).save(ASSETS_DIR / "logo.png", "PNG", optimize=True)
    print(f"wrote {ASSETS_DIR / 'logo.png'}")


if __name__ == "__main__":
    main()
