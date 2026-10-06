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
  python tools/encode.py --lamp-portrait # fix-r3: m/lamp-portrait-{760,1020}.avif/.webp - the phone lamp source for every phone <= 767 px
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

  python tools/encode.py --noprice3 [--crops <dir>]
                                         fix-r3: the price tags are BLANKED, not blurred (the tag, its printed border and a star's red rim
                                         stay; only the ink goes) + the Home Goods flag lettering removed along its stripes, as
                                         m/{tile-home-goods-chandeliers,marquee-06-...-yelp14,marquee-05-...-yelp30}-np3-* (no more smudges)
  python tools/encode.py --hero-np [--crops <dir>]
                                         fix-r2: the D-25 sale sign + D-26 wall lettering RETOUCHED out of new -np hero masters (no CSS veil):
                                         hero-aisle-band-np-3840x2400.jpg, hero-aisle-mobile-np-1560x3376.jpg, d/hero-aisle-np-*,
                                         m/hero-aisle-land-np-*, m/hero-aisle-mobile-np-*, and og-carson-antiques-mall-np-1200x630.jpg
                                         (a booths-zone crop of the master, OG_BOX: no sale sign, no slogan wall).
                                         fix-r3: now writes HERO_NP = 'np2' names - the red-wall boxes stop at the REAL popcorn edge
                                         (ceiling_end, per column), and lettering stubs at the pillar / sign edges are cleaned
                                         ('ink-red' / 'ink-light'); the phone WebP ladder gains its 960 rung; the og card is unchanged.
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
    (0, 650, 172, 774, 'red', (0, 652, 240, 636)),            # .. Meat! Let's Eat! (red wall) + its underline (fix-r3: y0 680 -> 650)
    (316, 588, 454, 706, 'red', (256, 620, 506, 565)),        # Holy Cow!
    (558, 538, 659, 666, 'red', (498, 550, 738, 515)),        # Are our Bread and Butter
    (3330, 578, 3440, 600, 'telea'),                          # the swash of "Let's" below the wall edge
    (1290, 600, 1330, 650, 'telea'),                          # a red full stop right of the pillar
    (1360, 1622, 1548, 1758, 'card'),                         # "Happy Independence Day - 10% off" sign -> a blank card
    # fix-r3: lettering stubs the feathered box edges left (Telea on the stroke pixels only)
    (636, 540, 659, 668, 'ink-red'),                          # right end of "Are our / Bread and Butter", next to the brown sign
    (1176, 500, 1199, 633, 'ink-light', (1190, 490, 1197, 660)),   # "Fresh .. / Different .." stubs at the pillar (never right of its edge)
]
PHONE_FROM_MASTER = (.6595, -408.58, 742.81)   # hero-aisle-mobile-1560x3376 = this scale + offset of the master (SIFT, 1164 inliers)
OG_BOX = (600, 670, 2381, 1605)   # booths zone of the master: below the slogan wall, above the sign; 1781 x 935 = 1.905:1
HERO_NP = 'np2'                   # fix-r3 output generation of the hero files (fix-r2 shipped 'np'); immutable /assets = new names


def ceiling_end(reg):
    """fix-r3: per column, the first row below the popcorn ceiling (smoothed: bright + unsaturated = ceiling; the first run
    of 4 non-ceiling rows ends it). Lettering that touches the ceiling counts as wall, so it gets painted too."""
    import cv2
    import numpy as np
    s = cv2.GaussianBlur(reg.astype(np.float32), (0, 0), 1.5)
    ceil = (s.mean(2) > 140) & (s.max(2) - s.min(2) < 45)
    wall = ~ceil
    run = wall[:-3] & wall[1:-2] & wall[2:-1] & wall[3:]
    return np.where(run.any(0), run.argmax(0), reg.shape[0]).astype(np.float32)


