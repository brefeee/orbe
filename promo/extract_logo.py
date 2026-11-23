"""Extrait le logo ORBE (sans le fond) de l'image source : marque bleue + positions des points."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src = sys.argv[1]
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
white = (R > 200) & (G > 200) & (B > 200)
ys, xs = np.where(white)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
blue = (R < 128) & (B > 150)
print('tile bbox', x0, x1, y0, y1, 'blue', im[blue].mean(0).round())
row = np.where(white[y0 + 2])[0]
print('corner radius ~', row.min() - x0, 'of', x1 - x0)
a = np.clip((255 - R) / (255 - im[blue][:, 0].mean()), 0, 1)
yy = np.arange(im.shape[0])[:, None]; xx = np.arange(im.shape[1])[None, :]
a = np.clip((a - 0.12) / 0.88, 0, 1)
a[~((yy > y0 + 6) & (yy < y1 - 6) & (xx > x0 + 6) & (xx < x1 - 6))] = 0
s = max(x1 - x0, y1 - y0) + 1
crop = a[y0:y0 + s, x0:x0 + s]
out = np.zeros((s, s, 4), np.uint8)
out[..., 0], out[..., 1], out[..., 2] = 8, 122, 255
out[..., 3] = (crop * 255).astype(np.uint8)
Image.fromarray(out).resize((800, 800), Image.LANCZOS).save('logo-mark.png')
lab, n = ndi.label(crop > 0.5)
dots = []
for i in range(1, n + 1):
    m = lab == i; area = m.sum()
    if area < 12: continue
    cy, cx = ndi.center_of_mass(m)
    dots.append([round(cx / s, 4), round(cy / s, 4), round(float(np.sqrt(area / np.pi)) / s, 4)])
open('dots.js', 'w').write('window.DOTS=' + json.dumps(dots) + ';')
print(len(dots), 'dots')
