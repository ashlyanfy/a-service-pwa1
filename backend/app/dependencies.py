import logging

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.config import settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"

    try:
        redis = await get_redis()
        key = f"rl:{client_ip}"

        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, settings.rate_limit_window)

        if count > settings.rate_limit_requests:
            logger.warning("Rate limit exceeded: ip=%s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много запросов. Попробуйте позже.",
            )

    except HTTPException:
        # Пробрасываем 429 дальше, не глушим
        raise
    except Exception as exc:
        # Redis недоступен — пропускаем rate limit, но логируем
        logger.error("Rate limiter unavailable, skipping: %s", exc)