def retouch(path):
    import cv2
    import numpy as np
    rng = np.random.default_rng(7)
    img = cv2.imread(path)
    out = img.astype(np.float32)
    alpha = np.zeros(img.shape[:2], np.float32)
    ell = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    for x0, y0, x1, y1, mode, *top in RETOUCH:
        if mode in ('ink-red', 'ink-light'):   # fix-r3: leftover strokes - not-red on the red wall / dark or red on the light wall
            reg = np.clip(out[y0:y1, x0:x1], 0, 255).astype(np.uint8)
            b, g, r = [reg[..., i].astype(int) for i in range(3)]
            if mode == 'ink-red':
                m = ~((r - g > 45) & (r > 90)) & (np.mgrid[0:y1 - y0, 0:x1 - x0][0] > ceiling_end(reg.astype(np.float32))[None, :] + 1)
            else:      # darker than this wall by > 35, or red script
                lum = reg.mean(2)
                m = (lum < np.percentile(lum, 75) - 30) | ((r - g > 16) & (r - b > 8))
            if top:   # an edge the paint never crosses (the pillar): keep 1 px clear of it
                xa, ya, xb, yb = top[0]
                yy, xx = np.mgrid[y0:y1, x0:x1]
                m &= xx < xa + (yy - ya) * (xb - xa) / (yb - ya) - 1
            m = cv2.dilate(m.astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
            if mode == 'ink-red':
                out[y0:y1, x0:x1] = cv2.inpaint(reg, m, 4, cv2.INPAINT_TELEA).astype(np.float32)
            else:      # the light wall: a plane fitted to its own unmasked pixels (Telea would pull in the dark sign below)
                f = reg.astype(np.float32); ok = m == 0
                yy2, xx2 = np.mgrid[0:y1 - y0, 0:x1 - x0]
                A = np.stack([np.ones(ok.sum()), xx2[ok], yy2[ok]], 1)
                pl = np.stack([(np.stack([np.ones_like(xx2), xx2, yy2], -1) @ np.linalg.lstsq(A, f[..., c][ok], rcond=None)[0]) for c in range(3)], -1)
                pl += rng.normal(0, 1.5, pl.shape[:2] + (1,))
                k = (cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), .8) * 1.5).clip(0, 1)[..., None]
                out[y0:y1, x0:x1] = pl * k + f * (1 - k)
            alpha[y0:y1, x0:x1] = np.maximum(alpha[y0:y1, x0:x1], m / 255)
            continue
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
            if mode == 'red':   # fix-r3: never paint above the REAL edge of the popcorn ceiling (per column) - the soffit line
                line = np.maximum(line, ceiling_end(reg)[None, :] - 1)   # alone sat above it and cut straight notches into it
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


def hero_np(crops=None, only=None):
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
    v = HERO_NP   # fix-r3: 'np2' = the round-3 retouch (no straight notches in the popcorn edge, no stubs at the pillar / sign edges)
    jobs = [   # (image, relative path, width or None, fmt, quality)
        (M, f'hero-aisle-band-{v}-3840x2400.jpg', None, 'jpg', 86),
        (Pm, f'hero-aisle-mobile-{v}-1560x3376.jpg', None, 'jpg', 84),
    ]
    if not os.path.exists(os.path.join(SRC, 'og-carson-antiques-mall-np-1200x630.jpg')):   # OG_BOX holds no round-3 change: kept as is
        jobs.append((og, 'og-carson-antiques-mall-np-1200x630.jpg', None, 'jpg', 86))
    jobs += [(M, f'd/hero-aisle-{v}-{w}.{f}', w, f, q) for w in (1440, 1920, 2560, 2880, 3840) for f, q in (('avif', 62), ('webp', 80))]
    jobs += [(M, f'm/hero-aisle-land-{v}-{w}.{f}', w, f, q) for w in (1280, 1920) for f, q in (('avif', 54), ('webp', 70))]
    jobs += [(Pm, f'm/hero-aisle-mobile-{v}-{w}.avif', w, 'avif', 44) for w in (780, 960, 1170, 1560)]
    jobs += [(Pm, f'm/hero-aisle-mobile-{v}-{w}.webp', w, 'webp', 66) for w in (780, 960, 1170, 1560)]   # fix-r3: + the 960 WebP rung
    if only:   # write just these outputs (published files are never re-written)
        jobs = [j for j in jobs if j[1] in only]
    for im, rel, w, fmt, q in jobs:
        out = im if not w or w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        path = os.path.join(SRC, *rel.split('/'))
        save(out, path, fmt, q)
        print(f'{rel:46} {out.width}x{out.height} {os.path.getsize(path) / 1024:8.1f} KB')
    if crops:   # 100 % review crops of the largest shipped encodes around every retouch
        os.makedirs(crops, exist_ok=True)
        for rel, k in ((f'd/hero-aisle-{v}-3840.avif', None), (f'm/hero-aisle-mobile-{v}-1560.avif', PHONE_FROM_MASTER)):
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


