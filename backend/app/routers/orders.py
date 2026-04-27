import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends

from app.dependencies import rate_limit
from app.models.order import OrderRequest, OrderResponse
from app.services.email import send_email
from app.services.telegram import send_telegram
from app.services.webpush import send_push_to_all

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

    # Email и Telegram — запускаем в фоне через to_thread (синхронные функции)
    # Не блокируем ответ клиенту, ошибки только логируем
    async def _notify() -> None:
        try:
            await asyncio.to_thread(send_email, order_data)
            logger.info("Email sent: order=%s", order_id)
        except Exception as exc:
            logger.error("Email failed (order=%s): %s", order_id, exc)
        try:
            await asyncio.to_thread(send_telegram, order_data)
            logger.info("Telegram sent: order=%s", order_id)
        except Exception as exc:
            logger.error("Telegram failed (order=%s): %s", order_id, exc)

    asyncio.create_task(_notify())

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
