import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers.orders import router as orders_router
from app.routers.push import router as push_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="A-SERVICE API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

# ── Body size limit: 64 KB для API-эндпоинтов ────────────────────────────────
MAX_BODY_SIZE = 64 * 1024  # 64 KB

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "Тело запроса слишком большое (макс. 64 KB)"},
        )
    return await call_next(request)

# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Crm-Token"],
)

app.include_router(orders_router)
app.include_router(push_router)


@app.on_event("startup")
async def on_startup() -> None:
    from app.dependencies import get_redis
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connected: %s", settings.redis_url)
    except Exception as exc:
        logger.warning("Redis not available on startup: %s", exc)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}