"""Render the app identity images from their SVG sources (assets/*.svg) into public/.

    python scripts/build_icons.py

icon.png (1024 px, the platform cuts favicon, apple-touch-icon and the manifest from it) and
og.png (1200x630 social preview). Uses Playwright's Chromium, already a dev tool here.
"""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
JOBS = [("icon.svg", "icon.png", 1024, 1024), ("og.svg", "og.png", 1200, 630)]

if __name__ == "__main__":
    (ROOT / "public").mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for src, out, w, h in JOBS:
            page = browser.new_page(viewport={"width": w, "height": h})
            svg = (ROOT / "assets" / src).read_text()
            style = f'style="width:{w}px;height:{h}px;display:block" '
            page.set_content('<body style="margin:0">' + svg.replace("<svg ", "<svg " + style, 1) + "</body>")
            page.screenshot(path=str(ROOT / "public" / out), clip={"x": 0, "y": 0, "width": w, "height": h})
            print("wrote", out)
        browser.close()
