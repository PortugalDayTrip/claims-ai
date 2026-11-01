"""
damage-detect v3 — CPU-only insurance damage detection microservice.

4-model ONNX ensemble routed by claim profile:

VEHICLE profile (collision, theft, vandalism):
  ① cardd-yolov8s-seg.onnx  — YOLOv8s-seg CarDD (75.8% mAP50)
      dent | scratch | crack | glass_shatter | lamp_broken | tire_flat
      + instance segmentation masks
  ② yolov11n-14cls.onnx     — YOLOv11n 14-class part+damage (79.7% mAP50)
      bonnet-dent | doorouter-dent | fender-dent | roof-dent | boot-dent
      | Headlight-damage | Front-windscreen-damage | Sidemirror-Damage …

PROPERTY profile (water, fire, structural):
  ③ crack-seg-yolov8s.onnx  — YOLOv8s-seg crack segmentation (walls/roads)
  ④ crack-joint-yolov8n.onnx— YOLOv8n-seg wall crack + drywall joint

AUTO  → vehicle first; if no vehicle hits, try property set.

Endpoints:
  GET  /health
  POST /detect   multipart: image=<file> [form: profile=vehicle|property|auto]
  POST /annotate multipart: image=<file> [form: profile=…] → JPEG overlay

Run:  uvicorn app:app --port 8110
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

# ─────────────────────────── Model paths ────────────────────────────────────
MODELS = Path(__file__).parent / "models"

CARDD_PATH     = MODELS / "cardd-yolov8s-seg.onnx"   # YOLOv8s-seg 6-class
V11N_PATH      = MODELS / "yolov11n-14cls.onnx"       # YOLOv11n 14-class
CRACK_SEG_PATH = MODELS / "crack-seg-yolov8s.onnx"   # YOLOv8s-seg 1-class crack
CRACK_JT_PATH  = MODELS / "crack-joint-yolov8n.onnx" # YOLOv8n-seg 2-class
WORLD_PATH     = MODELS / "damage-world.onnx"        # YOLO-World open-vocab (parts only)

# ─────────────────────────── Class definitions ───────────────────────────────
# CarDD YOLOv8s-seg: 6 damage types (order matches ONNX export)
CARDD_CLASSES = ["dent", "scratch", "crack", "glass_shatter", "lamp_broken", "tire_flat"]
CARDD_CONF    = float(os.getenv("CARDD_CONF", "0.20"))
CARDD_MIN: dict[str, float] = {"lamp_broken": 0.40, "tire_flat": 0.40}

# YOLOv11n 14-class: part-specific damage (order matches ONNX export)
V11N_CLASSES = [
    "Front-windscreen-damage", "Headlight-damage", "Rear-windscreen-Damage",
    "Runningboard-Damage", "Sidemirror-Damage", "Taillight-Damage",
    "bonnet-dent", "boot-dent", "doorouter-dent", "fender-dent",
    "front-bumper-dent", "quaterpanel-dent", "rear-bumper-dent", "roof-dent",
]
V11N_CONF = float(os.getenv("V11N_CONF", "0.15"))  # fender/bumper damage lands 0.18-0.25

# Crack-seg: single "crack" class
CRACK_SEG_CLASSES = ["crack"]
CRACK_SEG_CONF    = float(os.getenv("CRACK_SEG_CONF", "0.25"))

# Crack-joint: two classes
CRACK_JT_CLASSES = ["joint", "crack"]
CRACK_JT_CONF    = float(os.getenv("CRACK_JT_CONF", "0.25"))
# YOLO-World vocabulary — PART labels only used for context (damage labels
# unreliable on vehicle photos: "rust on car" 0.87 on clean black paint).
WORLD_CLASSES = [
    "car dent", "dented car door", "crushed car panel", "car scratch",
    "scratched car paint", "paint scuff", "cracked car glass",
    "shattered car window", "broken headlight", "broken taillight",
    "broken side mirror", "rust on car", "car corrosion",
    "flat tire", "deployed airbag", "torn car seat",
    "damaged bumper", "car body damage", "collision damage",
    "water stain on ceiling", "water damage on wall", "mold on wall",
    "mildew", "damp patch", "crack in wall", "stained ceiling",
    "hole in wall", "peeling paint", "missing roof tile",
    "damaged roof tiles", "broken floor tile", "cracked tile",
    "fire damage", "burn mark", "flood damage", "structural crack",
    "leaking pipe", "burst pipe", "broken window glass", "damaged door",
    "car door", "car bumper", "car hood", "car roof", "car trunk",
    "fender", "windshield", "side window", "side mirror",
    "headlight", "taillight", "wheel", "license plate", "grille",
    "roof", "roof tiles", "wall", "ceiling", "floor", "window",
    "door", "water pipe", "gutter", "staircase",
]
WORLD_PART_LABELS = {
    "car door", "car bumper", "car hood", "car roof", "car trunk",
    "fender", "windshield", "side window", "side mirror",
    "headlight", "taillight", "wheel", "license plate", "grille",
    "roof", "roof tiles", "wall", "ceiling", "floor", "window",
    "door", "water pipe", "gutter", "staircase",
}
WORLD_CONF = float(os.getenv("WORLD_CONF", "0.12"))
WORLD_IMGSZ = int(os.getenv("WORLD_IMGSZ", "960"))

# 
# NMS IoU threshold (shared)
NMS_IOU = float(os.getenv("NMS_IOU", "0.45"))

# ─────────────────────────── Session cache ───────────────────────────────────
_SESS: dict[str, object] = {}


def _sess(name: str, path: Path):
    if name not in _SESS:
        import onnxruntime as ort
        if not path.exists():
            _SESS[name] = None
        else:
            _SESS[name] = ort.InferenceSession(
                str(path), providers=["CPUExecutionProvider"]
            )
    return _SESS[name]


# ─────────────────────────── Image prep ──────────────────────────────────────
def _letterbox(img: np.ndarray, size: int = 640, pad_val: int = 114):
    """Aspect-ratio-preserving resize + grey pad → (canvas, scale, (pad_x, pad_y))."""
    h, w = img.shape[:2]
    r = min(size / h, size / w)
    nh, nw = round(h * r), round(w * r)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), pad_val, dtype=np.uint8)
    ph, pw = (size - nh) // 2, (size - nw) // 2
    canvas[ph : ph + nh, pw : pw + nw] = resized
    return canvas, r, (pw, ph)


def _preprocess(img: np.ndarray, size: int = 640):
    canvas, r, pad = _letterbox(img, size)
    inp = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return inp.transpose(2, 0, 1)[None], r, pad


# ─────────────────────────── Detection postprocess ───────────────────────────
def _nms_detect(
    raw: np.ndarray,
    classes: list[str],
    conf_thr: float,
    per_class_min: dict[str, float],
    r: float,
    pad: tuple[int, int],
    imgsz: int,
    img_wh: tuple[int, int],
    model_tag: str,
) -> list[dict]:
    """Parse detection output [1, 4+NC, anchors] → NMS'd detections."""
    out = raw[0].T  # (anchors, 4+NC)
    scores = out[:, 4:].max(1)
    keep = scores >= conf_thr

    boxes, labels, confs = [], [], []
    pw, ph = pad
    for row, s in zip(out[keep], scores[keep]):
        label = classes[int(row[4:].argmax())]
        if s < per_class_min.get(label, conf_thr):
            continue
        cx, cy, bw, bh = row[:4]
        # De-letterbox: subtract padding, undo scale
        x = (cx - pw) / r
        y = (cy - ph) / r
        w = bw / r
        h = bh / r
        boxes.append([x - w / 2, y - h / 2, w, h])
        labels.append(label)
        confs.append(float(s))

    if not boxes:
        return []

    idx = cv2.dnn.NMSBoxes(boxes, confs, conf_thr, NMS_IOU)
    W, H = img_wh
    dets = []
    for i in np.array(idx).ravel():
        x, y, w, h = boxes[i]
        x, y = max(0, x), max(0, y)
        w = min(w, W - x)
        h = min(h, H - y)
        dets.append({
            "label":  labels[i],
            "conf":   round(confs[i], 3),
            "x": int(x), "y": int(y), "w": int(w), "h": int(h),
            "nx": round(x / W, 4), "ny": round(y / H, 4),
            "nw": round(w / W, 4), "nh": round(h / H, 4),
            "model": model_tag,
        })
    return sorted(dets, key=lambda d: -d["conf"] * d["w"] * d["h"])


