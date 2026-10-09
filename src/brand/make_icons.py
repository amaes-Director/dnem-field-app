import sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import numpy as np
# DNEM ADA Lens app icons from the DNEM logo mark. Run from src/: python3 brand/make_icons.py phone
S=sys.argv[1] if len(sys.argv) > 1 else 'phone'
im=Image.open('brand/dnem_report_logo.png').convert('RGBA')
mark=im.crop((198,0,315,84))
pad=12  # room above the clipped head
up=8
canvas=Image.new('RGBA',(mark.width,mark.height+pad),(0,0,0,0)); canvas.alpha_composite(mark,(0,pad))
big=canvas.resize((canvas.width*up,canvas.height*up),Image.BICUBIC)
b=np.array(big).astype(float); alpha=b[:,:,3]/255
pal=np.array([[42,91,170],[240,83,35],[255,255,255]],float)
idx=((b[:,:,None,:3]-pal[None,None])**2).sum(3).argmin(2)
mask=alpha>0.5
out=np.dstack([pal[idx],mask*255]).astype(np.uint8)
# redraw the orange head as a full circle (the source image cuts off its top)
H,W=mask.shape
orange=mask&(idx==1)
ys,xs=np.where(orange[:int(H*0.4),int(W*0.6):]); xs=xs+int(W*0.6)
# head = topmost orange blob: columns of orange pixels within the top band
top=ys.min(); band=orange[top:top+int(H*0.12), :]
cols=np.where(band.any(0))[0]; cols=cols[cols>int(W*0.6)]
x0,x1=cols.min(),cols.max(); r=(x1-x0)/2; cx=(x0+x1)/2
rows=np.where(orange[:, int(cx)])[0]
# bottom of head = first gap below top in that column
col=orange[:,int(cx)]; y=rows.min()
while y<H and col[y]: y+=1
cy=y-r
img=Image.fromarray(out,'RGBA'); d=ImageDraw.Draw(img)
d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=tuple(pal[1].astype(int))+(255,))
m=img.filter(ImageFilter.GaussianBlur(1.2))
bb=m.getbbox(); m=m.crop(bb)
def icon(size):
    W=1024; c=Image.new('RGBA',(W,W),'white'); d=ImageDraw.Draw(c)
    band=int(W*0.2); stripe=int(W*0.03)
    d.rectangle([0,W-band,W,W],fill=(0,87,191)); d.rectangle([0,W-band-stripe,W,W-band],fill=(239,83,35))
    area=W-band-stripe; mw=int(W*0.66); mh=int(m.height*mw/m.width)
    if mh>area*0.8: mh=int(area*0.8); mw=int(m.width*mh/m.height)
    c.alpha_composite(m.resize((mw,mh),Image.LANCZOS),((W-mw)//2,(area-mh)//2))
    f=ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',int(W*0.12))
    t='ADA LENS'; tw=d.textlength(t,font=f); asc,desc=f.getmetrics()
    d.text(((W-tw)/2,W-band+(band-asc)/2),t,font=f,fill='white')
    return c.convert('RGB').resize((size,size),Image.LANCZOS)
for s in (512,192,180): icon(s).save(f'{S}/icon-{s}.png')
# maskable (Android crops to a circle or squircle): mark only, inside the central safe zone
W=1024; c=Image.new('RGBA',(W,W),'white'); mw=int(W*0.58); mh=int(m.height*mw/m.width)
c.alpha_composite(m.resize((mw,mh),Image.LANCZOS),((W-mw)//2,(W-mh)//2))
c.convert('RGB').resize((512,512),Image.LANCZOS).save(f'{S}/icon-maskable-512.png')
