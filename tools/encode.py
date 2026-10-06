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

  python tools/encode.py --phone-hero    # ONLY the v2 phone-hero re-encode below (access A-09, build-access.md)
  m/hero-aisle-mobile-780-v2.avif (q44) <- hero-aisle-mobile-1560x3376.jpg: same 780 px as v1's m/hero-aisle-mobile-780.avif,
                                           ~105 KB instead of 160 KB (the phone LCP image; Lighthouse mobile 88 -> 92)
  python tools/encode.py --phone-hero-v2 # fix-r1 (AC-25): the 960 / 1170 / 1560 phone-hero rungs at the 780-v2 settings (AVIF q44),
                                         new names (immutable /assets): m/hero-aisle-mobile-{960,1170,1560}-v2.avif
  python tools/encode.py --lamp-760      # fix-r1: a 760 rung of the same lamp crop (AVIF q60 / WebP q80 / JPEG q82) for 400-430 px phones
  python tools/encode.py --noprice [--crops <dir>]
                                         fix-r1 (NOPRICE, spec 5.5): feathered blur patches over the legible price stickers in
                                         three photos v1 shipped unchanged, written under new -np names:
                                         m/marquee-05-mm-dispenser-yelp30-np-{480,720}.avif/.webp + -np-750x1000.jpg   ("$135.00" star, tag)
                                         m/marquee-06-oak-wall-telephone-yelp14-np-{480,720}.avif/.webp + -np-750x1000.jpg ("$279" star, "$35" bag)
                                         m/tile-home-goods-chandeliers-np-{480,720,full}.avif/.webp + -np-1116x1488.jpg   ("$650" lamp tag)
                                         A crop could not do it: every crop that drops a sticker leaves < 680 px of width,
                                         under 2x of the 340 px marquee card / 420 px tile at DPR 2 (AC-23).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

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


def phone_hero():
    src = Image.open(os.path.join(SRC, 'hero-aisle-mobile-1560x3376.jpg')).convert('RGB')
    im = src.resize((780, round(src.height * 780 / src.width)), Image.LANCZOS)
    path = os.path.join(SRC, 'm', 'hero-aisle-mobile-780-v2.avif')
    save(im, path, 'avif', 44)
    print(f'm/hero-aisle-mobile-780-v2.avif {im.width}x{im.height} {os.path.getsize(path) / 1024:.1f} KB')


def phone_hero_v2():
    src = Image.open(os.path.join(SRC, 'hero-aisle-mobile-1560x3376.jpg')).convert('RGB')
    for w in (960, 1170, 1560):
        im = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
        path = os.path.join(SRC, 'm', f'hero-aisle-mobile-{w}-v2.avif')
        save(im, path, 'avif', 44)
        print(f'm/hero-aisle-mobile-{w}-v2.avif {im.width}x{im.height} {os.path.getsize(path) / 1024:.1f} KB')


# (master, out stem, patches as (x0, y0, x1, y1) in master pixels, widths {label: px}, jpeg name)
NOPRICE = [
    ('marquee-05-mm-dispenser-yelp30-750x1000.jpg', 'marquee-05-mm-dispenser-yelp30-np', [(498, 250, 608, 398), (656, 0, 718, 62)],
     {'480': 480, '720': 720}, 'marquee-05-mm-dispenser-yelp30-np-750x1000.jpg'),
    ('marquee-06-oak-wall-telephone-yelp14-750x1000.jpg', 'marquee-06-oak-wall-telephone-yelp14-np', [(340, 136, 490, 224), (526, 776, 624, 868)],
     {'480': 480, '720': 720}, 'marquee-06-oak-wall-telephone-yelp14-np-750x1000.jpg'),
    ('tile-home-goods-chandeliers-1116x1488.jpg', 'tile-home-goods-chandeliers-np', [(446, 926, 574, 1088)],
     {'480': 480, '720': 720, 'full': 1116}, 'tile-home-goods-chandeliers-np-1116x1488.jpg'),
]


def unprice(im, patches):
    """Feathered Gaussian blur over each patch: the sticker's digits and handwriting go, the object stays."""
    out = im.copy()
    for x0, y0, x1, y1 in patches:
        pad = 24
        bx0, by0, bx1, by1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
        region = im.crop((bx0, by0, bx1, by1))
        blurred = region.filter(ImageFilter.GaussianBlur(10)).filter(ImageFilter.GaussianBlur(6))
        mask = Image.new('L', region.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((x0 - bx0, y0 - by0, x1 - bx0, y1 - by0), radius=14, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(7))
        out.paste(Image.composite(blurred, region, mask), (bx0, by0))
    return out


def noprice(crops=None):
    for master, stem, patches, widths, jpg in NOPRICE:
        src = unprice(Image.open(os.path.join(SRC, master)).convert('RGB'), patches)
        jp = os.path.join(SRC, 'm', jpg)
        save(src, jp, 'jpg', 84)
        print(f'm/{jpg:52} {src.width}x{src.height} {os.path.getsize(jp) / 1024:7.1f} KB')
        for label, w in widths.items():
            im = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
            for fmt, q in (('avif', 52), ('webp', 72)):
                name = f'{stem}-{label}.{fmt}'
                path = os.path.join(SRC, 'm', name)
                save(im, path, fmt, q)
                print(f'm/{name:52} {im.width}x{im.height} {os.path.getsize(path) / 1024:7.1f} KB')
        if crops:
            os.makedirs(crops, exist_ok=True)
            for i, (x0, y0, x1, y1) in enumerate(patches):   # 100 % review crops of the shipped largest encode, patch +/- 60 px
                dec = Image.open(os.path.join(SRC, 'm', f'{stem}-{list(widths)[-1]}.avif')).convert('RGB')
                k = dec.width / src.width
                box = (max(0, int((x0 - 60) * k)), max(0, int((y0 - 60) * k)), min(dec.width, int((x1 + 60) * k)), min(dec.height, int((y1 + 60) * k)))
                dec.crop(box).save(os.path.join(crops, f'crop100-{stem}-patch{i}.png'))


def lamp_760():
    src = Image.open(os.path.join(SRC, 'band-quotes-oil-lamps-3840x1267.jpg')).convert('RGB').crop(LAMP_BOX)
    im = src.resize((760, round(src.height * 760 / src.width)), Image.LANCZOS)
    for fmt, q in (('avif', 60), ('webp', 80), ('jpg', 82)):
        path = os.path.join(OUT, f'lamp-panel-760.{fmt}')
        save(im, path, fmt, q)
        print(f'd/lamp-panel-760.{fmt} {im.width}x{im.height} {os.path.getsize(path) / 1024:.1f} KB')


def main():
    if '--phone-hero' in sys.argv:
        return phone_hero()
    if '--phone-hero-v2' in sys.argv:
        return phone_hero_v2()
    if '--lamp-760' in sys.argv:
        return lamp_760()
    if '--noprice' in sys.argv:
        return noprice(sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None)
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
