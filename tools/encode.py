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
  python tools/encode.py --noprice2 [--crops <dir>]
                                         fix-r2: the --noprice patches + the Home Goods flag ("10% Off All") + the orange price dots on
                                         the bottle openers (Telea inpaint), as m/marquee-06-...-np2-* and m/tile-home-goods-...-np2-*
  python tools/encode.py --hero-np [--crops <dir>]
                                         fix-r2: the D-25 sale sign + D-26 wall lettering RETOUCHED out of new -np hero masters (no CSS veil):
                                         hero-aisle-band-np-3840x2400.jpg, hero-aisle-mobile-np-1560x3376.jpg, d/hero-aisle-np-*,
                                         m/hero-aisle-land-np-*, m/hero-aisle-mobile-np-*, and og-carson-antiques-mall-np-1200x630.jpg
                                         (a booths-zone crop of the master, OG_BOX: no sale sign, no slogan wall).
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


# fix-r2 (D-25 / D-26 / NOPRICE, spec 5.5): the stale sale sign and the old grocery-wall lettering are RETOUCHED OUT of new
# -np masters (no CSS veil any more), so the raw photos that search, social cards, schema and the sitemap see carry them neither.
# Lettering on a plain wall -> a smooth surface fitted to the surrounding real wall (+ matched grain); the sale sign -> a blank
# card. Vintage merchandise signs hanging in the booths are products and stay. Needs numpy + opencv-python.
RETOUCH = [   # (x0, y0, x1, y1, mode[, soffit/ceiling line xa ya xb yb: never paint above it]) in master px
    (1830, 448, 2080, 592, 'wall'),                           # Today's Deals / are here for now, but not for long
    (2458, 440, 2787, 586, 'wall', (2440, 472, 2660, 432)),   # Brands you know / prices you love
    (3220, 444, 3716, 589, 'wall', (3230, 499, 3700, 452)),   # Beer & Wine / Let's toast!
    (1090, 506, 1191, 642, 'wall'),                           # Fresh .. every / Different .. every (left of the pillar)
    (1261, 506, 1314, 642, 'wall'),                           # (right of the pillar)
    (0, 680, 172, 774, 'red'),                                # .. Meat! Let's Eat! (red wall)
    (316, 588, 454, 706, 'red', (256, 620, 506, 565)),        # Holy Cow!
    (558, 538, 659, 666, 'red', (498, 550, 738, 515)),        # Are our Bread and Butter
    (3330, 578, 3440, 600, 'telea'),                          # the swash of "Let's" below the wall edge
    (1290, 600, 1330, 650, 'telea'),                          # a red full stop right of the pillar
    (1360, 1622, 1548, 1758, 'card'),                         # "Happy Independence Day - 10% off" sign -> a blank card
]
PHONE_FROM_MASTER = (.6595, -408.58, 742.81)   # hero-aisle-mobile-1560x3376 = this scale + offset of the master (SIFT, 1164 inliers)
OG_BOX = (600, 670, 2381, 1605)   # booths zone of the master: below the slogan wall, above the sign; 1781 x 935 = 1.905:1


