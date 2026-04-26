import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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