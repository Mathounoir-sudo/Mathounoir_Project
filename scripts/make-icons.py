"""Génère les icônes PNG de l'application (python3 scripts/make-icons.py).

Dessin identique à public/favicon.svg : une cocotte qui mijote.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

BG = (194, 86, 43)
FG = (251, 247, 240)
OUT = Path(__file__).resolve().parent.parent / "public"


def draw(size: int, *, padding: float, rounded: bool) -> Image.Image:
    scale = 4  # dessin en grand puis réduction, pour des bords lisses
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, big, big), radius=big * 14 / 64, fill=BG)
    else:
        d.rectangle((0, 0, big, big), fill=BG)

    inner = big * (1 - 2 * padding)
    off = big * padding

    def p(x: float, y: float) -> tuple[float, float]:
        return (off + x / 64 * inner, off + y / 64 * inner)

    def box(x0: float, y0: float, x1: float, y1: float) -> tuple[float, float, float, float]:
        return (*p(x0, y0), *p(x1, y1))

    u = inner / 64
    for x in (24, 32, 40):  # vapeur : petites vagues verticales
        top = 8 if x == 32 else 10
        pts = [p(x + 2.5 * math.sin(i / 20 * 2 * math.pi), top + i * 9 / 20) for i in range(21)]
        d.line(pts, fill=FG, width=round(3 * u), joint="curve")
        for end in (pts[0], pts[-1]):
            r = 1.5 * u
            d.ellipse((end[0] - r, end[1] - r, end[0] + r, end[1] + r), fill=FG)
    d.rounded_rectangle(box(12, 26, 52, 31), radius=2.5 * u, fill=FG)  # couvercle
    d.rounded_rectangle(box(15, 33, 49, 55), radius=12 * u, fill=FG)  # corps
    d.rectangle(box(15, 33, 49, 43), fill=FG)
    d.rounded_rectangle(box(7, 36, 15, 40), radius=2 * u, fill=FG)  # anses
    d.rounded_rectangle(box(49, 36, 57, 40), radius=2 * u, fill=FG)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    draw(192, padding=0.06, rounded=True).save(OUT / "pwa-192.png")
    draw(512, padding=0.06, rounded=True).save(OUT / "pwa-512.png")
    # « maskable » : le système découpe l'icône (cercle, goutte…) → fond plein et marge de sécurité.
    draw(512, padding=0.18, rounded=False).save(OUT / "pwa-maskable-512.png")
    draw(180, padding=0.12, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    print("Icônes générées dans", OUT)


if __name__ == "__main__":
    main()