# ─────────────────────────── Segmentation postprocess ────────────────────────
def _seg_masks(
    out0: np.ndarray,   # [1, 4+NC+32, anchors]
    out1: np.ndarray,   # [1, 32, mh, mw]  proto masks
    classes: list[str],
    conf_thr: float,
    per_class_min: dict[str, float],
    r: float,
    pad: tuple[int, int],
    imgsz: int,
    img_wh: tuple[int, int],
    model_tag: str,
) -> list[dict]:
    """Parse segmentation output → detections with normalized mask polygons."""
    NC = len(classes)
    pred = out0[0].T    # (anchors, 4+NC+32)
    proto = out1[0]     # (32, mh, mw)
    mh, mw = proto.shape[1], proto.shape[2]

    scores = pred[:, 4 : 4 + NC].max(1)
    keep = scores >= conf_thr

    boxes, labels, confs, coefs = [], [], [], []
    pw, ph = pad
    for row, s in zip(pred[keep], scores[keep]):
        label = classes[int(row[4 : 4 + NC].argmax())]
        if s < per_class_min.get(label, conf_thr):
            continue
        cx, cy, bw, bh = row[:4]
        x = (cx - pw) / r
        y = (cy - ph) / r
        w = bw / r
        h = bh / r
        boxes.append([x - w / 2, y - h / 2, w, h])
        labels.append(label)
        confs.append(float(s))
        coefs.append(row[4 + NC :].astype(np.float32))  # (32,)

    if not boxes:
        return []

    idx = cv2.dnn.NMSBoxes(boxes, confs, conf_thr, NMS_IOU)
    W, H = img_wh
    dets = []
    for i in np.array(idx).ravel():
        x, y, w, h = boxes[i]
        x, y = max(0, x), max(0, y)
        w = min(w, W - x)
        h = min(h, H - y)

        # Decode mask → contour polygon (normalized)
        coef = coefs[i]
        mask_logits = (coef @ proto.reshape(32, -1)).reshape(mh, mw)
        mask = (1 / (1 + np.exp(-mask_logits))) > 0.5
        mask_full = cv2.resize(
            mask.astype(np.uint8),
            (imgsz, imgsz),
            interpolation=cv2.INTER_NEAREST,
        )
        # Crop mask to the detection box region (in padded space)
        bx = int(max(0, (x * r) + pw))
        by = int(max(0, (y * r) + ph))
        bx2 = int(min(imgsz, bx + w * r))
        by2 = int(min(imgsz, by + h * r))
        mask_crop = np.zeros((imgsz, imgsz), np.uint8)
        mask_crop[by:by2, bx:bx2] = mask_full[by:by2, bx:bx2]
        # De-letterbox the mask to original image space
        mask_orig = mask_crop[ph : ph + int(H * r), pw : pw + int(W * r)]
        if mask_orig.size > 0:
            mask_orig = cv2.resize(mask_orig, (W, H), interpolation=cv2.INTER_NEAREST)
        else:
            mask_orig = np.zeros((H, W), np.uint8)

        # Extract contour
        contours, _ = cv2.findContours(mask_orig, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        polygon: list[list[float]] = []
        if contours:
            c = max(contours, key=cv2.contourArea)
            eps = 0.005 * cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, eps, True)
            polygon = [[round(p[0][0] / W, 4), round(p[0][1] / H, 4)] for p in approx]

        dets.append({
            "label":   labels[i],
            "conf":    round(confs[i], 3),
            "x": int(x), "y": int(y), "w": int(w), "h": int(h),
            "nx": round(x / W, 4), "ny": round(y / H, 4),
            "nw": round(w / W, 4), "nh": round(h / H, 4),
            "polygon": polygon,   # [[nx, ny], …] — for precise mask overlay
            "model":   model_tag,
        })
    return sorted(dets, key=lambda d: -d["conf"] * d["w"] * d["h"])


