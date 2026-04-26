import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import rate_limit
from app.models.order import OrderRequest, OrderResponse
from app.services.webpush import send_push_to_all
from app.tasks.notifications import send_email_task, send_telegram_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, dependencies=[Depends(rate_limit)])
async def create_order(order: OrderRequest) -> OrderResponse:
    order_id = uuid.uuid4().hex[:8].upper()
    order_data = {
        **order.model_dump(),
        "order_id": order_id,
        "service": order.service.value,
    }

    # Celery-задачи: email и Telegram (асинхронно через брокер)
    try:
        send_email_task.delay(order_data)
        send_telegram_task.delay(order_data)
    except Exception as exc:
        logger.error("Failed to enqueue notification tasks: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис временно недоступен. Попробуйте позже.",
        )

    # Web Push — запускаем в отдельном потоке, чтобы не блокировать event loop.
    # send_push_to_all делает синхронные HTTP-запросы к push-серверам (Google/Mozilla),
    # поэтому asyncio.to_thread переносит работу в ThreadPoolExecutor.
    try:
        await asyncio.to_thread(
            send_push_to_all,
            {
                "title": "📋 Новая заявка",
                "body": f"{order.company} · {order.city} · {order.service.value}",
                "order_id": order_id,
                "url": "/#cabinet",
            },
        )
    except Exception as exc:
        # Push не должен прерывать обработку заявки — только логируем
        logger.error("Push notification failed: %s", exc)

    logger.info("Order created: %s", order_id)
    return OrderResponse(
        success=True,
        message="Заявка принята. Мы свяжемся с вами в ближайшее время.",
        order_id=order_id,
    )
