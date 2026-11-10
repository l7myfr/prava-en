#!/usr/bin/env python3
"""Draws the special traffic lights for chapter 10 of the driving notes.

Writes special_lights_{en,ka}.svg into the vault's attachments, in the same
style as the first-aid diagrams (whose helpers it reuses). Run, then rebuild
the Rules section with node scripts/build-rules.mjs:

    python3 scripts/draw-traffic-light-diagrams.py [attachments folder]
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "first_aid", Path(__file__).with_name("draw-first-aid-diagrams.py"))
style = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(style)
text, wrapped, frame = style.text, style.wrapped, style.frame
INK, GREY, LINE = style.INK, style.GREY, style.LINE

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else style.OUT

HOUSING, OFF = "#2B2F36", "#4A4F57"
RED, YELLOW, GREEN, WHITE = "#E5484D", "#F5B400", "#2EBF6B", "#FFF1B8"


def lamp(cx, cy, colour=OFF, r=14, glow=False):
    out = ""
    if glow:
        out += f'<circle cx="{cx}" cy="{cy}" r="{r + 5}" fill="{colour}" fill-opacity="0.25"/>'
    return out + f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{colour}"/>'


def arrow(cx, cy, angle, colour, size=10, outline=False):
    """An arrow pointing up, turned by angle degrees (90 = right)."""
    s = size
    pts = f"0,{-s} {s * 0.75},{-s * 0.1} {s * 0.28},{-s * 0.1} {s * 0.28},{s} {-s * 0.28},{s} {-s * 0.28},{-s * 0.1} {-s * 0.75},{-s * 0.1}"
    paint = f'fill="none" stroke="{colour}" stroke-width="1.8"' if outline else f'fill="{colour}"'
    return (f'<polygon points="{pts}" {paint} stroke-linejoin="round" '
            f'transform="translate({cx},{cy}) rotate({angle})"/>')


def head(x, y, lit=(None, None, None), r=14):
    """Vertical three-lamp light; lit holds the colour of each lamp or None."""
    w, h = r * 2 + 14, r * 6 + 22
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{HOUSING}"/>'
    for i, colour in enumerate(lit):
        out += lamp(x + w / 2, y + 11 + r + i * (2 * r + 6), colour or OFF, r, bool(colour))
    return out, (x + w / 2, y + 11 + r + 2 * (2 * r + 6)), w, h


def side_section(x, y, colour=None, r=14):
    size = r * 2 + 12
    return (f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="7" fill="{HOUSING}"/>'
            + lamp(x + size / 2, y + size / 2, colour or OFF, r, bool(colour))), (x + size / 2, y + size / 2)


def board(x, y, kind, w=56):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{w}" rx="8" fill="{HOUSING}"/>'
    cx, cy = x + w / 2, y + w / 2
    if kind in ("red_x", "off"):
        colour = RED if kind == "red_x" else OFF
        for dx in (-1, 1):
            out += (f'<line x1="{cx - 14}" y1="{cy - 14 * dx}" x2="{cx + 14}" y2="{cy + 14 * dx}" '
                     f'stroke="{colour}" stroke-width="6" stroke-linecap="round"/>')
    elif kind == "green_down":
        out += arrow(cx, cy, 180, GREEN, 17)
    elif kind == "yellow_diag":
        out += arrow(cx, cy, 135, YELLOW, 17)
    return out


def panel(x, y, w, h):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#fff" stroke="{LINE}" stroke-width="2"/>'


def card_tag(x, y, label):
    return text(x, y, label, 12, fill=GREY)


def described(x, y, title, body, title_chars, body_chars):
    """Bold title wrapped onto as many lines as it needs, then the body."""
    lines, line = [], ""
    for word in title.split():
        if line and len(line) + 1 + len(word) > title_chars:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    lines.append(line)
    out = "".join(text(x, y + i * 19, ln, 15, "bold") for i, ln in enumerate(lines))
    return out + wrapped(x, y + len(lines) * 19 + 6, body, body_chars, 13)


TEXT = {
    "en": {
        "title": "Special traffic lights",
        "subtitle": "What the exam shows besides the normal red, yellow and green.",
        "rev_title": "Reversible-lane lights (over a lane whose direction changes)",
        "rev": [("green_down", "Lane open", "drive in it"), ("red_x", "Lane closed", "don't drive in it"),
                ("yellow_diag", "Changing", "move to the lane it points to"), ("off", "Switched off", "don't enter the lane")],
        "rev_cards": "Cards #142–146",
        "extra_title": "Green arrow, main light red",
        "extra": "Go that way, but give way to everyone from other directions, trams too.",
        "extra_cards": "Cards #105–109",
        "dark_title": "Extra section switched off",
        "dark": "The outline arrows on the green show what's allowed (straight, right). Dark section = left and U-turn closed.",
        "dark_cards": "Cards #148, #149",
        "arrows_title": "Arrow-shaped lights",
        "arrows": "Each arrow works only for its own direction. A green left arrow also lets you U-turn.",
        "arrows_cards": "Card #157",
        "t_title": "T-shaped light (buses, trams)",
        "t": "Route vehicles only. Bottom + a top light: go that way. Only the 3 top lights: stop.",
        "t_go": "go straight", "t_stop": "stop",
        "t_cards": "Cards #183–185",
        "rail_title": "Flashing reds: railway crossing, bridge, fire station",
        "rail": "Two red lights flashing in turn (or one flashing red) mean stop.",
    },
    "ka": {
        "title": "განსაკუთრებული შუქნიშნები",
        "subtitle": "რას აჩვენებს გამოცდა ჩვეულებრივი წითელი, ყვითელი და მწვანის გარდა.",
        "rev_title": "რევერსული შუქნიშანი",
        "rev": [("green_down", "ზოლი ღიაა", "იმოძრავე"), ("red_x", "ზოლი დაკეტილია", "არ იმოძრავო"),
                ("yellow_diag", "იცვლება", "გადადი ისრის ზოლში"), ("off", "გამორთულია", "ზოლში ნუ შეხვალ")],
        "rev_cards": "ბილეთები #142–146",
        "extra_title": "მწვანე ისარი, ძირითადი წითელი",
        "extra": "წადი ამ მიმართულებით, მაგრამ დაუთმე სხვა მიმართულებიდან მოძრავ ყველას, ტრამვაისაც.",
        "extra_cards": "ბილეთები #105–109",
        "dark_title": "დამატებითი სექცია ჩამქრალია",
        "dark": "მწვანეზე კონტურის ისრები = რა შეიძლება (პირდაპირ, მარჯვნივ). ჩამქრალი სექცია = მარცხნივ და მობრუნება არა.",
        "dark_cards": "ბილეთები #148, #149",
        "arrows_title": "ისრის ფორმის შუქნიშანი",
        "arrows": "ყოველი ისარი მხოლოდ თავის მიმართულებაზე მოქმედებს. მწვანე მარცხენა ისარი მობრუნებასაც უშვებს.",
        "arrows_cards": "ბილეთი #157",
        "t_title": "T-სებური შუქნიშანი (სამარშრუტო)",
        "t": "მხოლოდ სამარშრუტო ტრანსპორტისთვის. ქვედა + ზედა: წადი იმ მიმართულებით. მხოლოდ სამი ზედა: გაჩერდი.",
        "t_go": "წადი", "t_stop": "გაჩერდი",
        "t_cards": "ბილეთები #183–185",
        "rail_title": "მოციმციმე წითელი: რკინიგზა, ხიდი, სახანძრო",
        "rail": "ორი წითელი რიგრიგობით ციმციმებს (ან ერთი მოციმციმე წითელი): გაჩერდი.",
    },
}


def special_lights(lang):
    t = TEXT[lang]
    wrap = 34 if lang == "en" else 31
    tw = 21 if lang == "en" else 18
    w, gap = 700, 14
    svg = ""
    y = 80

    # Reversible lights, full width
    svg += panel(24, y, 652, 178) + text(40, y + 28, t["rev_title"], 16, "bold")
    for i, (kind, name, meaning) in enumerate(t["rev"]):
        x = 40 + i * 160
        svg += board(x, y + 48, kind)
        svg += text(x, y + 128, name, 14, "bold") + wrapped(x, y + 146, meaning, 19, 12.5, gap=15)
    svg += card_tag(676 - 120, y + 28, t["rev_cards"])
    y += 178 + gap

    def two(left, right, h=224):
        nonlocal svg, y
        for col, draw in enumerate((left, right)):
            x = 24 + col * 334
            svg += panel(x, y, 318, h)
            svg += draw(x, y)
        y += h + gap

    def extra(x, y0):
        out, (lx, ly), hw, _ = head(x + 22, y0 + 20, (RED, None, None))
        sec, (sx, sy) = side_section(x + 22 + hw + 4, y0 + 20 + 74, None)
        out += sec + f'<circle cx="{sx}" cy="{sy}" r="19" fill="{GREEN}" fill-opacity="0.18"/>' + arrow(sx, sy, 270, GREEN, 11)
        return (out + described(x + 130, y0 + 30, t["extra_title"], t["extra"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["extra_cards"]))

    def dark(x, y0):
        sec, _ = side_section(x + 16, y0 + 94, None)
        out, (gx, gy), hw, _ = head(x + 62, y0 + 20, (None, None, GREEN))
        out = sec + out + arrow(gx - 6, gy, 0, "#0E3B22", 7, True) + arrow(gx + 6, gy, 90, "#0E3B22", 7, True)
        return (out + described(x + 130, y0 + 30, t["dark_title"], t["dark"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["dark_cards"]))

    def arrows(x, y0):
        out = ""
        for i, (colour, angle) in enumerate(((GREEN, 270), (RED, 0), (GREEN, 90))):
            hx = x + 14 + i * 36
            out += f'<rect x="{hx}" y="{y0 + 40}" width="32" height="44" rx="7" fill="{HOUSING}"/>'
            out += f'<circle cx="{hx + 16}" cy="{y0 + 62}" r="12" fill="#1B1E23"/>' + arrow(hx + 16, y0 + 62, angle, colour, 10)
        return (out + described(x + 130, y0 + 30, t["arrows_title"], t["arrows"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["arrows_cards"]))

    def t_light(x, y0):
        out = ""
        for j, (lit, label) in enumerate((((False, True, False, True), t["t_go"]), ((True, True, True, False), t["t_stop"]))):
            bx, by = x + 14 + j * 58, y0 + 40
            out += f'<rect x="{bx}" y="{by}" width="52" height="56" rx="7" fill="{HOUSING}"/>'
            for k in range(3):
                out += lamp(bx + 10 + k * 16, by + 13, WHITE if lit[k] else OFF, 6, lit[k])
            out += lamp(bx + 26, by + 40, WHITE if lit[3] else OFF, 6, lit[3])
            out += text(bx + 26, by + 74, label, 12, "bold", anchor="middle")
        return (out + described(x + 130, y0 + 30, t["t_title"], t["t"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["t_cards"]))

    two(extra, dark)
    two(arrows, t_light)

    # Railway-crossing flashing reds, full width
    svg += panel(24, y, 652, 110)
    svg += f'<rect x="44" y="{y + 30}" width="96" height="48" rx="10" fill="{HOUSING}"/>'
    svg += lamp(68, y + 54, RED, 15, True) + lamp(116, y + 54, OFF, 15)
    svg += (f'<path d="M66,{y + 90} q26,10 52,0" fill="none" stroke="{GREY}" stroke-width="2"/>'
            f'<path d="M112,{y + 86} l6,4 l-7,3" fill="none" stroke="{GREY}" stroke-width="2"/>')
    svg += text(166, y + 40, t["rail_title"], 15, "bold") + wrapped(166, y + 64, t["rail"], 58 if lang == "en" else 52, 13)
    y += 110

    return frame(w, y + 24, t["title"], t["subtitle"]) + svg + "</svg>"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("en", "ka"):
        (OUT / f"special_lights_{lang}.svg").write_text(special_lights(lang), encoding="utf-8", newline="\n")
        print(f"wrote special_lights_{lang}.svg")


if __name__ == "__main__":
    main()