# ─────────────────────────── Per-model runners ───────────────────────────────
def run_cardd(img: np.ndarray) -> list[dict]:
    sess = _sess("cardd", CARDD_PATH)
    if sess is None:
        return []
    H, W = img.shape[:2]
    inp, r, pad = _preprocess(img, 640)
    outs = sess.run(None, {sess.get_inputs()[0].name: inp})
    # outs[0]: detection, outs[1]: proto (segmentation)
    if len(outs) >= 2:
        dets = _seg_masks(outs[0], outs[1], CARDD_CLASSES, CARDD_CONF,
                          CARDD_MIN, r, pad, 640, (W, H), "cardd-seg")
    else:
        dets = _nms_detect(outs[0], CARDD_CLASSES, CARDD_CONF,
                           CARDD_MIN, r, pad, 640, (W, H), "cardd-seg")
    for i, d in enumerate(dets):
        d["kind"] = "damage"
        # scratch re-localization: keep only bright-on-dark marks, reject reflections
        if d["label"] == "scratch":
            dets[i] = refine_scratch(img, d)
            dets[i]["kind"] = "damage"
        # dent sanity check: a box dominated by flat specular highlight is
        # likely a reflection, not a dent — downweight it (deflectometry insight:
        # a real dent distorts the reflection pattern = has edges)
        elif d["label"] == "dent" and specular_fraction(img, d) > 0.55:
            d["conf"] = round(d["conf"] * 0.4, 3)
            d["possibleReflection"] = True
    return dets


