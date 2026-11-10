#!/usr/bin/env python3
"""Draws the first-aid diagrams for chapter 18 of the driving notes.

Writes skeleton_{en,ka}.svg and bandages_{en,ka}.svg into the vault's
attachments, in the same style as the other diagrams there. Run, then
rebuild the Rules section with node scripts/build-rules.mjs:

    python3 scripts/draw-first-aid-diagrams.py [attachments folder]
"""
from __future__ import annotations

import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "driving" / "non" / "attachments"

FONT = "Segoe UI, Sylfaen, Noto Sans Georgian, DejaVu Sans, sans-serif"
INK, GREY, LINE, PAPER = "#1F2328", "#5B616B", "#D9D9D2", "#FAFAF7"
GREEN, RED, AMBER = "#2E9E5B", "#D64545", "#E0A100"
BONE, BONE_EDGE = "#F3EFE3", "#6B7079"
SKIN, SKIN_EDGE = "#F4D9C6", "#C99A7E"
WRAP, WRAP_EDGE = "#FFFFFF", "#7D838C"
PAD, PAD_EDGE = "#DCEBFA", "#5B8BC9"


def text(x, y, s, size=14, weight="normal", fill=INK, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" '
            f'text-anchor="{anchor}" fill="{fill}">{escape(s)}</text>')


def wrapped(x, y, s, width_chars, size=13, fill=GREY, gap=17):
    lines, line = [], ""
    for word in s.split():
        if line and len(line) + 1 + len(word) > width_chars:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    lines.append(line)
    return "".join(text(x, y + i * gap, ln, size, fill=fill) for i, ln in enumerate(lines))


def frame(w, h, title, subtitle):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'font-family="{FONT}">'
            f'<rect x="1" y="1" width="{w - 2}" height="{h - 2}" rx="14" fill="{PAPER}" stroke="{LINE}" stroke-width="2"/>'
            + text(24, 36, title, 19, "bold") + text(24, 60, subtitle, 14, fill=GREY))


# ---------------------------------------------------------------- skeleton

def bone(x1, y1, x2, y2, w):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{BONE_EDGE}" stroke-width="{w + 3}" stroke-linecap="round"/>'
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{BONE}" stroke-width="{w}" stroke-linecap="round"/>')


def zone(x1, y1, x2, y2, colour, w=34):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-opacity="0.18" '
            f'stroke-width="{w}" stroke-linecap="round"/>')


def mirror(x):
    return 700 - x