# fix-r3 (NOPRICE without smudges): the round-1/2 blur patches read as grey smudges at render size. Each price tag / star is now
# BLANKED instead - the tag, its printed border and the star's red rim stay; only the ink is replaced by a smooth surface fitted to
# the tag's own paper (+ its grain). The Home Goods flag's "10% Off All..." lettering is replaced by a median taken ALONG the flag's
# stripes. New -np3 names (immutable /assets). Needs numpy + opencv-python.
NOPRICE3 = [   # (master, out stem, [(box, kind)], price-dot boxes (Telea), flag, widths, jpeg name)
    ('tile-home-goods-chandeliers-1116x1488.jpg', 'tile-home-goods-chandeliers-np3',
     [((452, 930, 574, 1086), 'cream')], [], True,
     {'480': 480, '720': 720, 'full': 1116}, 'tile-home-goods-chandeliers-np3-1116x1488.jpg'),
    ('marquee-06-oak-wall-telephone-yelp14-750x1000.jpg', 'marquee-06-oak-wall-telephone-yelp14-np3',
     [((340, 130, 492, 228), 'star-strict'), ((540, 800, 600, 866), 'white-inside')],
     [(30, 638, 62, 666), (132, 612, 162, 646), (72, 648, 102, 678), (162, 914, 198, 950), (0, 952, 22, 988)], False,
     {'480': 480, '720': 720}, 'marquee-06-oak-wall-telephone-yelp14-np3-750x1000.jpg'),
    ('marquee-05-mm-dispenser-yelp30-750x1000.jpg', 'marquee-05-mm-dispenser-yelp30-np3',
     [((498, 318, 606, 392), 'star'), ((512, 262, 598, 302), 'white'), ((673, 14, 699, 46), 'white-inside')], [], False,
     {'480': 480, '720': 720}, 'marquee-05-mm-dispenser-yelp30-np3-750x1000.jpg'),
]


