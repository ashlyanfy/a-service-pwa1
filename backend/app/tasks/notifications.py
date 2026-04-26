import logging

from app.services.email import send_email
from app.services.telegram import send_telegram
from app.tasks.celery import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="notifications.email",
)
def send_email_task(self, order_data: dict) -> None:
    try:
        send_email(order_data)
    except Exception as exc:
        logger.error("Email failed (order=%s): %s", order_data.get("order_id"), exc)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="notifications.telegram",
)
def send_telegram_task(self, order_data: dict) -> None:
    try:
        send_telegram(order_data)
    except Exception as exc:
        logger.error("Telegram failed (order=%s): %s", order_data.get("order_id"), exc)
        raise self.retry(exc=exc)