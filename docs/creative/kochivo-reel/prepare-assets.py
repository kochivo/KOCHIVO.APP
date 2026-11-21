"""Prepare editorial crops without altering the original brand assets."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "assets"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / "branding identity" / "02-screenshots"
CROPS = {
    "dashboard": ("captain/dark/mobile/01-dashboard--full.png", (70, 905, 1010, 1480)),
    "program": ("captain/dark/mobile/16-program-builder--full.png", (65, 2160, 1015, 4170)),
    "nutrition": ("captain/dark/mobile/18-nutrition-builder--full.png", (60, 2640, 1020, 4360)),
    "workout": ("player/dark/mobile/07-workout--full.png", (80, 735, 1000, 2690)),
    "muscles": ("player/dark/mobile/03-progress--full.png", (80, 2730, 1000, 3860)),
    "progress": ("captain/dark/mobile/08-player-progress--full.png", (70, 2420, 1010, 3520)),
}

sheet = Image.new("RGB", (1800, 680), (11, 12, 13))
draw = ImageDraw.Draw(sheet)
for index, (name, (source, box)) in enumerate(CROPS.items()):
    original = Image.open(SOURCE / source).convert("RGB")
    crop = original.crop(box)
    crop.save(OUT / f"{name}.jpg", quality=96, subsampling=0)
    crop.thumbnail((280, 610))
    sheet.paste(crop, (index * 300 + 10, 50))
    draw.text((index * 300 + 10, 15), name, fill=(244, 244, 241))
sheet.save(OUT.parent / "asset-review.jpg", quality=90)
