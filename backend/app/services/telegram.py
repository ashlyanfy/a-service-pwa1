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

    lines = [
        "📋 <b>Новая заявка — A-SERVICE</b>\n",
        f"🏢 <b>Компания:</b> {esc(order.get('company', '—'))}",
    ]
    if order.get("name"):
        lines.append(f"👤 <b>Имя:</b> {esc(order['name'])}")
    lines.append(f"📞 <b>Телефон:</b> {esc(order.get('phone', '—'))}")
    lines.append(f"📍 <b>Город:</b> {esc(order.get('city', '—'))}")
    lines.append(f"🔧 <b>Услуга:</b> {esc(service)}")
    if order.get("address"):
        lines.append(f"📌 <b>Адрес:</b> {esc(order['address'])}")
    if order.get("count"):
        lines.append(f"🔢 <b>Количество:</b> {esc(str(order['count']))} устр.")
    if order.get("scheduled_at"):
        lines.append(f"🗓 <b>Дата:</b> {esc(order['scheduled_at'])}")
    if order.get("comment"):
        lines.append(f"💬 <b>Комментарий:</b> {esc(order['comment'])}")
    lines.append(f"🆔 <b>ID:</b> <code>{esc(order.get('order_id', '—'))}</code>")

    return "\n".join(lines)


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