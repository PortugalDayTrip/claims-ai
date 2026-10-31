# damage-detect — CPU damage detection microservice

Trained ONNX YOLO models (no VLM/GPU needed). ~0.3–1.5s/image on CPU.

## Models (models/)

| File | Source | Classes | mAP50 |
|---|---|---|---|
| `cardd-yolov8s-seg.onnx` | `abdullahg7/cardd-yolov8s` v2.0 | dent, scratch, crack, glass_shatter, lamp_broken, tire_flat | 75.8% (boxes+masks) |
| `yolov11n-14cls.onnx` | `vineetsarpal/yolov11n-car-damage` | bonnet-dent, doorouter-dent, fender-dent, roof-dent, boot-dent, bumpers, windscreens, lamps, sidemirror, runningboard | 79.7% |
| `crack-seg-yolov8s.onnx` | `OpenSistemas/YOLOv8-crack-seg` | crack (walls/roads/concrete) | — |
| `crack-joint-yolov8n.onnx` | `levanell/yolov8n-seg-cracks-joints` | crack, joint | ~90% mask |

Negative-trained CarDD variant (`car-damage-yolo11.onnx`, HF `sosa123454321/cekicin-damage-yolo11m-neg-onnx`) also kept — deduped against cardd-seg.

## Run

```powershell
python -m uvicorn app:app --port 8110 --host 127.0.0.1
```

Requires system Python 3.12 with `onnxruntime, opencv-python, fastapi, uvicorn, numpy` (already installed).

## API

- `GET /health` → model presence
- `POST /detect` multipart `image` + `profile=vehicle|property|auto` → detections with `nx,ny,nw,nh` bboxes + `polygon` masks
- `POST /annotate` → debug JPEG with boxes/masks drawn

## Rebuild models

```powershell
python download_models.py   # download .pt from HuggingFace
python export_all.py        # .pt → .onnx (needs ultralytics+torch)
python export_damage.py     # optional: re-export YOLO-World open-vocab (legacy)
```

## Integration

`lib/damage-detect.ts` → `detectDamage(buf, profile)` is the **primary** per-image path in `lib/analysis.ts` (`analyzeOne`); the VLM (`AI_VISION_URL`) is only an optional enricher. Findings pass through `validateFindings()` for PT cost bands + repair types, and carry `bbox`/`polygon` into the adjuster UI overlay.
