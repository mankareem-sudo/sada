"""Generate all required icons for Sada PWA + Android APK."""
from PIL import Image, ImageDraw
import os

OUTPUT_DIR = '/home/z/my-project/public'

BG_TOP = (139, 92, 246)
BG_BOT = (124, 58, 237)
FG = (255, 255, 255)
BG_DARK = (10, 10, 15)


def make_icon(size, rounded=True, with_bg=True):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_bg:
        # Gradient background
        grad = Image.new('RGB', (size, size))
        grad_draw = ImageDraw.Draw(grad)
        for y in range(size):
            t = y / size
            r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
            g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
            b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
            grad_draw.line([(0, y), (size, y)], fill=(r, g, b))

        pad = 0
        if rounded:
            radius = int(size * 0.22)
            mask = Image.new('L', (size, size), 0)
            mdraw = ImageDraw.Draw(mask)
            mdraw.rounded_rectangle(
                [pad, pad, size - pad, size - pad], radius=radius, fill=255
            )
        else:
            mask = Image.new('L', (size, size), 255)

        img.paste(grad, (0, 0), mask)
        draw = ImageDraw.Draw(img)

    # Microphone glyph
    mic_w = int(size * 0.22)
    mic_h = int(size * 0.34)
    mic_x = (size - mic_w) // 2
    mic_y = int(size * 0.28)
    mic_radius = mic_w // 2
    draw.rounded_rectangle(
        [mic_x, mic_y, mic_x + mic_w, mic_y + mic_h],
        radius=mic_radius,
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
    stand_w = max(2, int(size * 0.025))
    draw.line([(stand_x, stand_top), (stand_x, stand_bot)], fill=FG, width=stand_w)

    base_y = stand_bot
    base_w = int(size * 0.25)
    draw.line(
        [(stand_x - base_w // 2, base_y), (stand_x + base_w // 2, base_y)],
        fill=FG,
        width=max(2, int(size * 0.04)),
    )

    return img


# PWA icons
for size in [192, 512]:
    img = make_icon(size)
    img.save(os.path.join(OUTPUT_DIR, f'icon-{size}.png'), format='PNG')
    print(f'Generated icon-{size}.png')

# Apple touch icon
img = make_icon(180)
img.save(os.path.join(OUTPUT_DIR, 'apple-touch-icon.png'), format='PNG')
print('Generated apple-touch-icon.png')

# Favicon
img = make_icon(32)
img.save(os.path.join(OUTPUT_DIR, 'favicon-32.png'), format='PNG')
print('Generated favicon-32.png')

# Android adaptive icons (background + foreground)
ANDROID_DIR = '/home/z/my-project/android-resources'
os.makedirs(ANDROID_DIR, exist_ok=True)

# Foreground (mic on transparent) - 432x432 (safe zone is 300x300 in center)
fg = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
fg_draw = ImageDraw.Draw(fg)
# Scale mic to fit in 432 canvas (center 300x300)
mic_w = int(432 * 0.22)
mic_h = int(432 * 0.34)
mic_x = (432 - mic_w) // 2
mic_y = int(432 * 0.28)
fg_draw.rounded_rectangle(
    [mic_x, mic_y, mic_x + mic_w, mic_y + mic_h],
    radius=mic_w // 2, fill=FG
)
arc_box = [
    mic_x - int(mic_w * 0.6), mic_y + int(mic_h * 0.4),
    mic_x + mic_w + int(mic_w * 0.6), mic_y + int(mic_h * 1.4),
]
fg_draw.arc(arc_box, start=0, end=180, fill=FG, width=8)
stand_x = 216
fg_draw.line([(stand_x, mic_y + int(mic_h * 0.9)), (stand_x, int(432 * 0.7))], fill=FG, width=8)
fg_draw.line([(stand_x - 54, int(432 * 0.7)), (stand_x + 54, int(432 * 0.7))], fill=FG, width=14)
fg.save(os.path.join(ANDROID_DIR, 'ic_launcher_foreground.png'), format='PNG')
print('Generated ic_launcher_foreground.png')

# Background (gradient violet)
bg = Image.new('RGB', (432, 432))
bg_draw = ImageDraw.Draw(bg)
for y in range(432):
    t = y / 432
    r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
    bg_draw.line([(0, y), (432, y)], fill=(r, g, b))
bg.save(os.path.join(ANDROID_DIR, 'ic_launcher_background.png'), format='PNG')
print('Generated ic_launcher_background.png')

# Splash screen
splash = Image.new('RGB', (1080, 1920), BG_DARK)
splash_draw = ImageDraw.Draw(splash)
# Center icon (480x480)
icon_size = 480
icon_x = (1080 - icon_size) // 2
icon_y = 720
# Draw mic on dark background
mic_w_s = int(icon_size * 0.22)
mic_h_s = int(icon_size * 0.34)
mic_x_s = icon_x + (icon_size - mic_w_s) // 2
mic_y_s = icon_y + int(icon_size * 0.28)
splash_draw.rounded_rectangle(
    [mic_x_s, mic_y_s, mic_x_s + mic_w_s, mic_y_s + mic_h_s],
    radius=mic_w_s // 2, fill=FG
)
arc_box_s = [
    mic_x_s - int(mic_w_s * 0.6), mic_y_s + int(mic_h_s * 0.4),
    mic_x_s + mic_w_s + int(mic_w_s * 0.6), mic_y_s + int(mic_h_s * 1.4),
]
splash_draw.arc(arc_box_s, start=0, end=180, fill=FG, width=12)
stand_x_s = 540
splash_draw.line([(stand_x_s, mic_y_s + int(mic_h_s * 0.9)), (stand_x_s, icon_y + int(icon_size * 0.7))], fill=FG, width=12)
splash_draw.line([(stand_x_s - 60, icon_y + int(icon_size * 0.7)), (stand_x_s + 60, icon_y + int(icon_size * 0.7))], fill=FG, width=20)

splash.save(os.path.join(ANDROID_DIR, 'splash.png'), format='PNG')
print('Generated splash.png')

print('\nAll icons generated successfully!')
