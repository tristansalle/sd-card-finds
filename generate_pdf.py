#!/usr/bin/env python3
"""
Génère un PDF prêt à imprimer — une photo par page, format 170 × 220 mm portrait + 3mm fond perdu.
2 pages par feuille A3.

Usage :
    python3 generate_pdf.py                     → toutes les cartes
    python3 generate_pdf.py --cartes 01 14      → uniquement carte_01 et carte_14
    python3 generate_pdf.py --limit 20          → 20 premières photos (test)
"""

import json
import argparse
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from PIL import Image as PILImage, ImageOps

# ── CONFIG ────────────────────────────────────────────────────────────────────
DATA_DIR   = Path("/Users/tristan/Desktop/PROJET SD ")
IMAGES_DIR = DATA_DIR / "images"
OUTPUT_PDF = DATA_DIR / "edition_sd_cards.pdf"

BLEED       = 3 * mm
MARK_OFFSET = 2 * mm    # espace entre le bord trim et le trait de coupe
MARK_LEN    = 5 * mm    # longueur des traits de coupe

PAGE_W      = 170 * mm  # largeur trim
PAGE_H      = 210 * mm  # hauteur trim
FULL_W      = PAGE_W + 2 * BLEED
FULL_H      = PAGE_H + 2 * BLEED

MARGIN_L    = 30 * mm
MARGIN_R    = 15 * mm        # zone texte vertical à droite (photo finit à 155mm)
MARGIN_T    = 8  * mm
MARGIN_B    = 8  * mm
META_H      = 11 * mm        # hauteur de l'en-tête : 8pt + 14pt leading + 8pt → photo_h = 183mm

FONT_META   = 8              # taille police métadonnées
FONT_VERT   = 8              # taille police texte vertical

MOIS = ['janvier','février','mars','avril','mai','juin',
        'juillet','août','septembre','octobre','novembre','décembre']

# ── HELPERS ───────────────────────────────────────────────────────────────────

def find_image(dossier, fichier):
    if not dossier or not fichier:
        return None
    parts = dossier.split(' // ')
    if len(parts) < 2:
        return None
    carte_raw, subfolder = parts[0], parts[1]
    try:
        carte_num = str(int(carte_raw.replace('CARTE_', ''))).zfill(2)
    except ValueError:
        return None
    path = IMAGES_DIR / f"carte_{carte_num}" / subfolder / fichier
    return path if path.exists() else None

def format_date(date_str):
    if not date_str:
        return "Inconnue"
    parts = date_str.split('-')
    try:
        return f"{int(parts[2])} {MOIS[int(parts[1])-1]} {parts[0]}"
    except Exception:
        return date_str

