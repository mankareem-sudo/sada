#!/usr/bin/env python3
"""Generate OG image for Sada (1200x630 PNG)"""

from PIL import Image, ImageDraw, ImageFont
import os

# OG image dimensions
W, H = 1200, 630

# Brand colors
BG_DARK = (10, 10, 15)  # #0a0a0f
ACCENT_AMBER = (245, 158, 11)  # amber-500
ACCENT_AMBER_LIGHT = (251, 191, 36)  # amber-400
WHITE = (255, 255, 255)
GRAY = (160, 160, 170)

# Create image with dark background
img = Image.new('RGB', (W, H), BG_DARK)
draw = ImageDraw.Draw(img)

# Try to load Arabic-capable fonts
font_paths = [
    '/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf',  # fallback
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
]

def load_font(size):
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

# Decorative gradient circle (representing sound wave / "echo")
center_x, center_y = 200, 315
for r, alpha in [(220, 12), (180, 20), (140, 30), (100, 45), (60, 60)]:
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse(
        [center_x - r, center_y - r, center_x + r, center_y + r],
        fill=(245, 158, 11, alpha)
    )
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

# Draw sound wave bars (representing the voice identity)
bars_x_start = 100
bars_y_center = 315
bar_width = 8
bar_gap = 14
bar_heights = [40, 80, 120, 60, 160, 100, 180, 140, 80, 60, 100, 60, 40]
for i, h in enumerate(bar_heights):
    x = bars_x_start + i * (bar_width + bar_gap)
    color = ACCENT_AMBER if i % 2 == 0 else ACCENT_AMBER_LIGHT
    draw.rectangle(
        [x, bars_y_center - h // 2, x + bar_width, bars_y_center + h // 2],
        fill=color
    )

# Title text (right side)
font_title = load_font(96)
font_subtitle = load_font(36)
font_tagline = load_font(28)

# App name "صدى" - draw in large font
title_x = 580
title_y = 180
# Use a simple approach: write "Sada" in large + arabic subtitle below
try:
    # Try to find Arabic font
    arabic_font_paths = [
        '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-VariableFont_wght.ttf',
        '/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf',
    ]
    title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 110)
except Exception:
    title_font = load_font(110)

# Draw "SADA" in large amber
draw.text((title_x, title_y), "SADA", font=title_font, fill=ACCENT_AMBER)

# Subtitle (English description)
subtitle = "Arabic Voice Conversation Platform"
draw.text((title_x, title_y + 140), subtitle, font=font_subtitle, fill=WHITE)

# Tagline (smaller)
tagline = "One daily question. 90-second voice answers."
draw.text((title_x, title_y + 200), tagline, font=font_tagline, fill=GRAY)

tagline2 = "Calm dialogue. No sarcasm. No abuse."
draw.text((title_x, title_y + 240), tagline2, font=font_tagline, fill=GRAY)

# Footer with URL
url_font = load_font(24)
draw.text((title_x, H - 60), "my-project-one-lake-82.vercel.app", font=url_font, fill=ACCENT_AMBER_LIGHT)

# Save
output_path = '/home/z/my-project/public/og-image.png'
img.save(output_path, 'PNG', optimize=True)
print(f"✅ OG image saved: {output_path}")
print(f"   Size: {W}x{H}")
print(f"   File: {os.path.getsize(output_path) // 1024} KB")
