"""Generate Sada PWA icons (192x192 and 512x512)."""
from PIL import Image, ImageDraw
import os

OUTPUT_DIR = '/home/z/my-project/public'

# Sada palette
BG_TOP = (139, 92, 246)      # primary violet #8b5cf6
BG_BOT = (124, 58, 237)      # darker violet #7c3aed
FG = (255, 255, 255)

def make_icon(size):
    bg_img = Image.new('RGB', (size, size), (10, 10, 15))  # bg = #0a0a0f
    grad = Image.new('RGB', (size, size))
    grad_draw = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        grad_draw.line([(0, y), (size, y)], fill=(r, g, b))

    # rounded square mask
    pad = int(size * 0.05)
    radius = int(size * 0.22)
    mask = Image.new('L', (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=255)
    img = Image.composite(grad, bg_img, mask)
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
    draw.line(
        [(stand_x, stand_top), (stand_x, stand_bot)],
        fill=FG,
        width=stand_w,
    )

    base_y = stand_bot
    base_w = int(size * 0.25)
    draw.line(
        [(stand_x - base_w // 2, base_y), (stand_x + base_w // 2, base_y)],
        fill=FG,
        width=max(2, int(size * 0.04)),
    )

    return img


for size in [192, 512]:
    img = make_icon(size)
    img.save(os.path.join(OUTPUT_DIR, f'icon-{size}.png'), format='PNG')
    print(f'Generated icon-{size}.png')

# Apple touch icon (180x180)
img = make_icon(180)
img.save(os.path.join(OUTPUT_DIR, 'apple-touch-icon.png'), format='PNG')
print('Generated apple-touch-icon.png')

# Favicon 32x32
img = make_icon(32)
img.save(os.path.join(OUTPUT_DIR, 'favicon-32.png'), format='PNG')
print('Generated favicon-32.png')
