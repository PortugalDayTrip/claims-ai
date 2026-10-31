"""Debug probe: print detections for an evidence image."""
import json
import sys
import urllib.request

img = sys.argv[1]
profile = sys.argv[2] if len(sys.argv) > 2 else "vehicle"
boundary = "PROBEBOUNDARY"
body = (
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"e.jpg\"\r\n\r\n".encode()
    + open(img, "rb").read()
    + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"profile\"\r\n\r\n{profile}\r\n--{boundary}--\r\n".encode()
)
req = urllib.request.Request(
    "http://127.0.0.1:8110/detect",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)
d = json.load(urllib.request.urlopen(req))
print(f"profile={d['profile']} ms={d['ms']}")
for x in d["detections"]:
    poly = f" poly{len(x['polygon'])}" if x.get("polygon") else ""
    print(f"  {x['label']:30s} conf={x['conf']:.2f} kind={x['kind']:6s} {x['model']:14s} box=({x['nx']:.2f},{x['ny']:.2f},{x['nw']:.2f},{x['nh']:.2f}){poly}")