def run_v11n(img: np.ndarray) -> list[dict]:
    sess = _sess("v11n", V11N_PATH)
    if sess is None:
        return []
    H, W = img.shape[:2]
    inp, r, pad = _preprocess(img, 640)
    outs = sess.run(None, {sess.get_inputs()[0].name: inp})
    dets = _nms_detect(outs[0], V11N_CLASSES, V11N_CONF, {}, r, pad, 640, (W, H), "v11n-14cls")
    for d in dets:
        d["kind"] = "damage"
        # a "*-dent" box dominated by flat specular highlight is likely
        # reflection, not a dent — downweight it
        if d["label"].endswith("-dent") and specular_fraction(img, d) > 0.55:
            d["conf"] = round(d["conf"] * 0.4, 3)
            d["possibleReflection"] = True
    return dets


def run_crack_seg(img: np.ndarray) -> list[dict]:
    sess = _sess("crack_seg", CRACK_SEG_PATH)
    if sess is None:
        return []
    H, W = img.shape[:2]
    inp, r, pad = _preprocess(img, 640)
    outs = sess.run(None, {sess.get_inputs()[0].name: inp})
    if len(outs) >= 2:
        dets = _seg_masks(outs[0], outs[1], CRACK_SEG_CLASSES, CRACK_SEG_CONF,
                          {}, r, pad, 640, (W, H), "crack-seg")
    else:
        dets = _nms_detect(outs[0], CRACK_SEG_CLASSES, CRACK_SEG_CONF,
                           {}, r, pad, 640, (W, H), "crack-seg")
    for d in dets:
        d["kind"] = "damage"
    return dets


def run_crack_joint(img: np.ndarray) -> list[dict]:
    sess = _sess("crack_joint", CRACK_JT_PATH)
    if sess is None:
        return []
    H, W = img.shape[:2]
    inp, r, pad = _preprocess(img, 640)
    outs = sess.run(None, {sess.get_inputs()[0].name: inp})
    if len(outs) >= 2:
        dets = _seg_masks(outs[0], outs[1], CRACK_JT_CLASSES, CRACK_JT_CONF,
                          {}, r, pad, 640, (W, H), "crack-joint")
    else:
        dets = _nms_detect(outs[0], CRACK_JT_CLASSES, CRACK_JT_CONF,
                           {}, r, pad, 640, (W, H), "crack-joint")
    for d in dets:
        # "joint" is background artifact — only keep cracks
        d["kind"] = "damage" if d["label"] == "crack" else "part"
    return dets