def draw_page(c, photo):
    dossier   = photo.get('dossier', '') or ''
    fichier   = photo.get('fichier', '') or ''
    date_raw  = photo.get('date', '') or ''
    lieu      = photo.get('lieu', '') or photo.get('ville', '') or 'Inconnu'
    tags_raw  = photo.get('tags', '')

    parts     = dossier.split(' // ')
    carte     = parts[0] if parts else ''
    subfolder = parts[1] if len(parts) > 1 else ''
    dossier_display = f"{carte} / {subfolder}" if subfolder else carte

    if isinstance(tags_raw, list):
        tags = ', '.join(tags_raw) if tags_raw else 'Aucun'
    else:
        tags = str(tags_raw).strip() if tags_raw else 'Aucun'

    # Fond blanc (fond perdu inclus)
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, FULL_W, FULL_H, fill=1, stroke=0)

    ox = BLEED   # décalage gauche (fond perdu)
    oy = BLEED   # décalage bas

    # ── EN-TÊTE ──────────────────────────────────────────────
    top_y = oy + PAGE_H - MARGIN_T
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", FONT_META)

    # TAGS (gauche) + DATE (droite)
    right_edge = ox + PAGE_W - MARGIN_R
    c.drawString(ox + MARGIN_L, top_y, f"TAGS: {tags}")
    c.drawRightString(right_edge, top_y, f"DATE: {date_raw}")

    # LIEU (deuxième ligne) — interlignage 14pt
    c.drawString(ox + MARGIN_L, top_y - 14, f"LIEU: {lieu}")

    # ── ZONE PHOTO ───────────────────────────────────────────
    photo_x = ox + MARGIN_L
    photo_y = oy + MARGIN_B
    photo_w = PAGE_W - MARGIN_L - MARGIN_R
    photo_h = PAGE_H - MARGIN_T - META_H - MARGIN_B

    img_path = find_image(dossier, fichier)

    if img_path:
        try:
            with PILImage.open(img_path) as pil_img:
                pil_img = ImageOps.exif_transpose(pil_img)
                iw, ih = pil_img.size

            W125   = 125 * mm
            draw_x = photo_x   # ferré à gauche (commence à 30mm)
            draw_y = photo_y   # ferré en bas

            if iw > ih:
                # Paysage → rotation 90° CCW : gauche de la photo vers le bas
                disp_w = W125
                disp_h = iw * (W125 / ih)
                c.saveState()
                clip = c.beginPath()
                clip.rect(draw_x, draw_y, disp_w, photo_h)
                c.clipPath(clip, stroke=0, fill=0)
                c.translate(draw_x + disp_w, draw_y)
                c.rotate(90)
                c.drawImage(str(img_path), 0, 0, width=disp_h, height=disp_w,
                            preserveAspectRatio=False)
                c.restoreState()
            else:
                # Portrait → pas de rotation
                disp_w = W125
                disp_h = ih * (W125 / iw)
                c.saveState()
                clip = c.beginPath()
                clip.rect(draw_x, draw_y, disp_w, photo_h)
                c.clipPath(clip, stroke=0, fill=0)
                c.drawImage(str(img_path), draw_x, draw_y, disp_w, disp_h,
                            preserveAspectRatio=False)
                c.restoreState()
        except Exception:
            _draw_placeholder(c, photo_x, photo_y, photo_w, photo_h)
    else:
        _draw_placeholder(c, photo_x, photo_y, photo_w, photo_h)

    # ── TEXTE VERTICAL DROITE ────────────────────────────────
    strip_x = ox + PAGE_W - MARGIN_R + 8 * mm
    c.setFont("Helvetica-Bold", FONT_VERT)
    c.setFillColorRGB(0, 0, 0)

    # FICHIER — partie haute du strip
    fichier_start_y = photo_y + photo_h * 0.45
    c.saveState()
    c.translate(strip_x, fichier_start_y)
    c.rotate(90)
    c.drawString(0, 0, f"FICHIER: {fichier}")
    c.restoreState()

    # DOSSIER — commence à 8mm du bas, aligné avec la photo
    dossier_start_y = photo_y
    c.saveState()
    c.translate(strip_x, dossier_start_y)
    c.rotate(90)
    c.drawString(0, 0, f"DOSSIER: {dossier_display}")
    c.restoreState()

    draw_crop_marks(c)

def draw_crop_marks(c):
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.4)
    inset    = 2.0 * mm        # gap entre fin du trait et ligne de coupe
    mark_end = BLEED - inset   # traits vont de 0 → 2.5 mm dans le fond perdu

    tx,  ty  = BLEED, BLEED
    tx2, ty2 = BLEED + PAGE_W, BLEED + PAGE_H

    # Coin bas-gauche
    c.line(0,  ty,  mark_end, ty)
    c.line(tx, 0,   tx, mark_end)
    # Coin bas-droit
    c.line(FULL_W,         ty,  FULL_W - mark_end, ty)
    c.line(tx2, 0,         tx2, mark_end)
    # Coin haut-gauche
    c.line(0,  ty2, mark_end,        ty2)
    c.line(tx, FULL_H, tx, FULL_H - mark_end)
    # Coin haut-droit
    c.line(FULL_W,         ty2, FULL_W - mark_end, ty2)
    c.line(tx2, FULL_H,    tx2, FULL_H - mark_end)


def _draw_placeholder(c, x, y, w, h):
    c.setFillColorRGB(0.92, 0.92, 0.92)
    c.rect(x, y, w, h, fill=1, stroke=0)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.setFont("Courier", 7)
    c.drawCentredString(x + w / 2, y + h / 2, "[ FICHIER MANQUANT ]")

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cartes', nargs='+', help='Numéros de cartes à inclure (ex: 01 14)')
    parser.add_argument('--limit', type=int, help='Limiter à N photos (test)')
    parser.add_argument('--output', default=str(OUTPUT_PDF), help='Chemin du PDF de sortie')
    args = parser.parse_args()

    all_photos = []
    for num in range(1, 17):
        pad = str(num).zfill(2)
        if args.cartes and pad not in args.cartes:
            continue
        json_path = DATA_DIR / f"data_carte_{pad}.json"
        if json_path.exists() and json_path.stat().st_size > 5:
            with open(json_path, encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    all_photos.extend(data)
                except json.JSONDecodeError:
                    pass

    photos = [p for p in all_photos if p.get('dossier') and p.get('fichier')]
    if args.limit:
        photos = photos[:args.limit]

    print(f"{len(photos)} photos → {args.output}")

    out = Path(args.output)
    c = canvas.Canvas(str(out), pagesize=(FULL_W, FULL_H))

    for i, photo in enumerate(photos):
        if i % 100 == 0:
            print(f"  {i}/{len(photos)}...")
        draw_page(c, photo)
        c.showPage()

    c.save()
    print(f"✓ PDF généré ({len(photos)} pages) : {out}")

if __name__ == '__main__':
    main()
