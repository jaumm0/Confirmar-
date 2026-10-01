# -*- coding: utf-8 -*-
"""Golem de Cristal v2 - boss pixel art 128x128, partes separadas,
sombreamento por parte (luz topo-esquerda), olhos/nucleo brilhando."""
from PIL import Image, ImageDraw
import random, os

BASE = os.path.dirname(os.path.abspath(__file__))
W = H = 128
rnd = random.Random(11)

# paleta
OUT     = (26, 16, 38, 255)
STONE_M = (82, 88, 122, 255)    # base pedra
STONE_D = (48, 51, 74, 255)
CRYS_D  = (104, 18, 148, 255)
CRYS_M  = (172, 66, 218, 255)
CRYS_S  = (244, 198, 255, 255)
GLOW    = (255, 157, 226, 255)
GLOW_S  = (255, 230, 252, 255)

def shade(c, f):
    r, g, b, a = c
    if f >= 0:
        return (int(r + (255 - r) * f), int(g + (255 - g) * f), int(b + (255 - b) * f), a)
    return (int(r * (1 + f)), int(g * (1 + f)), int(b * (1 + f)), a)

def draw_part(pts, base, fmax=0.22, fmin=-0.26):
    """desenha um poligono com sombreamento proprio: luz vem de cima-esquerda,
    quantizada em degraus + dither aleatorio nas transicoes"""
    part = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(part)
    pd.polygon(pts, fill=base)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, x1 = max(0, min(xs)), min(W - 1, max(xs))
    y0, y1 = max(0, min(ys)), min(H - 1, max(ys))
    wpx = max(1, x1 - x0); hpx = max(1, y1 - y0)
    pp = part.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = pp[x, y]
            if c[3] == 0: continue
            ty = (y - y0) / hpx; tx = (x - x0) / wpx
            f = fmax * (1 - ty) + fmin * ty - 0.10 * tx
            steps = (-0.30, -0.15, 0.0, 0.15, 0.30)
            fq = min(steps, key=lambda s: abs(f - s))
            if abs(f - fq) > 0.05 and rnd.random() < 0.5:
                fq = steps[min(steps.index(fq) + 1, len(steps) - 1)]
            pp[x, y] = shade(c, fq)
    return part

def crystal(layer, cx, cy, w, h, base=CRYS_M):
    pd = ImageDraw.Draw(layer)
    pd.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)], base)
    pd.polygon([(cx, cy - h), (cx - w, cy), (cx, cy + h)], shade(base, 0.18))
    pd.polygon([(cx, cy - int(h * 0.5)), (cx - int(w * 0.4), cy), (cx, cy + int(h * 0.15))], CRYS_S)

# ---------- camadas ----------
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# bracos atras do torso
img.alpha_composite(draw_part([(10, 102), (26, 106), (28, 124), (16, 126), (6, 114)], STONE_M))
img.alpha_composite(draw_part([(118, 102), (102, 106), (100, 124), (112, 126), (122, 114)], STONE_M))
# garras: 3 espinhos em leque por mao
img.alpha_composite(draw_part([(8, 122), (2, 128), (12, 128)], STONE_M, 0.1, -0.1))
img.alpha_composite(draw_part([(18, 124), (14, 128), (24, 128)], STONE_M, 0.1, -0.1))
img.alpha_composite(draw_part([(26, 120), (24, 128), (32, 126)], STONE_M, 0.1, -0.1))
img.alpha_composite(draw_part([(120, 122), (126, 128), (116, 128)], STONE_M, 0.1, -0.1))
img.alpha_composite(draw_part([(110, 124), (114, 128), (104, 128)], STONE_M, 0.1, -0.1))
img.alpha_composite(draw_part([(102, 120), (104, 128), (96, 126)], STONE_M, 0.1, -0.1))
# ombreiras
img.alpha_composite(draw_part([(6, 84), (40, 76), (48, 100), (30, 114), (6, 102)], STONE_M))
img.alpha_composite(draw_part([(122, 84), (88, 76), (80, 100), (98, 114), (122, 102)], STONE_M))
# torso
img.alpha_composite(draw_part([(38, 82), (90, 82), (98, 112), (84, 126), (44, 126), (30, 112)], STONE_M))
# cabeca
img.alpha_composite(draw_part([(28, 42), (64, 34), (100, 42), (104, 60), (92, 80), (64, 88), (36, 80), (24, 60)], STONE_M))

