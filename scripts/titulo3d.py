#!/usr/bin/env python3
"""Título 3D de campaña Upper (estilo "Ofertas Black Friday en 🇺🇸").

Reglas que aplica (aprobadas por el equipo, ver agente/conocimiento/direccion-de-arte.md):
- Noland Bold, siempre en mayúsculas.
- El mismo grosor de contorno y de relieve azul oscuro en TODAS las líneas.
- Cada línea arranca donde termina el relieve de la anterior (sin hueco ni encimado) y queda delante de ese relieve.
- Las líneas principales tienen el mismo tamaño de letra; las secundarias se ajustan a un ancho proporcional.
- Bloque centrado e inclinado (4° por defecto).

Requiere solo Pillow:  pip install pillow
Uso:
  python3 scripts/titulo3d.py --salida salidas/titulos/cyber.png \
    --linea "EL VERDADERO:secundaria:claro" --linea "CYBER:principal:verde" \
    --linea "MONDAY:principal:verde" --linea "ES EN:secundaria:claro" --bandera
Cada --linea es TEXTO:principal|secundaria:verde|claro|crema. --bandera agrega la bandera 3D de EE. UU. a la última línea.
Genera <salida>.png con fondo (--fondo blanco|azul|crema) y <salida>-transparente.png.
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "fonts", "Noland-Bold.otf")
FLAG = os.path.join(ROOT, "assets", "titulos", "bandera-usa-3d.png")
COLORS = {"verde": (205, 245, 163, 255), "claro": (0xF1, 0xFA, 0xE2, 255), "crema": (240, 255, 232, 255), "azul": (20, 29, 48, 255)}
NAVY = COLORS["azul"]
FONDOS = {"blanco": (255, 255, 255, 255), "azul": NAVY, "crema": COLORS["crema"]}

p = argparse.ArgumentParser(description="Título 3D de campaña Upper")
p.add_argument("--linea", action="append", required=True, help="TEXTO:principal|secundaria:verde|claro|crema")
p.add_argument("--bandera", action="store_true", help="Agrega la bandera 3D de EE. UU. al final de la última línea")
p.add_argument("--salida", required=True)
p.add_argument("--ancho", type=int, default=1611); p.add_argument("--alto", type=int, default=2000)
p.add_argument("--inclinacion", type=float, default=4)
p.add_argument("--secundaria", type=float, default=.8, help="Ancho de las líneas secundarias respecto de la principal más ancha")
p.add_argument("--fondo", default="blanco", choices=list(FONDOS))
a = p.parse_args()

S, OL, DEPTH = 300, 10, 26          # tamaño base, contorno y relieve: iguales en todas las líneas
lines = []
for spec in a.linea:
    parts = spec.split(":")
    txt = parts[0].upper(); kind = parts[1] if len(parts) > 1 else "principal"; col = parts[2] if len(parts) > 2 else ("verde" if kind == "principal" else "claro")
    lines.append([txt, 1.0 if kind == "principal" else .6, COLORS[col], kind])
flag = Image.open(FLAG).convert("RGBA") if a.bandera else None
probe = ImageDraw.Draw(Image.new("L", (1, 1)))

def width_of(txt, k, with_flag):
    f = ImageFont.truetype(FONT, int(S * k)); bb = probe.textbbox((0, 0), txt, font=f, stroke_width=OL); w = bb[2] - bb[0]
    if with_flag: w += int(S * .08) + int(flag.width * S * k * 1.1 / flag.height)
    return w

last = len(lines) - 1
ref_w = max([width_of(t, k, flag is not None and i == last) for i, (t, k, _, kind) in enumerate(lines) if kind == "principal"] or [width_of(lines[0][0], 1, False)])
for i, ln in enumerate(lines):
    if ln[3] == "secundaria":
        for _ in range(4): ln[1] *= ref_w * a.secundaria / width_of(ln[0], ln[1], flag is not None and i == last)

def render(txt, k, col, extra):
    f = ImageFont.truetype(FONT, int(S * k)); bb = probe.textbbox((0, 0), txt, font=f, stroke_width=OL)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    ew = extra.width + int(S * .08) if extra else 0
    cw, ch = tw + ew + DEPTH + 20, max(th, extra.height if extra else 0) + DEPTH + 20
    off = (ch - DEPTH - 20 - th) // 2; ox, oy = 10 - bb[0], 10 - bb[1] + off
    stroke = Image.new("L", (cw, ch), 0); ImageDraw.Draw(stroke).text((ox, oy), txt, font=f, fill=255, stroke_width=OL, stroke_fill=255)
    fill = Image.new("L", (cw, ch), 0); ImageDraw.Draw(fill).text((ox, oy), txt, font=f, fill=255)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); navy = Image.new("RGBA", (cw, ch), NAVY)
    for i in range(DEPTH, 0, -1): out.paste(navy, (int(i * .4), i), stroke)
    out.paste(navy, (0, 0), stroke); out.paste(Image.new("RGBA", (cw, ch), col), (0, 0), fill)
    if extra: out.alpha_composite(extra, (tw + int(S * .08), (ch - DEPTH - 20 - extra.height) // 2 + 6))
    return out, th, off

blocks = []
for i, (txt, k, col, _) in enumerate(lines):
    extra = None
    if flag is not None and i == last:
        fh = int(S * k * 1.1); extra = flag.resize((int(flag.width * fh / flag.height), fh), Image.LANCZOS)
    blocks.append(render(txt, k, col, extra))

gap = int(DEPTH * .75) - 2 * OL       # la línea siguiente arranca donde termina el relieve de la anterior
canvas = Image.new("RGBA", (a.ancho * 2, a.alto * 2), (0, 0, 0, 0)); y = 100
for img, th, off in blocks:           # de arriba hacia abajo: cada línea queda delante del relieve de la anterior
    canvas.alpha_composite(img, ((canvas.width - img.width) // 2, y - off)); y += th + 2 * OL + gap
g = canvas.crop(canvas.getbbox()).rotate(a.inclinacion, resample=Image.BICUBIC, expand=True)
k = min(a.ancho * .86 / g.width, a.alto * .78 / g.height)
g = g.resize((int(g.width * k), int(g.height * k)), Image.LANCZOS)
t = Image.new("RGBA", (a.ancho, a.alto), (0, 0, 0, 0)); t.alpha_composite(g, ((a.ancho - g.width) // 2, (a.alto - g.height) // 2))
base = os.path.splitext(a.salida)[0]; os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
t.save(base + "-transparente.png")
bg = Image.new("RGBA", (a.ancho, a.alto), FONDOS[a.fondo]); bg.alpha_composite(t); bg.convert("RGB").save(base + ".png")
print(f"Listo: {base}.png y {base}-transparente.png")