def skeleton_body():
    parts = []
    # One-bone (green) and two-bone (red) zones behind the limbs
    for flip in (lambda x: x, mirror):
        parts.append(zone(flip(262), 232, flip(246), 366, GREEN))
        parts.append(zone(flip(318), 486, flip(306), 632, GREEN, 38))
        parts.append(zone(flip(246), 388, flip(234), 510, RED, 40))
        parts.append(zone(flip(312), 662, flip(316), 826, RED, 40))

    # Skull and jaw
    parts.append(f'<path d="M322,150 Q326,186 350,190 Q374,186 378,150" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
    parts.append(f'<ellipse cx="350" cy="122" rx="38" ry="44" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
    for cx in (335, 365):
        parts.append(f'<ellipse cx="{cx}" cy="122" rx="9" ry="8" fill="{BONE_EDGE}" fill-opacity="0.55"/>')
    parts.append(f'<path d="M350,132 L345,145 L355,145 Z" fill="{BONE_EDGE}" fill-opacity="0.55"/>')
    parts.append(f'<line x1="336" y1="162" x2="364" y2="162" stroke="{BONE_EDGE}" stroke-width="2"/>')

    # Spine: neck, chest and lower back vertebrae
    for y in range(194, 222, 7):
        parts.append(f'<rect x="343" y="{y}" width="14" height="5" rx="2" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2"/>')
    for y in range(322, 404, 12):
        parts.append(f'<rect x="341" y="{y}" width="18" height="9" rx="3" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2"/>')

    # Ribs, then the breastbone over them
    for i, reach in enumerate((48, 58, 66, 70, 70, 66, 58)):
        y = 236 + i * 13
        for side in (-1, 1):
            parts.append(f'<path d="M350,{y} Q{350 + side * (reach + 6)},{y - 4} {350 + side * reach},{y + 24}" '
                         f'fill="none" stroke="{BONE_EDGE}" stroke-width="7" stroke-linecap="round"/>'
                         f'<path d="M350,{y} Q{350 + side * (reach + 6)},{y - 4} {350 + side * reach},{y + 24}" '
                         f'fill="none" stroke="{BONE}" stroke-width="4" stroke-linecap="round"/>')
    parts.append(f'<rect x="342" y="226" width="16" height="92" rx="7" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')

    # Collarbones
    for flip in (lambda x: x, mirror):
        parts.append(bone(flip(342), 222, flip(268), 214, 8))

    # Pelvis
    for side in (-1, 1):
        def px(dx, s=side):
            return 350 + s * dx
        parts.append(f'<path d="M350,406 C{px(40)},392 {px(68)},400 {px(68)},428 C{px(68)},452 {px(50)},468 {px(24)},476 '
                     f'C{px(14)},478 {px(6)},472 350,462 Z" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        parts.append(f'<ellipse cx="{px(22)}" cy="458" rx="7" ry="9" fill="{PAPER}" stroke="{BONE_EDGE}" stroke-width="2"/>')

    for flip in (lambda x: x, mirror):
        # Arm: upper-arm bone, then the two forearm bones, then the hand
        parts.append(f'<circle cx="{flip(262)}" cy="224" r="11" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        parts.append(bone(flip(262), 232, flip(246), 366, 12))
        parts.append(f'<circle cx="{flip(245)}" cy="377" r="9" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        parts.append(bone(flip(239), 388, flip(226), 508, 6))
        parts.append(bone(flip(252), 388, flip(242), 510, 6))
        parts.append(f'<rect x="{min(flip(222), flip(250))}" y="514" width="28" height="13" rx="5" fill="{BONE}" '
                     f'stroke="{BONE_EDGE}" stroke-width="2"/>')
        parts.append(f'<path d="M{flip(221)},530 L{flip(251)},530 L{flip(249)},562 L{flip(223)},562 Z" fill="{BONE}" '
                     f'stroke="{BONE_EDGE}" stroke-width="2"/>')
        for i, fx in enumerate((225, 232, 240, 247)):
            parts.append(bone(flip(fx), 566, flip(fx - 2 + (i - 1.5)), 594 - abs(i - 1.5) * 4, 3))
        parts.append(bone(flip(221), 538, flip(208), 562, 3))

        # Leg: thigh bone, kneecap, the two shin bones, then the foot
        parts.append(f'<circle cx="{flip(320)}" cy="478" r="10" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        parts.append(bone(flip(318), 486, flip(306), 632, 13))
        parts.append(f'<circle cx="{flip(305)}" cy="646" r="10" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        parts.append(bone(flip(306), 660, flip(310), 826, 10))
        parts.append(bone(flip(323), 664, flip(325), 822, 5))
        parts.append(f'<path d="M{flip(302)},836 L{flip(324)},836 L{flip(330)},870 Q{flip(332)},886 {flip(316)},886 '
                     f'L{flip(290)},886 Q{flip(278)},884 {flip(284)},870 Z" fill="{BONE}" stroke="{BONE_EDGE}" stroke-width="2.5"/>')
        for tx in (288, 296, 304, 312, 320):
            parts.append(f'<line x1="{flip(tx)}" y1="874" x2="{flip(tx)}" y2="884" stroke="{BONE_EDGE}" stroke-width="1.5"/>')

    # Carotid pulse point
    parts.append(f'<circle cx="338" cy="204" r="10" fill="{RED}" fill-opacity="0.2"/>'
                 f'<circle cx="338" cy="204" r="5" fill="{RED}"/>')
    # Tourniquet bands on the upper arm and the thigh
    for flip in (lambda x: x, mirror):
        parts.append(f'<line x1="{flip(238)}" y1="300" x2="{flip(270)}" y2="304" stroke="{GREEN}" stroke-width="8" stroke-linecap="round"/>')
        parts.append(f'<line x1="{flip(294)}" y1="540" x2="{flip(334)}" y2="543" stroke="{GREEN}" stroke-width="8" stroke-linecap="round"/>')
    return "".join(parts)


def label(side, y, point, name, note):
    px, py = point
    if side == "left":
        lx, anchor, tx = max(196, 34 + len(name) * 9.8), "start", 24
    else:
        lx, anchor, tx = 504, "end", 676
    return (f'<path d="M{lx},{y - 5} L{px},{py}" stroke="{GREY}" stroke-width="1.3" fill="none"/>'
            f'<circle cx="{px}" cy="{py}" r="3" fill="{INK}"/>'
            + text(tx, y, name, 15, "bold", anchor=anchor)
            + (text(tx, y + 17, note, 12.5, fill=GREY, anchor=anchor) if note else ""))


SKELETON = {
    "en": {
        "title": "The skeleton: what is where",
        "subtitle": "Green: one bone, a tourniquet works. Red: two bones, go higher.",
        "left": [
            (104, (316, 112), "Skull", "head injury: lie on the side"),
            (176, (338, 204), "Carotid artery", "check the pulse here"),
            (240, (296, 218), "Collarbone", "broken: transport sitting"),
            (304, (255, 306), "Upper-arm bone", "1 bone: tourniquet here"),
            (372, (245, 377), "Elbow", "joint"),
            (446, (234, 450), "Forearm: 2 bones", "tourniquet above the elbow"),
            (560, (236, 552), "Wrist and hand", ""),
            (744, (310, 744), "Shin: 2 bones", "tourniquet on the thigh"),
            (838, (314, 840), "Ankle joint", "figure-of-eight bandage"),
        ],
        "right": [
            (150, (370, 168), "Lower jaw", "neck hurt: hold the jaw still"),
            (210, (357, 204), "Neck vertebrae", "don't move the head or neck"),
            (270, (358, 272), "Breastbone", "broken: sitting or half-sitting"),
            (330, (414, 300), "Ribs", "broken: sitting or half-sitting"),
            (392, (359, 380), "Spine", "on the back, hard flat surface"),
            (452, (408, 430), "Pelvis", "on the back, roll under knees"),
            (622, (392, 610), "Thigh bone", "1 bone: tourniquet here"),
            (684, (396, 648), "Knee", "joint: figure-of-eight"),
            (872, (374, 872), "Foot", ""),
        ],
        "legend": ["One bone: a tourniquet presses the artery", "Two bones: the artery hides between them",
                   "Pulse point (carotid artery)"],
    },
    "ka": {
        "title": "ჩონჩხი: რა სად არის",
        "subtitle": "მწვანე: ერთი ძვალი, ლახტი მუშაობს. წითელი: ორი ძვალი, აიტანე ზემოთ.",
        "left": [
            (104, (316, 112), "თავის ქალა", "თავის ტრავმა: გვერდზე"),
            (176, (338, 204), "საძილე არტერია", "აქ ამოწმებ პულსს"),
            (240, (296, 218), "ლავიწი", "მოტეხილი: მჯდომარე"),
            (304, (255, 306), "მხრის ძვალი", "1 ძვალი: ლახტი აქ"),
            (372, (245, 377), "იდაყვი", "სახსარი"),
            (446, (234, 450), "წინამხარი: 2 ძვალი", "ლახტი იდაყვის ზემოთ"),
            (560, (236, 552), "მაჯა და მტევანი", ""),
            (744, (310, 744), "წვივი: 2 ძვალი", "ლახტი ბარძაყზე"),
            (838, (314, 840), "წვივ-ტერფის სახსარი", "რვიანისებური სახვევი"),
        ],
        "right": [
            (150, (370, 168), "ქვედა ყბა", "კისრის ტრავმა: დააფიქსირე"),
            (210, (357, 204), "კისრის მალები", "თავი და კისერი არ ამოძრაო"),
            (270, (358, 272), "მკერდის ძვალი", "მოტეხილი: მჯდომარე"),
            (330, (414, 300), "ნეკნები", "მოტეხილი: ნახევრად მჯდომარე"),
            (392, (359, 380), "ხერხემალი", "ზურგზე, მაგარ ზედაპირზე"),
            (452, (408, 430), "მენჯი", "ზურგზე, მუხლებქვეშ საფენი"),
            (622, (392, 610), "ბარძაყის ძვალი", "1 ძვალი: ლახტი აქ"),
            (684, (396, 648), "მუხლი", "სახსარი: რვიანისებური"),
            (872, (374, 872), "ტერფი", ""),
        ],
        "legend": ["ერთი ძვალი: ლახტი არტერიას აწვება", "ორი ძვალი: არტერია მათ შორისაა",
                   "პულსის წერტილი (საძილე არტერია)"],
    },
}


def skeleton(lang):
    t = SKELETON[lang]
    svg = frame(700, 990, t["title"], t["subtitle"]) + skeleton_body()
    svg += "".join(label("left", *row) for row in t["left"])
    svg += "".join(label("right", *row) for row in t["right"])
    y = 918
    svg += (f'<rect x="24" y="{y}" width="652" height="54" rx="10" fill="#fff" stroke="{LINE}" stroke-width="2"/>'
            f'<rect x="40" y="{y + 12}" width="16" height="12" rx="3" fill="{GREEN}" fill-opacity="0.45"/>'
            + text(64, y + 23, t["legend"][0], 13)
            + f'<rect x="40" y="{y + 32}" width="16" height="12" rx="3" fill="{RED}" fill-opacity="0.45"/>'
            + text(64, y + 43, t["legend"][1], 13)
            + f'<circle cx="400" cy="{y + 18}" r="5" fill="{RED}"/>'
            + text(412, y + 23, t["legend"][2], 13))
    return svg + "</svg>"


# ---------------------------------------------------------------- bandages

def limb(ox, oy, x=10, y=58, w=100, h=46):
    return f'<rect x="{ox + x}" y="{oy + y}" width="{w}" height="{h}" rx="{h / 2}" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>'


def strip(points):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return f'<polygon points="{pts}" fill="{WRAP}" stroke="{WRAP_EDGE}" stroke-width="1.5" stroke-linejoin="round"/>'


def band_line(x1, y1, x2, y2, w=10):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{WRAP_EDGE}" stroke-width="{w + 3}" stroke-linecap="round"/>'
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{WRAP}" stroke-width="{w}" stroke-linecap="round"/>')


def draw_circular(ox, oy):
    out = limb(ox, oy)
    for i in range(3):
        out += strip([(ox + 48 + i, oy + 55 + i), (ox + 72 + i, oy + 55 + i), (ox + 72 + i, oy + 107 + i), (ox + 48 + i, oy + 107 + i)])
    return out


def draw_spiral(ox, oy):
    out = limb(ox, oy)
    for i in range(5):
        x0 = ox + 16 + i * 15
        out += strip([(x0, oy + 55), (x0 + 22, oy + 55), (x0 + 34, oy + 107), (x0 + 12, oy + 107)])
    return out


def draw_figure_eight(ox, oy):
    out = (f'<rect x="{ox + 40}" y="{oy + 4}" width="36" height="116" rx="16" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>'
           f'<path d="M{ox + 40},{oy + 104} L{ox + 40},{oy + 140} L{ox + 108},{oy + 140} Q{ox + 116},{oy + 126} {ox + 104},{oy + 120} '
           f'L{ox + 76},{oy + 108} Z" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>')
    out += band_line(ox + 38, oy + 84, ox + 78, oy + 84)
    out += band_line(ox + 42, oy + 92, ox + 100, oy + 134)
    out += band_line(ox + 76, oy + 92, ox + 46, oy + 136)
    out += band_line(ox + 50, oy + 136, ox + 100, oy + 128)
    return out


def draw_spica(ox, oy):
    out = (f'<path d="M{ox + 8},{oy + 30} Q{ox + 60},{oy + 8} {ox + 92},{oy + 34} L{ox + 104},{oy + 140} L{ox + 62},{oy + 140} '
           f'L{ox + 52},{oy + 70} Q{ox + 30},{oy + 58} {ox + 8},{oy + 62} Z" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>')
    for i in range(4):
        y = oy + 46 + i * 20
        out += band_line(ox + 50 + i * 2, y, ox + 76 + i * 2, y + 18, 8)
        out += band_line(ox + 76 + i * 2, y + 18, ox + 102 + i, y - 2, 8)
    return out


def draw_sling(ox, oy):
    out = (f'<circle cx="{ox + 60}" cy="{oy + 78}" r="48" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>'
           f'<circle cx="{ox + 44}" cy="{oy + 64}" r="4" fill="{INK}"/><circle cx="{ox + 76}" cy="{oy + 64}" r="4" fill="{INK}"/>'
           f'<path d="M{ox + 52},{oy + 108} Q{ox + 60},{oy + 114} {ox + 68},{oy + 108}" fill="none" stroke="{SKIN_EDGE}" stroke-width="2"/>')
    for sx, ex in ((ox + 34, ox + 4), (ox + 86, ox + 116)):
        out += band_line(sx, oy + 80, ex, oy + 56, 7)
        out += band_line(sx, oy + 92, ex, oy + 116, 7)
    out += strip([(ox + 34, oy + 76), (ox + 86, oy + 76), (ox + 86, oy + 96), (ox + 34, oy + 96)])
    return out


def draw_pressure(ox, oy):
    out = limb(ox, oy)
    out += f'<rect x="{ox + 46}" y="{oy + 62}" width="28" height="38" rx="4" fill="{PAD}" stroke="{PAD_EDGE}" stroke-width="2"/>'
    for i in range(4):
        out += strip([(ox + 40 + i * 11, oy + 56), (ox + 54 + i * 11, oy + 56), (ox + 54 + i * 11, oy + 106), (ox + 40 + i * 11, oy + 106)])
    out += (f'<path d="M{ox + 60},{oy + 16} L{ox + 60},{oy + 44}" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M{ox + 52},{oy + 36} L{ox + 60},{oy + 48} L{ox + 68},{oy + 36}" fill="none" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M{ox + 92},{oy + 112} q4,8 0,12 q-4,-4 0,-12 z" fill="#8B1E1E"/>')
    return out


def draw_arm_sling(ox, oy):
    out = (f'<circle cx="{ox + 60}" cy="{oy + 22}" r="17" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>'
           f'<rect x="{ox + 22}" y="{oy + 42}" width="76" height="110" rx="18" fill="{SKIN}" stroke="{SKIN_EDGE}" stroke-width="2"/>'
           f'<path d="M{ox + 26},{oy + 52} L{ox + 22},{oy + 112} L{ox + 88},{oy + 96}" fill="none" stroke="{SKIN_EDGE}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>'
           f'<path d="M{ox + 26},{oy + 52} L{ox + 22},{oy + 112} L{ox + 88},{oy + 96}" fill="none" stroke="{SKIN}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>')
    out += strip([(ox + 48, oy + 40), (ox + 72, oy + 40), (ox + 98, oy + 100), (ox + 20, oy + 124)])
    out += band_line(ox + 50, oy + 40, ox + 70, oy + 40, 6)
    return out


def draw_tourniquet(ox, oy):
    out = limb(ox, oy)
    out += (f'<rect x="{ox + 36}" y="{oy + 54}" width="12" height="54" rx="3" fill="#3A3F47"/>'
            f'<rect x="{ox + 20}" y="{oy + 18}" width="46" height="24" rx="5" fill="#fff" stroke="{INK}" stroke-width="1.5"/>'
            + text(ox + 43, oy + 35, "14:35", 13, "bold", anchor="middle")
            + f'<line x1="{ox + 42}" y1="{oy + 42}" x2="{ox + 42}" y2="{oy + 54}" stroke="{INK}" stroke-width="1.5"/>'
            f'<ellipse cx="{ox + 86}" cy="{oy + 80}" rx="7" ry="10" fill="{RED}"/>')
    for dx, dy in ((10, -16), (16, -6), (14, 8)):
        out += f'<line x1="{ox + 92}" y1="{oy + 78}" x2="{ox + 92 + dx}" y2="{oy + 78 + dy}" stroke="{RED}" stroke-width="3" stroke-linecap="round"/>'
    return out


BANDAGES = {
    "en": {
        "title": "Bandages: which one goes where",
        "subtitle": "Always start with a sterile pad on the wound, then bandage over it.",
        "exam_yes": "Exam: ankle ✓",
        "exam_no": "Exam: ankle ✗",
        "wrap": 23,
        "pill": 7.6,
        "panels": [
            (draw_circular, "Circular", "Turns on the same spot. Starts and ends every bandage. Wrist, forehead, neck.", None),
            (draw_spiral, "Spiral", "Each turn covers half of the one before. Arm or leg, chest.", None),
            (draw_figure_eight, "Figure-of-eight", "Crosses like an 8 over a joint: ankle, wrist, knee, elbow.", "yes"),
            (draw_spica, "Spica", "Stacked V's like an ear of wheat. Shoulder, hip, thumb.", "no"),
            (draw_sling, "Sling-type", "One strip with 4 tails, tied at the back of the head. Nose, chin.", "no"),
            (draw_pressure, "Pressure bandage", "Pad, then tight turns right on the wound. Venous bleeding, head wound in the hair.", None),
            (draw_arm_sling, "Arm sling", "Broken arm, no splint: elbow bent, hung from the neck, bandaged to the body.", None),
            (draw_tourniquet, "Tourniquet", "Bright red, spurting blood. Above the wound, on one bone. Write the time.", None),
        ],
    },
    "ka": {
        "title": "სახვევები: რომელი სად",
        "subtitle": "ჯერ ჭრილობაზე სტერილური საფენი, მერე ზემოდან სახვევი.",
        "exam_yes": "წვივ-ტერფზე ✓",
        "exam_no": "წვივ-ტერფზე ✗",
        "wrap": 20,
        "pill": 9.2,
        "panels": [
            (draw_circular, "წრიული", "ხვევა ერთსა და იმავე ადგილზე. ყველა სახვევი ამით იწყება და მთავრდება. მაჯა, შუბლი, კისერი.", None),
            (draw_spiral, "სპირალური", "ყოველი ხვევა წინას ნახევარს ფარავს. ხელი ან ფეხი, გულმკერდი.", None),
            (draw_figure_eight, "რვიანისებური", "სახსარზე რვიანივით გადაიჯვარედინება: წვივ-ტერფი, მაჯა, მუხლი, იდაყვი.", "yes"),
            (draw_spica, "თავთავისებური", "ერთმანეთზე დალაგებული V-ები, თავთავივით. მხარი, მენჯ-ბარძაყი, ცერი.", "no"),
            (draw_sling, "შურდულისებური", "ერთი ზოლი 4 ბოლოთი, თავს უკან იკვრება. ცხვირი, ნიკაპი.", "no"),
            (draw_pressure, "დამწოლი", "საფენი, ზემოდან მჭიდრო ხვევა უშუალოდ ჭრილობაზე. ვენური სისხლდენა, თავის თმიანი ნაწილი.", None),
            (draw_arm_sling, "ხელის ჩამოკიდება", "ხელის მოტეხილობა, არტაშანი არ გაქვს: იდაყვში მოხრილი, კისერზე ჩამოკიდებული, ტანზე მიმაგრებული.", None),
            (draw_tourniquet, "ლახტი", "ალისფერი, პულსირებული სისხლი. ჭრილობის ზემოთ, ერთ ძვალზე. ჩაიწერე დრო.", None),
        ],
    },
}


def bandages(lang):
    t = BANDAGES[lang]
    w, cols, pw, ph, top = 700, 2, 318, 186, 80
    rows = (len(t["panels"]) + cols - 1) // cols
    h = top + rows * (ph + 14) + 10
    svg = frame(w, h, t["title"], t["subtitle"])
    for i, (draw, name, use, exam) in enumerate(t["panels"]):
        x = 24 + (i % cols) * (pw + 16)
        y = top + (i // cols) * (ph + 14)
        svg += f'<rect x="{x}" y="{y}" width="{pw}" height="{ph}" rx="10" fill="#fff" stroke="{LINE}" stroke-width="2"/>'
        svg += draw(x + 8, y + 18)
        svg += text(x + 140, y + 30, name, 16, "bold")
        svg += wrapped(x + 140, y + 54, use, t["wrap"])
        if exam:
            colour = GREEN if exam == "yes" else RED
            label = t["exam_yes"] if exam == "yes" else t["exam_no"]
            svg += (f'<rect x="{x + 140}" y="{y + ph - 34}" width="{len(label) * t['pill'] + 18}" height="22" rx="11" fill="{colour}"/>'
                    + text(x + 149, y + ph - 18, label, 12.5, "bold", "#fff"))
    return svg + "</svg>"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("en", "ka"):
        (OUT / f"skeleton_{lang}.svg").write_text(skeleton(lang), encoding="utf-8", newline="\n")
        (OUT / f"bandages_{lang}.svg").write_text(bandages(lang), encoding="utf-8", newline="\n")
        print(f"wrote skeleton_{lang}.svg, bandages_{lang}.svg")


if __name__ == "__main__":
    main()