# cristais da coroa (sobre o elmo)
crystal(img, 32, 34, 7, 22)
crystal(img, 48, 28, 8, 28)
crystal(img, 64, 20, 9, 34)
crystal(img, 80, 28, 8, 28)
crystal(img, 96, 34, 7, 22)
# espinhos de cristal nos ombros
crystal(img, 20, 78, 5, 14)
crystal(img, 108, 78, 5, 14)

# nucleo no peito
crystal(img, 64, 104, 11, 15)

# rachaduras
dd = ImageDraw.Draw(img)
dd.line([(46, 98), (54, 106), (52, 116)], fill=STONE_D, width=1)
dd.line([(84, 96), (76, 108), (80, 118)], fill=STONE_D, width=1)
# costura entre partes (separacao cabeca/torso, torso/ombreira)
dd.line([(30, 82), (98, 82)], fill=STONE_D, width=2)
dd.line([(30, 86), (24, 96)], fill=STONE_D, width=1)
dd.line([(98, 86), (104, 96)], fill=STONE_D, width=1)

# rocha flutuante
for cx, cy, r in [(14, 44, 5), (116, 40, 6), (18, 68, 4), (112, 66, 4)]:
    dd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=STONE_M)

# ---------- sombreamento global: rim light no topo ----------
px = img.load()
for y in range(1, H):
    for x in range(W):
        c = px[x, y]
        if c[3] > 0 and c[:3] != OUT[:3]:
            if px[x, y - 1][3] == 0:
                px[x, y] = shade(c, 0.20)

# speckle
for _ in range(220):
    x, y = rnd.randrange(W), rnd.randrange(H)
    c = px[x, y]
    if c[3] > 0 and y > 44 and abs(x - 64) > 26 and c[:3] != OUT[:3]:
        px[x, y] = shade(c, rnd.choice([-0.22, 0.16]))

# ---------- olhos ----------
def glow_at(cx, cy, radius, strong):
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            r2 = dx * dx + dy * dy
            if r2 > radius * radius: continue
            x, y = cx + dx, cy + dy
            if not (0 <= x < W and 0 <= y < H): continue
            c = px[x, y]
            t = max(0.0, 1.0 - (r2 / float(radius * radius)) ** 0.5)
            col = GLOW_S if t > 0.8 else GLOW
            if c[3] == 0:
                px[x, y] = (*col[:3], int(220 * t))
            else:
                px[x, y] = tuple(min(255, int(a * (1 - t * 0.85) + b * t * 0.85)) for a, b in zip(c[:3], col[:3])) + (c[3],)
    for dx in range(-1, 2):
        for dy in range(-1, 2):
            px[cx + dx, cy + dy] = GLOW_S if strong else GLOW

# socket escuro + olho grande
dd.polygon([(38, 52), (58, 52), (56, 62), (40, 62)], fill=OUT)
dd.polygon([(90, 52), (70, 52), (72, 62), (88, 62)], fill=OUT)
glow_at(48, 57, 7, True)
glow_at(80, 57, 7, True)
# boca brilhante em zigue-zague
for i, (x0, y0, x1, y1) in enumerate([(52, 72, 58, 76), (58, 76, 64, 72), (64, 72, 70, 76), (70, 76, 76, 72)]):
    steps = max(abs(x1 - x0), abs(y1 - y0))
    for s in range(steps + 1):
        xx = x0 + (x1 - x0) * s // max(1, steps)
        yy = y0 + (y1 - y0) * s // max(1, steps)
        px[xx, yy] = GLOW
glow_at(64, 74, 5, False)

# nucleo brilhando
glow_at(64, 104, 9, False)

# ---------- contorno automatico ----------
src = img.copy()
sp = src.load()
for y in range(H):
    for x in range(W):
        if sp[x, y][3] == 0:
            for nx, ny in ((x, y - 1), (x, y + 1), (x - 1, y), (x + 1, y)):
                if 0 <= nx < W and 0 <= ny < H and sp[nx, ny][3] > 0:
                    px[x, y] = OUT
                    break

img.save(os.path.join(BASE, "boss_pixel.png"))
img.resize((W * 6, H * 6), Image.NEAREST).save(os.path.join(BASE, "boss_pixel_preview.png"))
print("ok v2")