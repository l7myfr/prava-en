"""Generate the alternative launcher icons.

One definition per icon produces both the Android adaptive-icon resources
(scripts/android-patches/res, copied into the Android project by
patch-nativephp-android.py) and the SVG previews shown in Settings
(public/images/app-icons). Coordinates use the 108x108 adaptive-icon canvas;
artwork stays inside the 66-unit safe circle so round masks don't clip it.

    python scripts/build-app-icons.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "scripts" / "android-patches" / "res"
PREVIEWS = ROOT / "public" / "images" / "app-icons"


def circle(cx: float, cy: float, r: float) -> str:
    return f"M{cx - r},{cy} A{r},{r} 0 1,1 {cx + r},{cy} A{r},{r} 0 1,1 {cx - r},{cy} Z"


ICONS = {
    "wheel": {
        "background": "#2563EB",
        "paths": [
            ("#FFFFFF", circle(54, 54, 28) + " " + circle(54, 54, 22), True),
            ("#FFFFFF", circle(54, 54, 7), False),
            ("#FFFFFF", "M32,51 L48,51 L48,57 L32,57 Z M60,51 L76,51 L76,57 L60,57 Z M51,60 L57,60 L57,76 L51,76 Z", False),
        ],
    },
    "road": {
        "background": "#15803D",
        "paths": [
            ("#374151", "M47,28 L61,28 L78,82 L30,82 Z", False),
            ("#FACC15", "M53.2,33 L54.8,33 L55.2,41 L52.8,41 Z M52.6,48 L55.4,48 L56,59 L52,59 Z M51.8,66 L56.2,66 L57,80 L51,80 Z", False),
        ],
    },
    "sign": {
        "background": "#111827",
        "paths": [
            ("#DC2626", "M54,30 L79,74 L29,74 Z", False),
            ("#FFFFFF", "M54,40 L70,68 L38,68 Z", False),
            ("#111827", "M52.2,47 L55.8,47 L55.2,59 L52.8,59 Z " + circle(54, 63.5, 2.2), False),
        ],
    },
    "car": {
        "background": "#EA580C",
        "paths": [
            ("#FFFFFF", "M34,56 L38,44 Q40,38 46,38 L62,38 Q68,38 70,44 L74,56 Q78,57 78,62 L78,70 Q78,72 76,72 L72,72 L72,76 Q72,78 70,78 L66,78 Q64,78 64,76 L64,72 L44,72 L44,76 Q44,78 42,78 L38,78 Q36,78 36,76 L36,72 L32,72 Q30,72 30,70 L30,62 Q30,57 34,56 Z", False),
            ("#EA580C", "M41,54 L44,44 Q45,42 47,42 L61,42 Q63,42 64,44 L67,54 Z " + circle(37, 63, 3) + " " + circle(71, 63, 3), False),
        ],
    },
}


def vector(paths) -> str:
    items = "\n".join(
        f'    <path android:fillColor="{color}"'
        + (' android:fillType="evenOdd"' if even_odd else "")
        + f' android:pathData="{data}" />'
        for color, data, even_odd in paths
    )
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    android:width="108dp" android:height="108dp"\n'
        '    android:viewportWidth="108" android:viewportHeight="108">\n'
        f"{items}\n</vector>\n"
    )


def adaptive(name: str) -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        f'    <background android:drawable="@color/app_icon_{name}_background" />\n'
        f'    <foreground android:drawable="@drawable/app_icon_{name}_foreground" />\n'
        "</adaptive-icon>\n"
    )


def preview(icon) -> str:
    items = "\n".join(
        f'  <path fill="{color}"' + (' fill-rule="evenodd"' if even_odd else "") + f' d="{data}"/>'
        for color, data, even_odd in icon["paths"]
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 9 90 90">\n'
        f'  <rect x="0" y="0" width="108" height="108" fill="{icon["background"]}"/>\n'
        f"{items}\n</svg>\n"
    )


def main() -> None:
    for folder in ("drawable", "mipmap-anydpi-v26", "values"):
        (RES / folder).mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)

    colors = []
    for name, icon in ICONS.items():
        (RES / "drawable" / f"app_icon_{name}_foreground.xml").write_text(vector(icon["paths"]))
        (RES / "mipmap-anydpi-v26" / f"app_icon_{name}.xml").write_text(adaptive(name))
        (PREVIEWS / f"{name}.svg").write_text(preview(icon))
        colors.append(f'    <color name="app_icon_{name}_background">{icon["background"]}</color>')

    (RES / "values" / "app_icon_colors.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + "\n".join(colors) + "\n</resources>\n"
    )
    print(f"{len(ICONS)} icons written")


if __name__ == "__main__":
    main()
