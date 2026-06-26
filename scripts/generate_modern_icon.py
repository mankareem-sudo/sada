"""Generate a modern, expressive app icon for Sada — sound waves emanating from a microphone."""
from PIL import Image, ImageDraw, ImageFilter
import os

OUTPUT_DIR = '/home/z/my-project/public'

def make_icon(size, with_bg=True):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_bg:
        # Gradient background
        grad = Image.new('RGB', (size, size))
        grad_draw = ImageDraw.Draw(grad)
        for y in range(size):
            t = y / size
            # Violet to deep purple gradient
            r = int(139 * (1 - t) + 88 * t)
            g = int(92 * (1 - t) + 28 * t)
            b = int(246 * (1 - t) + 237 * t)
            grad_draw.line([(0, y), (size, y)], fill=(r, g, b))

        pad = 0
        radius = int(size * 0.22)
        mask = Image.new('L', (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=255)
        img.paste(grad, (0, 0), mask)
        draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2

    # Sound wave circles (concentric, emanating outward)
    wave_colors = [
        (255, 255, 255, 30),
        (255, 255, 255, 50),
        (255, 255, 255, 80),
    ]
    for i, alpha in enumerate(wave_colors):
        r = int(size * (0.28 + i * 0.08))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=alpha, width=max(1, int(size * 0.01)))

    # Microphone body (rounded rectangle)
    mic_w = int(size * 0.14)
    mic_h = int(size * 0.22)
    mic_x = cx - mic_w // 2
    mic_y = cy - mic_h // 2 - int(size * 0.02)
    mic_radius = mic_w // 2
    draw.rounded_rectangle(
        [mic_x, mic_y, mic_x + mic_w, mic_y + mic_h],
        radius=mic_radius,
        fill=(255, 255, 255, 255),
    )

    # Microphone arc (holder)
    arc_w = int(size * 0.28)
    arc_h = int(size * 0.28)
    arc_x = cx - arc_w // 2
    arc_y = cy - arc_h // 2 + int(size * 0.02)
    draw.arc(
        [arc_x, arc_y, arc_x + arc_w, arc_y + arc_h],
        start=20, end=160,
        fill=(255, 255, 255, 220),
        width=max(2, int(size * 0.018)),
    )

    # Stand
    stand_x = cx
    stand_top = mic_y + mic_h + int(size * 0.04)
    stand_bot = cy + int(size * 0.18)
    draw.line([(stand_x, stand_top), (stand_x, stand_bot)], fill=(255, 255, 255, 220), width=max(2, int(size * 0.018)))

    # Base
    base_w = int(size * 0.16)
    draw.line([(cx - base_w, stand_bot), (cx + base_w, stand_bot)], fill=(255, 255, 255, 220), width=max(2, int(size * 0.025)))

    return img

# Generate all sizes
for s in [32, 192, 512]:
    img = make_icon(s)
    img.save(os.path.join(OUTPUT_DIR, f'icon-{s}.png'), 'PNG')
    print(f'Generated icon-{s}.png')

# Apple touch icon
img = make_icon(180)
img.save(os.path.join(OUTPUT_DIR, 'apple-touch-icon.png'), 'PNG')
print('Generated apple-touch-icon.png')

# Favicon
img = make_icon(32)
img.save(os.path.join(OUTPUT_DIR, 'favicon-32.png'), 'PNG')
print('Generated favicon-32.png')

# Android adaptive icons
ANDROID_RES = '/home/z/my-project/android/app/src/main/res'

# Foreground (mic on transparent)
fg = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
fg_draw = ImageDraw.Draw(fg)
cx, cy = 216, 216

# Sound waves
for i, alpha in enumerate([30, 50, 80]):
    r = int(432 * (0.28 + i * 0.08))
    fg_draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, alpha), width=4)

# Mic
mic_w, mic_h = 60, 95
fg_draw.rounded_rectangle([cx - 30, cy - 50, cx + 30, cy + 45], radius=30, fill=(255, 255, 255, 255))
fg_draw.arc([cx - 60, cy - 50, cx + 60, cy + 70], start=20, end=160, fill=(255, 255, 255, 220), width=8)
fg_draw.line([(cx, 50), (cx, 80)], fill=(255, 255, 255, 220), width=8)
fg_draw.line([(cx - 35, 80), (cx + 35, 80)], fill=(255, 255, 255, 220), width=12)

for folder, sz in [('mipmap-mdpi', 48), ('mipmap-hdpi', 72), ('mipmap-xhdpi', 96), ('mipmap-xxhdpi', 144), ('mipmap-xxxhdpi', 192)]:
    icon = make_icon(sz)
    icon.save(os.path.join(ANDROID_RES, folder, 'ic_launcher.png'), 'PNG')
    icon.save(os.path.join(ANDROID_RES, folder, 'ic_launcher_round.png'), 'PNG')
    fg_resized = fg.resize((int(sz * 1.08), int(sz * 1.08)), Image.LANCZOS)
    fg_resized.save(os.path.join(ANDROID_RES, folder, 'ic_launcher_foreground.png'), 'PNG')
    print(f'Generated {folder}/ic_launcher.png ({sz})')

# Splash
splash = Image.new('RGB', (1080, 1920), (10, 10, 15))
splash_draw = ImageDraw.Draw(splash)
icon_img = make_icon(480)
splash.paste(icon_img, (300, 720), icon_img)
splash.save(os.path.join(ANDROID_RES, 'drawable-port-xxhdpi', 'splash.png'), 'PNG')
splash_l = splash.resize((1920, 1080))
splash_l.save(os.path.join(ANDROID_RES, 'drawable-land-xxhdpi', 'splash.png'), 'PNG')
print('Generated splash screens')

print('\n✅ All icons generated!')
