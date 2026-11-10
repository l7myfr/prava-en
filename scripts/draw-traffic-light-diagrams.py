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
        "t": "Route vehicles in their own lane. Bottom + top-left: left, top-middle: straight, top-right: right. Only the 3 top: stop.",
        "t_go": "go straight", "t_stop": "stop",
        "t_cards": "Cards #183–185",
        "rail_title": "Railway crossing, opening bridge, ferry, fire-station exit",
        "rail": [("red", "Reds flashing in turn", "stop at the line or the light"),
                 ("yellow", "Flashing yellow", "go on with special caution (#155)"),
                 ("off", "Switched off", "go only if no train is in sight (#180)")],
        "ped_title": "Pedestrian light",
        "ped": "Red figure: don't cross. Green: cross. No pedestrian light? Cross only while cars have red. Ticking sound = red, steady sound = green.",
        "ped_cards": "Law, article 29(6)",
        "bike_title": "Bicycle light",
        "bike": "2-3 lights, sometimes with a white plate showing a bicycle. Same colours as for cars. None? Cyclists follow the pedestrian light.",
        "bike_cards": "Law, article 29(7)",
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
        "t": "სამარშრუტო თავის ზოლში. ქვედა + ზედა მარცხენა: მარცხნივ, შუა: პირდაპირ, მარჯვენა: მარჯვნივ. მხოლოდ სამი ზედა: გაჩერდი.",
        "t_go": "წადი", "t_stop": "გაჩერდი",
        "t_cards": "ბილეთები #183–185",
        "rail_title": "რკინიგზა, გასახსნელი ხიდი, ბორანი, სახანძრო",
        "rail": [("red", "წითლები რიგრიგობით", "გაჩერდი ხაზთან ან შუქნიშანთან"),
                 ("yellow", "მოციმციმე ყვითელი", "გააგრძელე განსაკუთრებული სიფრთხილით (#155)"),
                 ("off", "გამორთულია", "წადი, თუ მატარებელი არ ჩანს (#180)")],
        "ped_title": "ქვეითის შუქნიშანი",
        "ped": "წითელი: ნუ გადახვალ. მწვანე: გადადი. ქვეითის შუქნიშანი არ არის? გადადი, როცა მანქანებს წითელი აქვთ. წყვეტილი ხმა = წითელი, უწყვეტი = მწვანე.",
        "ped_cards": "კანონი, მუხლი 29(6)",
        "bike_title": "ველოსიპედის შუქნიშანი",
        "bike": "2-3 სიგნალი, ზოგჯერ თეთრი დაფით ველოსიპედით. ფერები იგივეა. თუ არ არის, ველოსიპედისტი ქვეითის შუქნიშანს მიჰყვება.",
        "bike_cards": "კანონი, მუხლი 29(7)",
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

    def figure(cx, cy, colour, walking):
        legs = (f"M{cx},{cy + 3} L{cx - 5},{cy + 11} M{cx},{cy + 3} L{cx + 5},{cy + 11}" if walking
                else f"M{cx},{cy + 3} L{cx - 2},{cy + 11} M{cx},{cy + 3} L{cx + 2},{cy + 11}")
        arms = (f"M{cx - 5},{cy - 1} L{cx},{cy - 4} L{cx + 5},{cy + 1}" if walking
                else f"M{cx - 4},{cy - 3} L{cx - 4},{cy + 3} M{cx + 4},{cy - 3} L{cx + 4},{cy + 3}")
        return (f'<circle cx="{cx}" cy="{cy - 9}" r="3" fill="{colour}"/>'
                f'<path d="M{cx},{cy - 5} L{cx},{cy + 3} {legs} {arms}" fill="none" stroke="{colour}" '
                f'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>')

    def pedestrian(x, y0):
        out = f'<rect x="{x + 34}" y="{y0 + 30}" width="52" height="100" rx="9" fill="{HOUSING}"/>'
        for cy, colour, walking in ((y0 + 56, RED, False), (y0 + 104, GREEN, True)):
            out += (f'<circle cx="{x + 60}" cy="{cy}" r="24" fill="{colour}" fill-opacity="0.18"/>'
                    f'<circle cx="{x + 60}" cy="{cy}" r="19" fill="#1B1E23"/>' + figure(x + 60, cy + 1, colour, walking))
        return (out + described(x + 130, y0 + 30, t["ped_title"], t["ped"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["ped_cards"]))

    def bicycle(x, y0):
        out = f'<rect x="{x + 40}" y="{y0 + 28}" width="40" height="96" rx="8" fill="{HOUSING}"/>'
        for i, colour in enumerate((RED, YELLOW, GREEN)):
            if i == 2:
                out += lamp(x + 60, y0 + 46 + i * 30, colour, 11, True)
            else:
                out += f'<circle cx="{x + 60}" cy="{y0 + 46 + i * 30}" r="11" fill="{colour}" fill-opacity="0.35"/>'
        bx, by = x + 34, y0 + 132
        out += (f'<rect x="{bx}" y="{by}" width="52" height="34" rx="4" fill="#fff" stroke="{INK}" stroke-width="1.5"/>'
                f'<circle cx="{bx + 15}" cy="{by + 22}" r="7" fill="none" stroke="{INK}" stroke-width="2"/>'
                f'<circle cx="{bx + 37}" cy="{by + 22}" r="7" fill="none" stroke="{INK}" stroke-width="2"/>'
                f'<path d="M{bx + 15},{by + 22} L{bx + 22},{by + 10} L{bx + 32},{by + 10} L{bx + 37},{by + 22} '
                f'M{bx + 22},{by + 10} L{bx + 26},{by + 22} L{bx + 32},{by + 10} M{bx + 20},{by + 7} L{bx + 25},{by + 7}" '
                f'fill="none" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
        return (out + described(x + 130, y0 + 30, t["bike_title"], t["bike"], tw, wrap - 10)
                + card_tag(x + 130, y0 + 208, t["bike_cards"]))

    two(extra, dark)
    two(arrows, t_light)
    two(pedestrian, bicycle)

    # Railway crossings and the like: the three states, full width
    svg += panel(24, y, 652, 168) + text(40, y + 28, t["rail_title"], 16, "bold")
    for i, (state, name, meaning) in enumerate(t["rail"]):
        x = 40 + i * 214
        svg += f'<rect x="{x}" y="{y + 46}" width="84" height="42" rx="10" fill="{HOUSING}"/>'
        if state == "red":
            svg += lamp(x + 22, y + 67, RED, 13, True) + lamp(x + 62, y + 67, OFF, 13)
            svg += (f'<path d="M{x + 20},{y + 98} q22,9 44,0" fill="none" stroke="{GREY}" stroke-width="2"/>'
                    f'<path d="M{x + 58},{y + 94} l6,4 l-7,3" fill="none" stroke="{GREY}" stroke-width="2"/>')
        elif state == "yellow":
            svg += lamp(x + 42, y + 67, YELLOW, 13, True)
        else:
            svg += lamp(x + 22, y + 67, OFF, 13) + lamp(x + 62, y + 67, OFF, 13)
        svg += text(x, y + 124, name, 14, "bold") + wrapped(x, y + 142, meaning, 26 if lang == "en" else 24, 12.5, gap=15)
    y += 168

    return frame(w, y + 24, t["title"], t["subtitle"]) + svg + "</svg>"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("en", "ka"):
        (OUT / f"special_lights_{lang}.svg").write_text(special_lights(lang), encoding="utf-8", newline="\n")
        print(f"wrote special_lights_{lang}.svg")


if __name__ == "__main__":
    main()