def blank_tags(im, jobs):
    """Blank each price tag: keep the tag (and a star's red rim), replace only its ink by a surface fitted to its own paper."""
    import cv2
    import numpy as np
    ell = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    img = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)

    def paper(reg, kind):
        b, g, r = [reg[..., i].astype(int) for i in range(3)]
        mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
        if kind == 'white':
            m = (mx > 165) & (mx - mn < 45)
        elif kind == 'cream':
            m = (r > 110) & (r < 190) & (g > 105) & (g < 185) & (b > 55) & (b < 140) & (r - b > 25)
        elif kind == 'yellow-strict':   # brass bells nearby: only saturated sticker yellow
            m = (r > 190) & (g > 175) & (b < 150) & (r - b > 90) & (g - b > 80)
        else:                           # yellow
            m = (r > 170) & (g > 140) & (b < 150) & (r - b > 70)
        return m.astype(np.uint8)

    def holes_filled(m):
        h, w = m.shape
        ff, mask = m.copy() * 255, np.zeros((h + 2, w + 2), np.uint8)
        for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
            if ff[y, x] == 0:
                cv2.floodFill(ff, mask, (x, y), 128)
        return (ff != 128).astype(np.uint8)

    def biggest(m):
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        return (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)

    rng = np.random.default_rng(11)
    for (x0, y0, x1, y1), kind in jobs:
        reg = img[y0:y1, x0:x1].copy()
        if kind.startswith('star'):    # shape = sticker yellow + red rim; the rim stays, everything inside that is not yellow = ink
            p = paper(reg, 'yellow-strict' if kind == 'star-strict' else 'yellow')
            b, g, r = [reg[..., i].astype(int) for i in range(3)]
            red = ((r > 140) & (r - g > 60) & (r - b > 60)).astype(np.uint8)
            S = holes_filled(biggest(cv2.morphologyEx(p | red, cv2.MORPH_CLOSE, ell(5))))
            tag = cv2.erode(S, ell(5))
            ink = cv2.dilate((cv2.erode(S, ell(9)) & (1 - p)).astype(np.uint8), ell(5)) & tag
        elif kind.endswith('-inside'):  # the box is drawn strictly inside the paper: everything non-paper in it is ink
            p = cv2.morphologyEx(paper(reg, kind[:-7]), cv2.MORPH_OPEN, ell(3))
            tag = np.ones_like(p)
            ink = cv2.dilate((1 - p).astype(np.uint8), ell(5))
        else:                           # a paper tag: its biggest paper blob, holes filled; a border band (printed frame) stays
            p = cv2.morphologyEx(paper(reg, kind), cv2.MORPH_OPEN, ell(3))
            tag = holes_filled(biggest(cv2.morphologyEx(p, cv2.MORPH_CLOSE, ell(9))))
            e, d = (9, 3) if kind == 'cream' else (3, 2)
            ink = cv2.dilate((cv2.erode(tag, ell(2 * e + 1)) & (1 - p)).astype(np.uint8), ell(2 * d + 1)) & cv2.erode(tag, ell(3))
            tag = cv2.erode(tag, ell(3))
        keep = (tag & p & (1 - cv2.dilate(ink, ell(3)))).astype(bool)
        h, w = reg.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        u, v = xx / w, yy / h
        A = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], -1).reshape(-1, 6)
        k, f = keep.reshape(-1), reg.astype(np.float32)
        surf = np.empty_like(f)
        for c in range(3):
            coef, *_ = np.linalg.lstsq(A[k], f[..., c].reshape(-1)[k], rcond=None)
            surf[..., c] = (A @ coef).reshape(h, w)
        surf += rng.normal(0, .6 * min(float((f - surf)[keep].std()), 6), (h, w, 1))
        a = (np.clip(cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 1.2) * 1.6, 0, 1) * tag)[..., None]
        img[y0:y1, x0:x1] = np.clip(surf * a + f * (1 - a), 0, 255).astype(np.uint8)
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def deflag(im, X0=440, Y0=80, X1=620, Y1=230, ang=40.25, box=(488, 120, 552, 190), N=31):
    """Home Goods flag: the "10% Off All..." lettering -> a median ALONG the stripes (stripes rotated level, 1 x N window),
    taken without the canton, the dark background and the lampshade lace; composited only over the lettering."""
    import warnings
    import cv2
    import numpy as np
    img = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    reg = img[Y0:Y1, X0:X1].astype(np.float32)
    h, w = reg.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1)   # 40.25 deg = the angle that levels the stripes (max row variance)
    Mi = cv2.invertAffineTransform(M)
    B, G, R = reg[..., 0], reg[..., 1], reg[..., 2]
    lace = (B > R - 4) & (G > 140)
    valid = ~((R < 80) | lace)
    rot = cv2.warpAffine(reg, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    vr = cv2.warpAffine(valid.astype(np.float32), M, (w, h), flags=cv2.INTER_NEAREST, borderValue=0) > .5
    pad = np.pad(np.where(vr[..., None], rot, np.nan), ((0, 0), (N // 2, N // 2), (0, 0)), constant_values=np.nan)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        med = np.nanmedian(np.lib.stride_tricks.sliding_window_view(pad, N, axis=1), axis=-1)
    back = cv2.warpAffine(np.where(np.isnan(med), rot, med).astype(np.float32), Mi, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    m = np.zeros((h, w), bool)
    m[box[1] - Y0:box[3] - Y0, box[0] - X0:box[2] - X0] = True
    near_lace = cv2.dilate(lace.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(bool)
    letters = (np.abs(reg - back).max(2) > 38) & m & ~near_lace
    letters = cv2.dilate(letters.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))).astype(bool) & m & ~near_lace
    a = np.clip(cv2.GaussianBlur(letters.astype(np.float32), (0, 0), 1.0) * 1.5, 0, 1)[..., None]
    img[Y0:Y1, X0:X1] = np.clip(back * a + reg * (1 - a), 0, 255).astype(np.uint8)
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def noprice3(crops=None):
    for master, stem, jobs, dots, flag, widths, jpg in NOPRICE3:
        src = undot(blank_tags(Image.open(os.path.join(SRC, master)).convert('RGB'), jobs), dots)
        if flag:
            src = deflag(src)
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
        if crops:   # 200 % review crops of the largest shipped AVIF around every tag (+ the flag)
            os.makedirs(crops, exist_ok=True)
            dec = Image.open(os.path.join(SRC, 'm', f'{stem}-{list(widths)[-1]}.avif')).convert('RGB')
            k = dec.width / src.width
            boxes = [b for b, _ in jobs] + ([(488, 120, 552, 190)] if flag else [])
            for i, (x0, y0, x1, y1) in enumerate(boxes):
                bx = (max(0, int((x0 - 40) * k)), max(0, int((y0 - 40) * k)), min(dec.width, int((x1 + 40) * k)), min(dec.height, int((y1 + 40) * k)))
                c = dec.crop(bx)
                c.resize((c.width * 2, c.height * 2), Image.LANCZOS).save(os.path.join(crops, f'crop200-{stem}-{i}.png'))


def lamp_portrait():
    """fix-r3: the phone lamp source. v1's m/band-quotes-portrait is a native 697 px crop (soft at DPR 3, so it was limited to
    <= 395 px). This is the same sticker-free LAMP_BOX crop as the desktop panel (D-24), phone-tuned (AVIF q52 / WebP q72), at
    760 / 1020: 1020 = 2.06x the widest phone card (494 CSS px), so every phone <= 767 px gets it (spec 4.3, AC-23, AC-31)."""
    src = Image.open(os.path.join(SRC, 'band-quotes-oil-lamps-3840x1267.jpg')).convert('RGB').crop(LAMP_BOX)
    for w in (760, 1020):
        im = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
        for fmt, q in (('avif', 52), ('webp', 72)):
            path = os.path.join(SRC, 'm', f'lamp-portrait-{w}.{fmt}')
            save(im, path, fmt, q)
            print(f'm/lamp-portrait-{w}.{fmt} {im.width}x{im.height} {os.path.getsize(path) / 1024:.1f} KB')


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
    if '--lamp-portrait' in sys.argv:
        return lamp_portrait()
    if '--lamp-760' in sys.argv:
        return lamp_760()

    if '--hero-np' in sys.argv:
        return hero_np(sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None)
    if '--noprice3' in sys.argv:
        return noprice3(sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None)
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
