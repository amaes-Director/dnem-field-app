import sys
from PIL import Image
# DNEM ADA Access Lens app icons, the same mark as the other DNEM Access Lens desktop tools. Run from src/: python3 brand/make_icons.py phone
S=sys.argv[1] if len(sys.argv) > 1 else 'phone'
src=Image.open('brand/dnem_access_lens.png').convert('RGBA')
bg=Image.new('RGBA',src.size,'white'); bg.alpha_composite(src); src=bg.convert('RGB')
for s in (512,192,180): src.resize((s,s),Image.LANCZOS).save(f'{S}/icon-{s}.png')
# maskable (Android crops to a circle or squircle): shrink the mark into the central safe zone
W=512; c=Image.new('RGB',(W,W),'white'); m=src.resize((int(W*0.8),)*2,Image.LANCZOS)
c.paste(m,((W-m.width)//2,)*2); c.save(f'{S}/icon-maskable-512.png')
