"""
API Gateway — punto de entrada único para LegalFlow.
Valida JWT (misma SECRET_KEY que IAM) y enruta a los microservicios.
Rutas públicas: POST /api/iam/token/ y POST /api/iam/token/refresh/
"""
from __future__ import annotations

import os
from typing import Optional

import httpx
import jwt
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-secret-key-change-me")

UPSTREAM_IAM = os.environ.get("UPSTREAM_IAM", "http://iam_service:8001/api")
UPSTREAM_DOCUMENT = os.environ.get("UPSTREAM_DOCUMENT", "http://document_service:8002/api")
UPSTREAM_MATTER = os.environ.get("UPSTREAM_MATTER", "http://matter_service:8003/api")
UPSTREAM_TIME = os.environ.get("UPSTREAM_TIME", "http://time_tracking_service:8004/api")
UPSTREAM_BILLING = os.environ.get("UPSTREAM_BILLING", "http://billing_service:8005/api")
UPSTREAM_CALENDAR = os.environ.get("UPSTREAM_CALENDAR", "http://calendar_service:8006/api")
UPSTREAM_ANALYTICS = os.environ.get("UPSTREAM_ANALYTICS", "http://analytics_service:8007/api")
UPSTREAM_PORTAL = os.environ.get("UPSTREAM_PORTAL", "http://client_portal_service:8008/api")

# Prefijos entrantes (sin / inicial) → base upstream, orden: más específicos primero
ROUTE_PREFIXES: list[tuple[str, str]] = [
    ("api/matters-service", UPSTREAM_MATTER),
    ("api/docs-service", UPSTREAM_DOCUMENT),
    ("api/time-service", UPSTREAM_TIME),
    ("api/billing-service", UPSTREAM_BILLING),
    ("api/calendar-service", UPSTREAM_CALENDAR),
    ("api/analytics-service", UPSTREAM_ANALYTICS),
    ("api/portal-service", UPSTREAM_PORTAL),
    ("api/iam", UPSTREAM_IAM),
]

HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "host",
    }
)


def _normalize_path(path: str) -> str:
    return path.lstrip("/")


def is_public_route(path: str, method: str) -> bool:
    if method.upper() != "POST":
        return False
    p = _normalize_path(path.split("?", 1)[0]).rstrip("/")
    return p in ("api/iam/token", "api/iam/token/refresh")


def jwt_valid(authorization: Optional[str]) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization[7:].strip()
    if not token:
        return False
    try:
        jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"],
            options={"verify_exp": True},
        )
        return True
    except jwt.PyJWTError:
        return False


def resolve_upstream(path_without_query: str, query_string: str) -> Optional[str]:
    """Construye la URL completa del microservicio o None si no coincide ningún prefijo."""
    path_part = _normalize_path(path_without_query)
    for prefix, upstream in ROUTE_PREFIXES:
        prefix_key = prefix.rstrip("/")
        base = upstream.rstrip("/")
        if path_part == prefix_key:
            url = f"{base}/"
        elif path_part.startswith(prefix_key + "/"):
            rest = path_part[len(prefix_key) + 1 :]
            url = f"{base}/{rest}" if rest else f"{base}/"
        else:
            continue
        if query_string:
            url = f"{url}?{query_string}"
        return url
    return None


app = FastAPI(title="LegalFlow API Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def gateway_proxy(full_path: str, request: Request):
    path_for_match = _normalize_path(full_path)
    q = request.url.query or ""

    if path_for_match == "health":
        return await health()

    combined_for_auth = path_for_match + (f"?{q}" if q else "")
    target_url = resolve_upstream(path_for_match, q)
    if not target_url:
        return Response(
            content=b'{"detail":"Ruta no reconocida por el gateway."}',
            status_code=404,
            media_type="application/json",
        )

    skip_jwt = request.method == "OPTIONS" or is_public_route(
        combined_for_auth, request.method
    )
    if not skip_jwt:
        auth = request.headers.get("authorization")
        if not jwt_valid(auth):
            return Response(
                content='{"detail":"Credenciales no proporcionadas o token invalido."}'.encode(),
                status_code=401,
                media_type="application/json",
            )

    forward_headers = {}
    for key, value in request.headers.items():
        if key.lower() in HOP_BY_HOP:
            continue
        if key.lower() == "host":
            continue
        forward_headers[key] = value
    from urllib.parse import urlparse
    upstream_host = urlparse(target_url).netloc
    forward_headers["host"] = upstream_host

    body = await request.body()

    timeout = httpx.Timeout(120.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            upstream_resp = await client.request(
                request.method,
                target_url,
                headers=forward_headers,
                content=body if body else None,
            )
        except httpx.RequestError:
            return Response(
                content=b'{"detail":"Servicio upstream no disponible."}',
                status_code=502,
                media_type="application/json",
            )

    out_headers = {
        k: v
        for k, v in upstream_resp.headers.items()
        if k.lower() not in HOP_BY_HOP
    }
    return Response(
        content=upstream_resp.content,
        status_code=upstream_resp.status_code,
        headers=out_headers,
        media_type=upstream_resp.headers.get("content-type"),
    )
