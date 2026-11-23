# Turns a 2x Blender render into game-resolution pixel art:
# box downscale, a light sharpen and a reduced palette.
#   python3 tools/blender/pixelize.py in.png out.png [colors]
import sys
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
colors = int(sys.argv[3]) if len(sys.argv) > 3 else 128
im = Image.open(src).convert('RGB')
im = im.resize((im.width // 2, im.height // 2), Image.BOX)
im = im.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
im = im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
im.save(dst, optimize=True)