def retouch(path):
    import cv2
    import numpy as np
    rng = np.random.default_rng(7)
    img = cv2.imread(path)
    out = img.astype(np.float32)
    alpha = np.zeros(img.shape[:2], np.float32)
    ell = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    for x0, y0, x1, y1, mode, *top in RETOUCH:
        if mode == 'telea':   # tiny leftovers: inpaint only the reddish lettering pixels
            reg = np.clip(out[y0:y1, x0:x1], 0, 255).astype(np.uint8)
            m = cv2.dilate(((reg[..., 2].astype(int) - reg[..., 1]) > 35).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
            out[y0:y1, x0:x1] = cv2.inpaint(reg, m, 5, cv2.INPAINT_TELEA).astype(np.float32)
            alpha[y0:y1, x0:x1] = np.maximum(alpha[y0:y1, x0:x1], m / 255)
            continue
        P = 40   # fit on the box plus a 40 px ring of real wall; paint only inside the box
        X0, Y0, X1, Y1 = max(0, x0 - P), max(0, y0 - P), min(img.shape[1], x1 + P), min(img.shape[0], y1 + P)
        reg = out[Y0:Y1, X0:X1].copy()
        h, w = reg.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        bx, by, bw, bh = xx - (x0 - X0), yy - (y0 - Y0), x1 - x0, y1 - y0
        inbox = (bx >= 0) & (bx < bw) & (by >= 0) & (by < bh)
        below, line = np.ones((h, w), bool), None
        if top:
            xa, ya, xb, yb = top[0]
            line = ya + (xx + X0 - xa) * (yb - ya) / (xb - xa) - Y0
            below = (yy - line) > 4
        if mode == 'card':     # blank paper: the card's own bright, unsaturated pixels
            keep = inbox & (reg.mean(2) > 175) & (reg.max(2) - reg.min(2) < 40)
            keep = cv2.erode(keep.astype(np.uint8), ell(5)).astype(bool)
        elif mode == 'red':    # red-painted wall
            R, G = reg[..., 2], reg[..., 1]
            keep = cv2.erode(((R - G > 50) & (R > 100) & (R < 200) & below).astype(np.uint8), ell(13)).astype(bool)
        else:                  # light wall: its low-saturation pixels set the wall colour; lettering differs from it
            px = reg[inbox & below].reshape(-1, 3)
            grey = px[(px.max(1) - px.min(1) < 28) & (px.mean(1) > 140)]
            med = np.median(grey if len(grey) > 800 else px, axis=0)
            keep = cv2.erode(((np.abs(reg - med).max(axis=2) < 30) & below).astype(np.uint8), ell(13)).astype(bool)
        u, v = xx / w, yy / h   # smooth surface through the kept wall pixels, per channel
        A = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, u * u * v, u * v * v], -1).reshape(-1, 8)
        k = keep.reshape(-1)
        surf = np.empty_like(reg)
        for c in range(3):
            coef, *_ = np.linalg.lstsq(A[k], reg.reshape(-1, 3)[k, c], rcond=None)
            surf[..., c] = (A @ coef).reshape(h, w)
        noise = min(4.0, float((reg - cv2.GaussianBlur(reg, (0, 0), 3))[keep].std())) if keep.sum() > 100 else 2.0
        surf += rng.normal(0, noise, (h, w, 1))
        big = np.full((h, w), 99.0)   # no feather on the photo's own edge
        ex = [bx if x0 > 0 else big, bw - 1 - bx if x1 < img.shape[1] else big, by, bh - 1 - by]
        a = np.clip(np.minimum.reduce(ex) / 6, 0, 1) * inbox
        if line is not None:
            a = a * np.clip((yy - line - 2) / 3, 0, 1)
        out[Y0:Y1, X0:X1] = surf * a[..., None] + reg * (1 - a[..., None])
        alpha[Y0:Y1, X0:X1] = np.maximum(alpha[Y0:Y1, X0:X1], a)
    return np.clip(out, 0, 255).astype(np.uint8), alpha


def hero_np(crops=None):
    import cv2
    import numpy as np
    m_bgr, a = retouch(os.path.join(SRC, 'hero-aisle-band-3840x2400.jpg'))
    p_bgr = cv2.imread(os.path.join(SRC, 'hero-aisle-mobile-1560x3376.jpg'))
    s, ox, oy = PHONE_FROM_MASTER   # the phone master is the same photo: carry the retouch over by the same affine map
    A = np.float32([[s, 0, ox], [0, s, oy]])
    pw, ph = p_bgr.shape[1], p_bgr.shape[0]
    wa = cv2.warpAffine(a, A, (pw, ph), flags=cv2.INTER_LINEAR)[..., None]
    wm = cv2.warpAffine(m_bgr, A, (pw, ph), flags=cv2.INTER_LINEAR)
    p_bgr = np.clip(wm * wa + p_bgr * (1 - wa), 0, 255).astype(np.uint8)
    M = Image.fromarray(cv2.cvtColor(m_bgr, cv2.COLOR_BGR2RGB))
    Pm = Image.fromarray(cv2.cvtColor(p_bgr, cv2.COLOR_BGR2RGB))
    og = M.crop(OG_BOX).resize((1200, 630), Image.LANCZOS)
    jobs = [   # (image, relative path, width or None, fmt, quality)
        (M, 'hero-aisle-band-np-3840x2400.jpg', None, 'jpg', 86),
        (og, 'og-carson-antiques-mall-np-1200x630.jpg', None, 'jpg', 86),
        (Pm, 'hero-aisle-mobile-np-1560x3376.jpg', None, 'jpg', 84),
    ]
    jobs += [(M, f'd/hero-aisle-np-{w}.{f}', w, f, q) for w in (1440, 1920, 2560, 2880, 3840) for f, q in (('avif', 62), ('webp', 80))]
    jobs += [(M, f'm/hero-aisle-land-np-{w}.{f}', w, f, q) for w in (1280, 1920) for f, q in (('avif', 54), ('webp', 70))]
    jobs += [(Pm, f'm/hero-aisle-mobile-np-{w}.avif', w, 'avif', 44) for w in (780, 960, 1170, 1560)]
    jobs += [(Pm, f'm/hero-aisle-mobile-np-{w}.webp', w, 'webp', 66) for w in (780, 1170, 1560)]
    for im, rel, w, fmt, q in jobs:
        out = im if not w or w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        path = os.path.join(SRC, *rel.split('/'))
        save(out, path, fmt, q)
        print(f'{rel:46} {out.width}x{out.height} {os.path.getsize(path) / 1024:8.1f} KB')
    if crops:   # 100 % review crops of the largest shipped encodes around every retouch
        os.makedirs(crops, exist_ok=True)
        for rel, k in (('d/hero-aisle-np-3840.avif', None), ('m/hero-aisle-mobile-np-1560.avif', PHONE_FROM_MASTER)):
            dec = Image.open(os.path.join(SRC, *rel.split('/'))).convert('RGB')
            for i, (x0, y0, x1, y1, *_r) in enumerate(RETOUCH):
                if k:
                    x0, x1 = round(k[0] * x0 + k[1]), round(k[0] * x1 + k[1])
                    y0, y1 = round(k[0] * y0 + k[2]), round(k[0] * y1 + k[2])
                if x1 <= 0 or x0 >= dec.width:
                    continue
                dec.crop((max(0, x0 - 60), max(0, y0 - 60), min(dec.width, x1 + 60), min(dec.height, y1 + 60))).save(
                    os.path.join(crops, f'crop100-{os.path.basename(rel)}-r{i}.png'))


