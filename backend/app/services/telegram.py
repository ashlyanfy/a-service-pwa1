import html
import logging

import httpx

from app.config import settings
from app.models.order import SERVICE_LABELS

logger = logging.getLogger(__name__)

_TELEGRAM_URL = "https://api.telegram.org/bot{token}/sendMessage"


def _build_message(order: dict) -> str:
    service = SERVICE_LABELS.get(order.get("service", ""), order.get("service", "—"))

    def esc(v: str) -> str:
        return html.escape(str(v))

    name_line = f"👤 <b>Имя:</b> {esc(order['name'])}\n" if order.get("name") else ""
    comment_line = f"💬 <b>Комментарий:</b> {esc(order['comment'])}\n" if order.get("comment") else ""

    return (
        f"📋 <b>Новая заявка — A-SERVICE</b>\n\n"
        f"🏢 <b>Компания:</b> {esc(order.get('company', '—'))}\n"
        f"{name_line}"
        f"📞 <b>Телефон:</b> {esc(order.get('phone', '—'))}\n"
        f"📍 <b>Город:</b> {esc(order.get('city', '—'))}\n"
        f"🔧 <b>Услуга:</b> {esc(service)}\n"
        f"{comment_line}"
        f"🆔 <b>ID:</b> <code>{esc(order.get('order_id', '—'))}</code>"
    )


def send_telegram(order: dict) -> None:
    url = _TELEGRAM_URL.format(token=settings.telegram_bot_token)
    text = _build_message(order)

    with httpx.Client(timeout=10) as client:
        response = client.post(url, json={
            "chat_id": settings.telegram_chat_id,
            "text": text,
            "parse_mode": "HTML",
        })
        response.raise_for_status()

    logger.info("Telegram sent: order=%s", order.get("order_id"))