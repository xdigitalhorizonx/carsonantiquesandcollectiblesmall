"""encode.py - v2 desktop image encodes for Carson Antiques & Collectibles Mall (spec section 6.6).

Pillow 12.x with its native AVIF plugin; no paid tools, no network. Reads the masters in assets/,
writes content-addressed-by-name outputs to assets/d/ (immutable /assets cache: a changed image
must get a new filename, never an overwrite of a published one).

  python tools/encode.py                 # encode everything into assets/d/
  python tools/encode.py --crops <dir>   # also save a 100 % crop of every output for review

Outputs (spec 6.6):
  hero-aisle-{1440,1920,2560,2880,3840}.avif (q62) + .webp (q80)   <- hero-aisle-band-3840x2400.jpg
  lamp-panel-{640,1020}.avif (q60) / .webp (q80) / .jpg (q82)       <- band-quotes-oil-lamps-3840x1267.jpg,
                                                                       master crop x 600-1620, y 0-1267 (D-24:
                                                                       both price stickers stay outside)
  visit-storefront-1536.avif (q62) + .webp (q80)                     <- visit-storefront-exterior-1536x1044.jpg
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets')
OUT = os.path.join(SRC, 'd')

LAMP_BOX = (600, 0, 1620, 1267)          # x0, y0, x1, y1 on the 3840x1267 master (spec D-24 / 5.5)
AVIF_SPEED = 4                           # slower = better quality per byte; same speed the perf audit measured

JOBS = [
    # (output stem, master, crop box or None, widths, {fmt: quality})
    ('hero-aisle', 'hero-aisle-band-3840x2400.jpg', None, [1440, 1920, 2560, 2880, 3840], {'avif': 62, 'webp': 80}),
    ('lamp-panel', 'band-quotes-oil-lamps-3840x1267.jpg', LAMP_BOX, [640, 1020], {'avif': 60, 'webp': 80, 'jpg': 82}),
    ('visit-storefront', 'visit-storefront-exterior-1536x1044.jpg', None, [1536], {'avif': 62, 'webp': 80}),
]


def save(im, path, fmt, q):
    if fmt == 'avif':
        im.save(path, 'AVIF', quality=q, speed=AVIF_SPEED)
    elif fmt == 'webp':
        im.save(path, 'WEBP', quality=q, method=6)
    else:
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)


def main():
    crops = None
    if '--crops' in sys.argv:
        crops = sys.argv[sys.argv.index('--crops') + 1]
        os.makedirs(crops, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    report = []
    for stem, master, box, widths, fmts in JOBS:
        src = Image.open(os.path.join(SRC, master)).convert('RGB')
        if box:
            src = src.crop(box)
        for w in widths:
            h = round(src.height * w / src.width)
            im = src if w == src.width else src.resize((w, h), Image.LANCZOS)
            for fmt, q in fmts.items():
                name = f'{stem}-{w}.{fmt}'
                path = os.path.join(OUT, name)
                save(im, path, fmt, q)
                report.append((name, im.width, im.height, os.path.getsize(path)))
                if crops:
                    # 100 % crop (no scaling) of the decoded file, centred on the busiest part of each subject
                    dec = Image.open(path).convert('RGB')
                    cw, ch = min(900, dec.width), min(700, dec.height)
                    cx = {'hero-aisle': 0.62, 'lamp-panel': 0.5, 'visit-storefront': 0.5}[stem]
                    cy = {'hero-aisle': 0.66, 'lamp-panel': 0.62, 'visit-storefront': 0.45}[stem]
                    x0 = max(0, min(dec.width - cw, round(dec.width * cx - cw / 2)))
                    y0 = max(0, min(dec.height - ch, round(dec.height * cy - ch / 2)))
                    dec.crop((x0, y0, x0 + cw, y0 + ch)).save(os.path.join(crops, f'crop100-{name}.png'))
    for name, w, h, b in report:
        print(f'{name:34} {w:>5}x{h:<5} {b / 1024:8.1f} KB')


if __name__ == '__main__':
    main()
