"""Inspect pixel stats in the scratch zone vs reflection zone."""
import cv2, numpy as np

img = cv2.imread("../../data/uploads/clm_b961eef0afa8eb36/ev_975e81c73b190570.jpg")
H, W = img.shape[:2]
print(f"Image: {W}x{H}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
sat  = hsv[:,:,1].astype(np.float32)
val  = hsv[:,:,2].astype(np.float32)

# Scratch zone: lower-middle of front+rear doors (user-identified)
# approx 10-80% width, 50-80% height
sy0,sy1 = int(H*0.50), int(H*0.80)
sx0,sx1 = int(W*0.10), int(W*0.80)
scratch_roi = gray[sy0:sy1, sx0:sx1]
sv_roi      = val[sy0:sy1, sx0:sx1]
ss_roi      = sat[sy0:sy1, sx0:sx1]

# Reflection zone: upper-center bright area
ry0,ry1 = int(H*0.12), int(H*0.42)
rx0,rx1 = int(W*0.10), int(W*0.75)
refl_roi  = gray[ry0:ry1, rx0:rx1]
rv_roi    = val[ry0:ry1, rx0:rx1]
rs_roi    = sat[ry0:ry1, rx0:rx1]

for name, g, v, s in [("SCRATCH", scratch_roi,sv_roi,ss_roi),
                       ("REFLECT", refl_roi, rv_roi, rs_roi)]:
    print(f"\n{name} zone:")
    print(f"  gray  min={g.min():.0f} max={g.max():.0f} mean={g.mean():.0f} p90={np.percentile(g,90):.0f} p95={np.percentile(g,95):.0f}")
    print(f"  val   min={v.min():.0f} max={v.max():.0f} mean={v.mean():.0f}")
    print(f"  sat   min={s.min():.0f} max={s.max():.0f} mean={s.mean():.0f}")

# Background brightness around scratch zone
k = 61
bg = cv2.GaussianBlur(gray, (k,k), 0)
diff = gray - bg
print(f"\nDoG stats in scratch zone:")
dz = diff[sy0:sy1, sx0:sx1]
print(f"  diff min={dz.min():.1f} max={dz.max():.1f} mean={dz.mean():.1f} p90={np.percentile(dz,90):.1f} p95={np.percentile(dz,95):.1f}")

# Visualize candidate pixels in scratch zone with current thresholds
dark_bg = bg <= np.percentile(bg, 60)
for thresh in [10, 14, 18, 22]:
    cand = (diff > thresh) & dark_bg
    n = cand[sy0:sy1, sx0:sx1].sum()
    print(f"  diff>{thresh} & dark_bg  → {n} pixels in scratch zone")

# Also try: simple bright relative to LOCAL background (smaller kernel)
for k2 in (15, 25, 41):
    bg2 = cv2.GaussianBlur(gray, (k2|1,k2|1), 0)
    d2 = gray - bg2
    dz2 = d2[sy0:sy1, sx0:sx1]
    n_bright = (dz2 > 12).sum()
    print(f"  k={k2|1}: diff>12 in scratch zone = {n_bright} pixels, p90={np.percentile(dz2,90):.1f}")

# Save annotated debug image showing scratch zone vs reflection zone
vis = img.copy()
cv2.rectangle(vis, (sx0,sy0),(sx1,sy1),(0,255,0),3)
cv2.rectangle(vis, (rx0,ry0),(rx1,ry1),(0,0,255),3)
cv2.putText(vis,"SCRATCH ZONE",(sx0,sy0-8),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,0),2)
cv2.putText(vis,"REFLECTION",(rx0,ry0-8),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)
cv2.imwrite("dbg_zones.jpg", vis)
print("\nSaved dbg_zones.jpg")
