"""Prepare image assets: logo cut-out and privacy-safe photo crops."""
import os
from PIL import Image, ImageDraw, ImageOps
import pillow_heif
pillow_heif.register_heif_opener()
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); PH = os.path.join(ROOT, '..', 'photos')
A = lambda *p: os.path.join(ROOT, 'assets', *p)

# Logo: cut the round sticker out of the supplied artwork (circle found at c=(411.5,408.5), r=403)
src = Image.open(A('logo_source.png')).convert('RGB')
cx, cy, r = 411.5, 408.5, 403
logo = src.crop((int(cx - r), int(cy - r), int(cx + r) + 1, int(cy + r) + 1)).resize((1024, 1024), Image.LANCZOS)
mask = Image.new('L', (4096, 4096), 0); ImageDraw.Draw(mask).ellipse((8, 8, 4088, 4088), fill=255)
logo.putalpha(mask.resize((1024, 1024), Image.LANCZOS)); logo.save(A('logo.png'))

def load(name):
    return ImageOps.exif_transpose(Image.open(os.path.join(PH, name))).convert('RGB')

# Pool photos (no logo) - crop to 4:3 landscape cards
p = load('IMG_3312.HEIC'); w, h = p.size            # portrait close-up
p.crop((0, int(h * .12), w, int(h * .12) + int(w * .75))).resize((1440, 1080), Image.LANCZOS).save(A('photo_pool_a.jpg'), quality=90)
p = load('IMG_3297.HEIC'); p.resize((1440, 1080), Image.LANCZOS).save(A('photo_pool_b.jpg'), quality=90)
# Car photo (with logo) - cropped well above the bumper so the licence plate is not in frame
p = load('carphotowithlogo/IMG_3334.JPG'); w, h = p.size
p.crop((0, int(h * .20), w, int(h * .20) + int(w * .75))).resize((1440, 1080), Image.LANCZOS).save(A('photo_car.jpg'), quality=90)
print('assets ok')
