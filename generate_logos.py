"""
Gera logo2.png e regenera icons PWA a partir do Logo png kicks (2)(1).png
Rode: python generate_logos.py
"""
from PIL import Image
import numpy as np
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(BASE, "Logo png kicks (2)(1).png")
PUB  = os.path.join(BASE, "public")
ICONS = os.path.join(PUB, "icons")

os.makedirs(ICONS, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
arr = np.array(img)

# Bounding box do conteúdo não-transparente
alpha = arr[:, :, 3]
rows  = np.any(alpha > 10, axis=1)
cols  = np.any(alpha > 10, axis=0)
rmin, rmax = np.where(rows)[0][[0, -1]]
cmin, cmax = np.where(cols)[0][[0, -1]]

pad  = 30
cmin = max(0, cmin - pad)
cmax = min(img.width,  cmax + pad)
rmin = max(0, rmin - pad)
rmax = min(img.height, rmax + pad)

cropped = img.crop((cmin, rmin, cmax, rmax))


def make_square(source, size, bg=(0, 0, 0, 0)):
    canvas = Image.new("RGBA", (size, size), bg)
    s = source.copy()
    s.thumbnail((size, size), Image.LANCZOS)
    x = (size - s.width)  // 2
    y = (size - s.height) // 2
    canvas.paste(s, (x, y), s)
    return canvas


# ── logo2.png — transparente (usado na TopBar e Sidebar) ──
logo2 = make_square(cropped, 512)
logo2.save(os.path.join(PUB, "logo2.png"))
print("✓ public/logo2.png")

# ── logo.png — mesmo arquivo (compatibilidade) ──
logo2.save(os.path.join(PUB, "logo.png"))
print("✓ public/logo.png")

# ── logo-nav.png — sobre navy #0B2238 (Sidebar) ──
navy = (11, 34, 56, 255)
nav = make_square(cropped, 512, bg=navy)
nav.convert("RGB").save(os.path.join(PUB, "logo-nav.png"))
print("✓ public/logo-nav.png")

# ── PWA icons ──
icons = {
    "icon-16x16.png":        (16,  False),
    "icon-32x32.png":        (32,  False),
    "icon-64x64.png":        (64,  False),
    "icon-180x180.png":      (180, False),
    "apple-touch-icon.png":  (180, False),
    "icon-192x192.png":      (192, True),
    "icon-512x512.png":      (512, True),
}

for fname, (size, use_navy) in icons.items():
    bg = navy if use_navy else (0, 0, 0, 0)
    icon = make_square(cropped, size, bg=bg)
    if use_navy:
        icon = icon.convert("RGB")
    icon.save(os.path.join(ICONS, fname))
    print(f"✓ public/icons/{fname}")

print("\nTudo gerado. Agora: git add -A && git commit -m 'fix: logos gerados do logo2' && git push")