def _rotate_kernel(size: tuple[int, int], angle_deg: float) -> np.ndarray:
    """Line structuring element rotated by angle (for multi-orientation top-hat)."""
    ker = np.zeros(size, np.uint8)
    cv2.line(ker, (0, size[1] // 2), (size[0] - 1, size[1] // 2), 1, 1)
    M = cv2.getRotationMatrix2D((size[0] / 2 - 0.5, size[1] / 2 - 0.5), angle_deg, 1.0)
    rot = cv2.warpAffine(ker, M, (size[0], size[1]))
    return (rot > 0).astype(np.uint8)


def _elongated(cnt: np.ndarray) -> bool:
    """True if the contour is line-like (aspect ≥ 2.5) or small enough to be a spot scratch."""
    area = cv2.contourArea(cnt)
    if area < 6:
        return False
    if area < 40:
        return True  # tiny pits count as scratches
    (cx, cy), (w, h), _ = cv2.minAreaRect(cnt)
    long, short = max(w, h), min(w, h)
    return long / (short + 1e-3) >= 2.5


def refine_scratch(img: np.ndarray, det: dict) -> dict:
    """Re-localize a 'scratch' detection to actual bright-on-dark marks.

    Literature (MVTec/Merlic scratch tools, deflectometry research, US Patent
    11887064): a scratch on dark glossy paint is a LOCAL positive deviation
    from the smooth background; a specular reflection IS the background.
    Method: Difference-of-Gaussians (gray − smooth background) + dark-surround
    requirement — kills broad reflections regardless of shape/size, keeps
    wavy scuff marks. Falls back to raw detection if nothing survives.
    """
    H, W = img.shape[:2]
    pad = 8
    x0 = max(0, int(det["x"]) - pad); y0 = max(0, int(det["y"]) - pad)
    x1 = min(W, int(det["x"] + det["w"]) + pad); y1 = min(H, int(det["y"] + det["h"]) + pad)
    if x1 - x0 < 12 or y1 - y0 < 12:
        return det
    roi = img[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # ── DoG: local brightness above smooth background
    # kernel ~ 1/6 of ROI (reflection is bigger than this → cancels)
    k = max(15, int(min(gray.shape[:2]) / 6) | 1)
    bg = cv2.GaussianBlur(gray, (k, k), 0)
    diff = gray - bg                      # >0 = brighter than surround

    # scratch candidates: strong positive deviation ON dark-ish background
    dark_bg = bg <= np.percentile(bg, 70)          # not inside bright gradient
    cand = (diff > max(18, np.percentile(diff, 95))) & dark_bg
    mask = cand.astype(np.uint8) * 255

    # merge nearby marks into clusters, then keep meaningful ones
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    good = []
    for c in cnts:
        if cv2.contourArea(c) < 15:
            continue
        # Edge-line rejection: paint-edge highlights (sill trim, panel seams)
        # have dark paint on ONE side and a different surface on the other.
        # A scratch sits inside paint → dark surround on BOTH long sides.
        (cx, cy), (bw, bh), ang = cv2.minAreaRect(c)
        if max(bw, bh) / (min(bw, bh) + 1e-3) > 5 and cv2.contourArea(c) > 30:
            rect_mask = np.zeros(gray.shape, np.uint8)
            cv2.drawContours(rect_mask, [c], -1, 255, -1)
            dil = cv2.dilate(rect_mask, np.ones((9, 9), np.uint8))
            surround = cv2.bitwise_and(dil - rect_mask, dil - rect_mask,
                                       mask=(dil - rect_mask))
            if cv2.countNonZero(surround) > 20:
                # if surrounding is also bright → it's a region boundary, not scratch
                if np.median(gray[surround > 0]) > np.median(gray) + 35:
                    continue
        good.append(c)
    if not good:
        return det

    allpts = np.vstack(good)
    ux, uy, uw, uh = cv2.boundingRect(allpts)
    hull = cv2.convexHull(allpts)
    eps = 0.02 * cv2.arcLength(hull, True)
    poly = cv2.approxPolyDP(hull, eps, True).reshape(-1, 2)

    det = dict(det)
    det["x"], det["y"], det["w"], det["h"] = x0 + ux, y0 + uy, uw, uh
    det["nx"], det["ny"], det["nw"], det["nh"] = det["x"] / W, det["y"] / H, uw / W, uh / H
    det["polygon"] = [[(p[0] + x0) / W, (p[1] + y0) / H] for p in poly]
    det["scratchLines"] = len(good)
    det["refined"] = True
    return det


def find_scratch_regions(img: np.ndarray) -> list[dict]:
    """Standalone scratch/scuff finder using Laplacian-texture + local contrast.

    Key insight (from debug_scratch2/3): scratches on dark glossy paint are
    locally brighter than background AND have surface texture (Laplacian
    variance > 0). Specular reflections are locally bright but SMOOTH (near-zero
    Laplacian). This combination correctly identifies the wavy white scuff marks
    on the door panel while rejecting the large glossy reflection band.
    """
    H, W = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    val = hsv[:, :, 2].astype(np.float32)

    # Small kernel (k~21): captures fine surface marks vs smooth surroundings
    k = max(21, int(min(H, W) / 15) | 1)
    bg = cv2.GaussianBlur(gray, (k, k), 0)
    diff = gray - bg                             # locally brighter than surround

    # Laplacian variance: high = textured (scratches, edges); low = smooth (reflection)
    lap = cv2.Laplacian(gray.astype(np.uint8), cv2.CV_32F)
    lap_sq = lap ** 2
    # smooth the variance so the region around each scratch mark shows texture
    local_var = cv2.GaussianBlur(lap_sq, (k, k), 0)
    has_texture = local_var > 25               # experimentally validated threshold

    # Candidates: locally bright AND textured AND on dark paint.
    # White scuff marks reach diff 40-90 over dark paint (bg 40-80);
    # subtle paint texture noise stays below ~25.
    strong = (diff > 40) & has_texture & (bg < 110)   # definite scuff cores
    cand = ((diff > 20) & has_texture & (bg < 110)) | strong
    mask = cand.astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    # Zone-merging: group marks within ~3% of image width into one scratch cluster
    merge_k = max(9, int(W * 0.03) | 1)
    zones = cv2.dilate(mask, np.ones((merge_k, merge_k), np.uint8))
    zcnts, _ = cv2.findContours(zones, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    img_area = W * H
    out = []
    for zc in zcnts:
        zx, zy, zw, zh = cv2.boundingRect(zc)
        if zw * zh < 80:
            continue
        # real candidate pixels inside this zone
        zmask = np.zeros_like(mask)
        cv2.drawContours(zmask, [zc], -1, 255, -1)
        inner = cv2.bitwise_and(mask, mask, mask=zmask)
        inner_area = cv2.countNonZero(inner)
        if inner_area < 50:
            continue
        # zone must contain at least one STRONG scuff core — otherwise it's
        # just paint texture noise, not reportable damage
        strong_in_zone = cv2.bitwise_and(strong.astype(np.uint8) * 255,
                                         strong.astype(np.uint8) * 255,
                                         mask=zmask)
        if cv2.countNonZero(strong_in_zone) < 15:
            continue
        # reflection reject: zone mean brightness > 185 → still too bright
        roi_v = val[zy:zy + zh, zx:zx + zw]
        if np.mean(roi_v) > 185:
            continue
        rc, _ = cv2.findContours(inner, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not rc:
            continue
        # Zone too big (>15% of image) → split back into individual marks
        if zw * zh > img_area * 0.15:
            for c in rc:
                if cv2.contourArea(c) < 60:
                    continue
                cx, cy, cw, ch = cv2.boundingRect(c)
                hull_c = cv2.convexHull(c)
                eps_c = 0.02 * cv2.arcLength(hull_c, True)
                poly_c = cv2.approxPolyDP(hull_c, eps_c, True).reshape(-1, 2)
                out.append({
                    "label": "scratch", "conf": 0.50,
                    "x": cx, "y": cy, "w": cw, "h": ch,
                    "nx": round(cx / W, 4), "ny": round(cy / H, 4),
                    "nw": round(cw / W, 4), "nh": round(ch / H, 4),
                    "polygon": [[round(p[0] / W, 4), round(p[1] / H, 4)] for p in poly_c],
                    "model": "morph-scratch", "kind": "damage",
                })
            continue
        allpts = np.vstack(rc)
        ux, uy, uw, uh = cv2.boundingRect(allpts)
        hull = cv2.convexHull(allpts)
        eps = 0.02 * cv2.arcLength(hull, True)
        poly = cv2.approxPolyDP(hull, eps, True).reshape(-1, 2)
        out.append({
            "label": "scratch",
            "conf": 0.50,
            "x": ux, "y": uy, "w": uw, "h": uh,
            "nx": round(ux / W, 4), "ny": round(uy / H, 4),
            "nw": round(uw / W, 4), "nh": round(uh / H, 4),
            "polygon": [[round(p[0] / W, 4), round(p[1] / H, 4)] for p in poly],
            "model": "morph-scratch",
            "kind": "damage",
        })
    return out


def specular_fraction(img: np.ndarray, det: dict) -> float:
    """Fraction of a box dominated by smooth specular reflection (no detail).

    Bright + achromatic + near-zero Laplacian = flat highlight. Real damage
    zones contain surface distortion → edges. Used to sanity-check dents.
    """
    H, W = img.shape[:2]
    x0 = max(0, int(det["x"])); y0 = max(0, int(det["y"]))
    x1 = min(W, int(det["x"] + det["w"])); y1 = min(H, int(det["y"] + det["h"]))
    if x1 - x0 < 8 or y1 - y0 < 8:
        return 0.0
    roi = img[y0:y1, x0:x1]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    sat, val = hsv[:, :, 1].astype(np.int16), hsv[:, :, 2].astype(np.int16)
    lap = np.abs(cv2.Laplacian(cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY), cv2.CV_32F))
    spec = (val > 200) & (sat < 70) & (lap < 6)
    return float(spec.mean())


def run_world_parts(img: np.ndarray) -> list[dict]:
    """YOLO-World — PART boxes only (damage labels suppressed as unreliable)."""
    sess = _sess("world", WORLD_PATH)
    if sess is None:
        return []
    H, W = img.shape[:2]
    inp, r, pad = _preprocess(img, WORLD_IMGSZ)
    outs = sess.run(None, {sess.get_inputs()[0].name: inp})
    dets = _nms_detect(outs[0], WORLD_CLASSES, WORLD_CONF, {}, r, pad, WORLD_IMGSZ, (W, H), "world-parts")
    return [
        {**d, "kind": "part"}
        for d in dets
        if d["label"] in WORLD_PART_LABELS
    ]


# ─────────────────────────── IoU dedup ───────────────────────────────────────
def _iou(a: dict, b: dict) -> float:
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix = max(0, min(ax2, bx2) - max(a["x"], b["x"]))
    iy = max(0, min(ay2, by2) - max(a["y"], b["y"]))
    inter = ix * iy
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / (union + 1e-8)


def _dedup(dets: list[dict], iou_thr: float = 0.5) -> list[dict]:
    """Remove lower-confidence boxes that overlap highly with a kept box."""
    # Model priority for dedup: cardd-seg > v11n-14cls > crack-seg > crack-joint
    priority = {"cardd-seg": 0, "v11n-14cls": 1, "crack-seg": 2, "crack-joint": 3}
    ordered = sorted(dets, key=lambda d: (priority.get(d["model"], 9), -d["conf"]))
    out: list[dict] = []
    for d in ordered:
        overlap = any(
            (_iou(d, e) > iou_thr and d["kind"] == e["kind"])
            or (_iou(d, e) > 0.3 and d["label"] == e["label"])  # same label from tiles
            for e in out
        )
        if not overlap:
            out.append(d)
    return sorted(out, key=lambda d: -d["conf"] * d["w"] * d["h"])


# ─────────────────────────── Profile routing ─────────────────────────────────
def _tiles(img: np.ndarray, overlap: float = 0.25) -> list[tuple[np.ndarray, int, int]]:
    """2×2 overlapping tiles. Returns (crop, offset_x, offset_y)."""
    H, W = img.shape[:2]
    hw, hh = W // 2, H // 2
    ox, oy = int(hw * overlap), int(hh * overlap)
    tiles = []
    for ty in (0, hh - oy):
        for tx in (0, hw - ox):
            tiles.append((img[ty : ty + hh + oy, tx : tx + hw + ox], tx, ty))
    return tiles


def _vehicle_detect(img: np.ndarray) -> list[dict]:
    """Full-image + tiled inference; tile detections are offset back to global coords."""
    H, W = img.shape[:2]
    # find_scratch_regions disabled: on glossy black paint, local-contrast CV
    # cannot separate scuff damage from dust/water texture + ground reflection.
    # Kept as callable for future VLM-verified mode.
    dets = run_cardd(img) + run_v11n(img) + run_world_parts(img)
    # Tile pass pays off whenever tiles upscale to 640 for finer detail
    if max(W, H) >= 500:
        for crop, tx, ty in _tiles(img):
            for d in run_cardd(crop) + run_v11n(crop):
                d = dict(d)
                d["x"] += tx; d["y"] += ty
                d["nx"] = d["x"] / W; d["ny"] = d["y"] / H
                d["nw"] = d["w"] / W; d["nh"] = d["h"] / H
                if d.get("polygon"):
                    cw, ch = crop.shape[1], crop.shape[0]
                    d["polygon"] = [[(px * cw + tx) / W, (py * ch + ty) / H] for px, py in d["polygon"]]
                dets.append(d)
    return dets


def detect(img: np.ndarray, profile: str) -> list[dict]:
    if profile == "vehicle":
        dets = _vehicle_detect(img)
    elif profile == "property":
        dets = run_crack_seg(img) + run_crack_joint(img)
    else:  # auto
        vehicle = _vehicle_detect(img)
        if any(d["kind"] == "damage" for d in vehicle):
            dets = vehicle
        else:
            property_ = run_crack_seg(img) + run_crack_joint(img)
            dets = vehicle + property_
    return _dedup(dets)


# ─────────────────────────── FastAPI app ─────────────────────────────────────
app = FastAPI(title="damage-detect", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _decode(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        from fastapi import HTTPException
        raise HTTPException(400, "could not decode image")
    return img


@app.get("/health")
def health():
    return {
        "ok": True,
        "models": {
            "cardd-yolov8s-seg":   CARDD_PATH.exists(),
            "yolov11n-14cls":      V11N_PATH.exists(),
            "crack-seg-yolov8s":   CRACK_SEG_PATH.exists(),
            "crack-joint-yolov8n": CRACK_JT_PATH.exists(),
        },
        "profiles": ["vehicle", "property", "auto"],
    }


def _native(o):
    """Recursively convert numpy scalars/arrays to JSON-native Python types."""
    if isinstance(o, np.generic):
        return o.item()
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, dict):
        return {k: _native(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_native(v) for v in o]
    return o


@app.post("/detect")
async def detect_endpoint(
    image: UploadFile = File(...),
    profile: str = Form("auto"),
):
    t0 = time.perf_counter()
    img = _decode(await image.read())
    dets = detect(img, profile)
    return JSONResponse(_native({
        "detections": dets,
        "damage":     [d for d in dets if d["kind"] == "damage"],
        "parts":      [d for d in dets if d["kind"] == "part"],
        "ms":         round((time.perf_counter() - t0) * 1000),
        "profile":    profile,
    }))


@app.post("/annotate")
async def annotate_endpoint(
    image: UploadFile = File(...),
    profile: str = Form("auto"),
):
    img = _decode(await image.read())
    dets = detect(img, profile)

    # Draw masks (polygons) first, then bounding boxes + labels
    overlay = img.copy()
    for d in dets:
        if d["kind"] == "damage":
            color = (48, 61, 220)    # red-ish
        else:
            color = (140, 100, 30)   # gold

        # Fill polygon mask if available
        if d.get("polygon"):
            H, W = img.shape[:2]
            pts = np.array([[int(p[0] * W), int(p[1] * H)] for p in d["polygon"]])
            if len(pts) >= 3:
                cv2.fillPoly(overlay, [pts], color)

    # Blend mask overlay
    img = cv2.addWeighted(overlay, 0.35, img, 0.65, 0)

    for d in dets:
        color = (48, 61, 220) if d["kind"] == "damage" else (140, 100, 30)
        cv2.rectangle(img,
                      (d["x"], d["y"]),
                      (d["x"] + d["w"], d["y"] + d["h"]),
                      color, 2)
        cv2.putText(img,
                    f"{d['label']} {d['conf']:.2f}",
                    (d["x"], max(14, d["y"] - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return Response(content=buf.tobytes() if ok else b"", media_type="image/jpeg")