# fix-r2 (NOPRICE at 100 % of the source files): the round-1 blur patches plus what they missed - the Home Goods flag's
# "10% Off All..." and the small orange price dots on the cast-iron bottle openers - under new -np2 names (immutable /assets).
NOPRICE2 = [   # (master, out stem, blur patches, price-dot boxes (inpainted from their surroundings), widths, jpeg name)
    ('marquee-06-oak-wall-telephone-yelp14-750x1000.jpg', 'marquee-06-oak-wall-telephone-yelp14-np2',
     [(340, 136, 490, 224), (526, 776, 624, 868)],
     [(30, 638, 62, 666), (132, 612, 162, 646), (72, 648, 102, 678), (162, 914, 198, 950), (0, 952, 22, 988)],
     {'480': 480, '720': 720}, 'marquee-06-oak-wall-telephone-yelp14-np2-750x1000.jpg'),
    ('tile-home-goods-chandeliers-1116x1488.jpg', 'tile-home-goods-chandeliers-np2',
     [(446, 926, 574, 1088), (478, 112, 566, 196)],
     [],
     {'480': 480, '720': 720, 'full': 1116}, 'tile-home-goods-chandeliers-np2-1116x1488.jpg'),
]


def undot(im, boxes):
    """Orange / yellow price dots: Telea-inpaint only the sticker pixels, so the iron around them stays sharp."""
    if not boxes:
        return im
    import cv2
    import numpy as np
    a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    for x0, y0, x1, y1 in boxes:
        reg = a[y0:y1, x0:x1].copy()
        b, g, r = [reg[..., i].astype(int) for i in range(3)]
        m = (((r > 140) & (r - b > 80)) * 255).astype(np.uint8)
        m = cv2.dilate(m, np.ones((5, 5), np.uint8))
        a[y0:y1, x0:x1] = cv2.inpaint(reg, m, 4, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))


def noprice2(crops=None):
    for master, stem, patches, dots, widths, jpg in NOPRICE2:
        src = undot(unprice(Image.open(os.path.join(SRC, master)).convert('RGB'), patches), dots)
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
        if crops:   # 100 % review crops of the source-size jpeg around every patch and dot
            os.makedirs(crops, exist_ok=True)
            for i, (x0, y0, x1, y1) in enumerate(patches + dots):
                src.crop((max(0, x0 - 50), max(0, y0 - 50), min(src.width, x1 + 50), min(src.height, y1 + 50))).resize(
                    ((min(src.width, x1 + 50) - max(0, x0 - 50)) * 2, (min(src.height, y1 + 50) - max(0, y0 - 50)) * 2)).save(
                    os.path.join(crops, f'crop200-{stem}-{i}.png'))


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
    if '--hero-np' in sys.argv:
        return hero_np(sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None)
    if '--noprice2' in sys.argv:
        return noprice2(sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None)
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
