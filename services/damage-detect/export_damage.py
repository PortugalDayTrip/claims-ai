"""
Export YOLO-World to ONNX with an insurance DAMAGE + PARTS vocabulary baked in.

YOLO-World is open-vocabulary (CLIP text encoder inside the ONNX): it can
detect arbitrary labels — dents, water stains, broken glass — plus the object
they sit on (door, roof, pipe), giving us free part attribution.

Run once:
    python export_damage.py          # needs ultralytics + torch (installed)

Produces: models/damage-world.onnx  (~50MB, CPU-friendly yolov8s)
"""
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
OUT = MODELS_DIR / "damage-world.onnx"

# Vocabulary tuned for claim evidence: damage states first, then the
# vehicle parts / property zones they attach to (for partKey + region).
# Keep the list focused — more classes = slower NMS + more confusion.
DAMAGE_CLASSES = [
    # --- vehicle damage (descriptive phrases — CLIP encodes these better) ---
    "car dent", "dented car door", "crushed car panel", "car scratch",
    "scratched car paint", "paint scuff", "cracked car glass",
    "shattered car window", "broken headlight", "broken taillight",
    "broken side mirror", "rust on car", "car corrosion",
    "flat tire", "deployed airbag", "torn car seat",
    "damaged bumper", "car body damage", "collision damage",
    # --- property damage ---
    "water stain on ceiling", "water damage on wall", "mold on wall",
    "mildew", "damp patch", "crack in wall", "stained ceiling",
    "hole in wall", "peeling paint", "missing roof tile",
    "damaged roof tiles", "broken floor tile", "cracked tile",
    "fire damage", "burn mark", "flood damage", "structural crack",
    "leaking pipe", "burst pipe", "broken window glass", "damaged door",
    # --- vehicle parts (context for part attribution) ---
    "car door", "car bumper", "car hood", "car roof", "car trunk",
    "fender", "windshield", "side window", "side mirror",
    "headlight", "taillight", "wheel", "license plate", "grille",
    # --- property zones (context) ---
    "roof", "roof tiles", "wall", "ceiling", "floor", "window",
    "door", "water pipe", "gutter", "staircase",
]


def main() -> None:
    try:
        from ultralytics import YOLOWorld
    except ImportError:
        raise SystemExit("pip install ultralytics  first")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    src = Path(__file__).parent / "yolov8s-worldv2.pt"
    print("[1/3] loading yolov8s-worldv2 …")
    model = YOLOWorld(str(src))

    print(f"[2/3] baking {len(DAMAGE_CLASSES)} classes")
    model.set_classes(DAMAGE_CLASSES)

    print("[3/3] exporting ONNX …")
    out = model.export(format="onnx", imgsz=960, opset=17, simplify=True)
    Path(out).replace(OUT)
    print(f"done → {OUT}")


if __name__ == "__main__":
    main()
