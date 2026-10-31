"""Save each pipeline stage to diagnose why scratches are missed."""
import cv2, numpy as np

img = cv2.imread("../../data/uploads/clm_b961eef0afa8eb36/ev_975e81c73b190570.jpg")
H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
val  = hsv[:,:,2].astype(np.float32)

# ── current pipeline ──────────────────────────────────────────────────────────
k = max(31, int(min(H,W)/8)|1)
bg = cv2.GaussianBlur(gray,(k,k),0)
diff = gray - bg
dark_bg = bg <= np.percentile(bg,60)
cand = (diff > max(18, np.percentile(diff,95))) & dark_bg

cv2.imwrite("dbg3_bg.png",       bg.astype(np.uint8))
cv2.imwrite("dbg3_diff.png",     cv2.normalize(diff,None,0,255,cv2.NORM_MINMAX).astype(np.uint8))
cv2.imwrite("dbg3_dark_bg.png",  dark_bg.astype(np.uint8)*255)
cv2.imwrite("dbg3_cand.png",     cand.astype(np.uint8)*255)

# ── proposed fix: two-pass approach ──────────────────────────────────────────
# Pass 1: tight local contrast (small kernel) to catch fine marks
# Pass 2: exclude regions where LOCAL neighbourhood is overwhelmingly bright
# (= specular reflection) using Laplacian variance — reflections have NO texture
for k2 in (21, 41):
    bg2 = cv2.GaussianBlur(gray,(k2|1,k2|1),0)
    d2  = gray - bg2

    # Local texture measure — low = smooth (reflection), high = detail (scratches, edges)
    lap = cv2.Laplacian(gray.astype(np.uint8), cv2.CV_32F)
    local_var = cv2.GaussianBlur(lap**2,(k2|1,k2|1),0)
    has_texture = local_var > 25  # scratch areas have edges; reflections don't

    # Mark = locally bright AND has detail around it
    mark = (d2 > 10) & has_texture
    cv2.imwrite(f"dbg3_mark_k{k2}.png", mark.astype(np.uint8)*255)

    # Show merged result
    mm = cv2.morphologyEx(mark.astype(np.uint8)*255, cv2.MORPH_CLOSE, np.ones((9,9),np.uint8))
    cnts,_ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    vis = img.copy()
    for c in cnts:
        if cv2.contourArea(c) < 50: continue
        cx,cy,cw,ch = cv2.boundingRect(c)
        # skip bright-mean (reflection)
        roi_v = val[cy:cy+ch, cx:cx+cw]
        if roi_v.mean() > 185: continue
        cv2.rectangle(vis,(cx,cy),(cx+cw,cy+ch),(0,255,0),2)
        cv2.drawContours(vis,[c],-1,(0,200,0),1)
    cv2.imwrite(f"dbg3_result_k{k2}.jpg", vis)
    n = sum(1 for c in cnts if cv2.contourArea(c)>50)
    print(f"k={k2}: {n} zones")
