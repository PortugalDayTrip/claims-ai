"""Debug scratch/reflection separation on evidence image — saves stage images."""
import sys
import cv2
import numpy as np

img = cv2.imread(sys.argv[1] if len(sys.argv) > 1 else "../../data/uploads/clm_b961eef0afa8eb36/ev_975e81c73b190570.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)

# DoG at two scales
for k in (31, 61):
    kk = k | 1
    bg = cv2.GaussianBlur(gray, (kk, kk), 0)
    diff = gray - bg
    cv2.imwrite(f"dbg_diff_{kk}.png", cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8))
    cv2.imwrite(f"dbg_bg_{kk}.png", bg.astype(np.uint8))

    dark_bg = bg <= np.percentile(bg, 60)
    cand = (diff > 18) & dark_bg
    cv2.imwrite(f"dbg_cand_{kk}.png", cand.astype(np.uint8) * 255)

    mask = cv2.morphologyEx(cand.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    vis = img.copy()
    for c in cnts:
        if cv2.contourArea(c) > 30:
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.drawContours(vis, [c], -1, (0, 255, 0), 1)
    cv2.imwrite(f"dbg_regions_{kk}.jpg", vis)
    print(f"k={kk}: {sum(1 for c in cnts if cv2.contourArea(c) > 30)} regions")
print("saved dbg_*.png/jpg")
