"""Download all detection models needed for claims-ai damage detection pipeline."""
from __future__ import annotations
import shutil
from pathlib import Path

MODELS = Path(__file__).parent / "models"
MODELS.mkdir(exist_ok=True)


def dl(repo: str, filename: str, dest: str) -> None:
    from huggingface_hub import hf_hub_download
    p = hf_hub_download(repo, filename, local_dir=str(MODELS / "_dl_cache"))
    out = MODELS / dest
    shutil.copy(p, out)
    print(f"  {dest}: {out.stat().st_size // 1024} KB")


# ── VEHICLE ──────────────────────────────────────────────────────────────────
# 1. CarDD YOLOv8s-SEG v2.0  → 6-class damage + instance masks (75.84% mAP50)
#    beats every paper baseline on dent/scratch/crack/glass/lamp/tire
print("[1] abdullahg7/cardd-yolov8s v2.0 (seg)...")
dl("abdullahg7/cardd-yolov8s", "v2.0/best.pt", "cardd-yolov8s-seg.pt")

# 2. YOLOv11n 14-class part+damage (79.7% mAP50)
#    fender-dent / bonnet-dent / doorouter-dent / roof-dent / boot-dent + lights
print("[2] vineetsarpal/yolov11n-car-damage (14-class)...")
dl("vineetsarpal/yolov11n-car-damage", "best.pt", "yolov11n-14cls.pt")

# ── PROPERTY ─────────────────────────────────────────────────────────────────
# 3. YOLOv8-crack-seg (OpenSistemas) — crack segmentation walls/roads (~90% mAP50)
print("[3] OpenSistemas/YOLOv8-crack-seg (yolov8s)...")
dl("OpenSistemas/YOLOv8-crack-seg", "yolov8s/weights/best.pt", "crack-seg-yolov8s.pt")

# 4. levanell/yolov8n-seg-cracks-joints — wall crack + drywall joint seg (~90% mAP50 mask)
print("[4] levanell/yolov8n-seg-cracks-joints...")
dl("levanell/yolov8n-seg-cracks-joints", "best.pt", "crack-joint-yolov8n.pt")

print("\nAll models downloaded to models/")
for f in sorted(MODELS.glob("*.pt")):
    print(f"  {f.name}: {f.stat().st_size // 1024} KB")
