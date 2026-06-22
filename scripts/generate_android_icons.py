"""Generate Android launcher icons and splash screens at all densities."""
from PIL import Image, ImageDraw
import os

ANDROID_RES = '/home/z/my-project/android/app/src/main/res'
RESOURCES = '/home/z/my-project/android-resources'

BG_TOP = (139, 92, 246)
BG_BOT = (124, 58, 237)
FG = (255, 255, 255)
BG_DARK = (10, 10, 15)


def make_icon(size, with_bg=True):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_bg:
        grad = Image.new('RGB', (size, size))
        grad_draw = ImageDraw.Draw(grad)
        for y in range(size):
            t = y / size
            r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
            g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
            b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
            grad_draw.line([(0, y), (size, y)], fill=(r, g, b))

        radius = int(size * 0.22)
        mask = Image.new('L', (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)

        img.paste(grad, (0, 0), mask)
        draw = ImageDraw.Draw(img)

    # Microphone glyph
    mic_w = int(size * 0.22)
    mic_h = int(size * 0.34)
    mic_x = (size - mic_w) // 2
    mic_y = int(size * 0.28)
    draw.rounded_rectangle(
        [mic_x, mic_y, mic_x + mic_w, mic_y + mic_h],
        radius=mic_w // 2,
        fill=FG,
    )

    arc_box = [
        mic_x - int(mic_w * 0.6),
        mic_y + int(mic_h * 0.4),
        mic_x + mic_w + int(mic_w * 0.6),
        mic_y + int(mic_h * 1.4),
    ]
    draw.arc(arc_box, start=0, end=180, fill=FG, width=max(2, int(size * 0.025)))

    stand_x = size // 2
    stand_top = mic_y + int(mic_h * 0.9)
    stand_bot = int(size * 0.7)
    draw.line([(stand_x, stand_top), (stand_x, stand_bot)], fill=FG, width=max(2, int(size * 0.025)))

    base_y = stand_bot
    base_w = int(size * 0.25)
    draw.line(
        [(stand_x - base_w // 2, base_y), (stand_x + base_w // 2, base_y)],
        fill=FG,
        width=max(2, int(size * 0.04)),
    )

    return img


# Mipmap sizes (per Android convention)
MIPMAP_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

# Generate launcher icons (ic_launcher.png + ic_launcher_round.png)
for folder, size in MIPMAP_SIZES.items():
    icon = make_icon(size)
    icon.save(os.path.join(ANDROID_RES, folder, 'ic_launcher.png'), format='PNG')
    icon.save(os.path.join(ANDROID_RES, folder, 'ic_launcher_round.png'), format='PNG')
    print(f'Generated {folder}/ic_launcher.png ({size}x{size})')

# Copy foreground + background for adaptive icon
import shutil
fg_src = os.path.join(RESOURCES, 'ic_launcher_foreground.png')
bg_src = os.path.join(RESOURCES, 'ic_launcher_background.png')
if os.path.exists(fg_src):
    for folder, size in MIPMAP_SIZES.items():
        # Foreground should be 108% of icon size for adaptive
        fg_size = int(size * 108 / 100)
        fg = Image.open(fg_src).resize((fg_size, fg_size), Image.LANCZOS)
        fg.save(os.path.join(ANDROID_RES, folder, 'ic_launcher_foreground.png'), format='PNG')
        bg = Image.open(bg_src).resize((fg_size, fg_size), Image.LANCZOS)
        bg.save(os.path.join(ANDROID_RES, folder, 'ic_launcher_background.png'), format='PNG')

# Splash screen at all densities (portrait)
SPLASH_SIZES = {
    'drawable-port-mdpi': (240, 320),
    'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (720, 1280),
    'drawable-port-xxhdpi': (1080, 1920),
    'drawable-port-xxxhdpi': (1440, 2560),
}

splash_src = os.path.join(RESOURCES, 'splash.png')
if os.path.exists(splash_src):
    for folder, (w, h) in SPLASH_SIZES.items():
        splash = Image.open(splash_src).resize((w, h), Image.LANCZOS)
        splash.save(os.path.join(ANDROID_RES, folder, 'splash.png'), format='PNG')
        print(f'Generated {folder}/splash.png ({w}x{h})')

# Landscape splash
SPLASH_LAND_SIZES = {
    'drawable-land-mdpi': (320, 240),
    'drawable-land-hdpi': (800, 480),
    'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1920, 1080),
    'drawable-land-xxxhdpi': (2560, 1440),
}
for folder, (w, h) in SPLASH_LAND_SIZES.items():
    splash = Image.open(splash_src).resize((w, h), Image.LANCZOS)
    splash.save(os.path.join(ANDROID_RES, folder, 'splash.png'), format='PNG')
    print(f'Generated {folder}/splash.png ({w}x{h})')

print('\n✓ All Android icons and splash screens generated!')
