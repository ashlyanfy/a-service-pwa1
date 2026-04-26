from celery import Celery

from app.config import settings

celery_app = Celery(
    "a_service",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.notifications"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Almaty",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)