"""
Export all .pt checkpoint files to ONNX for ONNXRuntime inference.

Models exported:
  cardd-yolov8s-seg.pt   → cardd-yolov8s-seg.onnx   (seg, 6-class, 640px)
  yolov11n-14cls.pt      → yolov11n-14cls.onnx       (detect, 14-class, 640px)
  crack-seg-yolov8s.pt   → crack-seg-yolov8s.onnx    (seg, 1-class crack, 640px)
  crack-joint-yolov8n.pt → crack-joint-yolov8n.onnx  (seg, 2-class, 640px)

Run: python export_all.py
"""
from __future__ import annotations
from pathlib import Path
from ultralytics import YOLO

MODELS = Path(__file__).parent / "models"

EXPORTS = [
    # (input_pt,                    output_onnx,                 imgsz, opset)
    ("cardd-yolov8s-seg.pt",    "cardd-yolov8s-seg.onnx",    640,   17),
    ("yolov11n-14cls.pt",       "yolov11n-14cls.onnx",       640,   17),
    ("crack-seg-yolov8s.pt",    "crack-seg-yolov8s.onnx",    640,   17),
    ("crack-joint-yolov8n.pt",  "crack-joint-yolov8n.onnx",  640,   17),
]


def main() -> None:
    for pt_name, onnx_name, imgsz, opset in EXPORTS:
        pt_path = MODELS / pt_name
        out_path = MODELS / onnx_name
        if out_path.exists():
            print(f"[skip] {onnx_name} already exists")
            continue
        if not pt_path.exists():
            print(f"[MISSING] {pt_name} — run download_models.py first")
            continue
        print(f"[export] {pt_name} → {onnx_name} ...")
        model = YOLO(str(pt_path))
        exported = model.export(
            format="onnx",
            imgsz=imgsz,
            opset=opset,
            simplify=True,
            dynamic=False,
        )
        # ultralytics saves next to the .pt; move to models/
        exported_path = Path(exported)
        if exported_path != out_path:
            exported_path.replace(out_path)
        size_mb = out_path.stat().st_size / 1_048_576
        print(f"  → {onnx_name} ({size_mb:.1f} MB)")

    print("\nExport summary:")
    for _, onnx_name, _, _ in EXPORTS:
        p = MODELS / onnx_name
        status = f"{p.stat().st_size / 1_048_576:.1f} MB" if p.exists() else "MISSING"
        print(f"  {onnx_name}: {status}")


if __name__ == "__main__":
    main()
