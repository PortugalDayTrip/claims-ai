"""
claims-ai storage backend — FastAPI microservice for Lightsail/EC2.

Endpoints (all require X-Backend-Key except signed uploads):
  GET  /health
  PUT  /files/{key}        raw body bytes -> /opt/claims/files/{key}
  GET  /files/{key}        serve file bytes
  POST /sign             {key, exp} -> sig (server-side helper, not needed by client)
  PUT  /up/{key}?sig&exp  browser direct upload w/ HMAC signature
  GET  /db/claims        -> claims JSON blob
  PUT  /db/claims        <- claims JSON blob

Run: uvicorn store:app --host 127.0.0.1 --port 8111
Env: BACKEND_KEY (required), DATA_DIR (default /opt/claims)
"""
import hashlib
import hmac
import json
import os
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

DATA = Path(os.getenv("DATA_DIR", "/opt/claims"))
FILES = DATA / "files"
DB = DATA / "claims.json"
KEY = os.environ["BACKEND_KEY"]

FILES.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="claims-backend")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


def _auth(x_backend_key: str | None):
    if not x_backend_key or not hmac.compare_digest(x_backend_key, KEY):
        raise HTTPException(401, "bad key")


def _sig(key: str, exp: int) -> str:
    return hmac.new(KEY.encode(), f"{key}|{exp}".encode(), hashlib.sha256).hexdigest()


def _safe(key: str) -> Path:
    p = (FILES / key).resolve()
    if FILES.resolve() not in p.parents:
        raise HTTPException(400, "bad key path")
    return p


@app.get("/health")
def health():
    return {"ok": True, "ts": int(time.time())}


@app.put("/files/{key:path}")
async def put_file(key: str, request: Request, x_backend_key: str | None = Header(None)):
    _auth(x_backend_key)
    body = await request.body()
    p = _safe(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(body)
    return {"key": key, "size": len(body), "sha256": hashlib.sha256(body).hexdigest()}


@app.get("/files/{key:path}")
def get_file(key: str, x_backend_key: str | None = Header(None)):
    _auth(x_backend_key)
    p = _safe(key)
    if not p.exists():
        raise HTTPException(404)
    return Response(p.read_bytes(), media_type="application/octet-stream")


@app.put("/up/{key:path}")
async def browser_put(key: str, request: Request, sig: str = "", exp: int = 0):
    if exp < time.time() or not hmac.compare_digest(sig, _sig(key, exp)):
        raise HTTPException(401, "bad signature")
    body = await request.body()
    if len(body) > 500 * 1024 * 1024:
        raise HTTPException(413, "too large")
    p = _safe(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(body)
    return {"key": key, "size": len(body), "sha256": hashlib.sha256(body).hexdigest()}


@app.get("/dl/{key:path}")
def signed_get(key: str, sig: str = "", exp: int = 0):
    if exp < time.time() or not hmac.compare_digest(sig, _sig(key, exp)):
        raise HTTPException(401, "bad signature")
    p = _safe(key)
    if not p.exists():
        raise HTTPException(404)
    import mimetypes
    mt = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return Response(p.read_bytes(), media_type=mt)


@app.get("/db/claims")
def get_claims(x_backend_key: str | None = Header(None)):
    _auth(x_backend_key)
    if not DB.exists():
        return JSONResponse(None)
    return json.loads(DB.read_text())


@app.put("/db/claims")
async def put_claims(request: Request, x_backend_key: str | None = Header(None)):
    _auth(x_backend_key)
    body = await request.body()
    DB.write_bytes(body)
    return {"ok": True, "bytes": len(body)}
