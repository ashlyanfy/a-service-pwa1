import html as html_lib
import logging

import resend

from app.config import settings
from app.models.order import SERVICE_LABELS

logger = logging.getLogger(__name__)


def _esc(value: str | None, fallback: str = "—") -> str:
    return html_lib.escape(str(value)) if value else fallback


def _build_html(order: dict) -> tuple[str, str]:
    service = SERVICE_LABELS.get(order.get("service", ""), order.get("service", "—"))
    order_id = order.get("order_id", "—")

    name_row = (
        f"<tr><td><b>👤 Имя</b></td><td>{_esc(order.get('name'))}</td></tr>"
        if order.get("name") else ""
    )
    comment_row = (
        f"<tr><td><b>💬 Комментарий</b></td><td>{_esc(order.get('comment'))}</td></tr>"
        if order.get("comment") else ""
    )

    subject = f"Новая заявка A-SERVICE — {service}"
    body = f"""
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0">📋 Новая заявка — A-SERVICE</h2>
  </div>
  <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse;line-height:2">
      <tr><td style="width:35%;font-weight:bold">🏢 Компания</td><td>{_esc(order.get("company"))}</td></tr>
      {name_row}
      <tr><td><b>📞 Телефон</b></td><td>{_esc(order.get("phone"))}</td></tr>
      <tr><td><b>📍 Город</b></td><td>{_esc(order.get("city"))}</td></tr>
      <tr><td><b>🔧 Услуга</b></td><td>{html_lib.escape(service)}</td></tr>
      {comment_row}
      <tr><td><b>🆔 ID заявки</b></td><td><code>{html_lib.escape(order_id)}</code></td></tr>
    </table>
  </div>
</body></html>
"""
    return subject, body


def send_email(order: dict) -> None:
    resend.api_key = settings.resend_api_key
    subject, body = _build_html(order)

    resend.Emails.send({
        "from": "A-SERVICE <onboarding@resend.dev>",
        "to": [settings.recipient_email],
        "subject": subject,
        "html": body,
    })

    logger.info("Email sent via Resend: order=%s", order.get("order_id"))
