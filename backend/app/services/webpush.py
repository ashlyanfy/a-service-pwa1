"""
Web Push Service.

Хранит push-подписки CRM-менеджеров в JSON-файле.
Отправляет зашифрованный push через pywebpush (VAPID).

Безопасность файла:
  - threading.Lock защищает от race condition при параллельных запросах.
  - Запись атомарна: сначала пишем во временный файл, потом rename().
    Если процесс упадёт в середине записи — основной файл не повредится.
"""

import json
import logging
import threading
from pathlib import Path
from typing import TypedDict

from pywebpush import WebPushException, webpush

from app.config import settings

logger = logging.getLogger(__name__)

# ── Константы ─────────────────────────────────────────────────────────────────

_BASE_DIR = Path(__file__).parent.parent.parent        # → backend/
SUBSCRIPTIONS_FILE = _BASE_DIR / "subscriptions.json"
_PRIVATE_KEY_FILE  = _BASE_DIR / "private_key.pem"

_file_lock = threading.Lock()

MAX_PAYLOAD_BYTES = 3_500  # Web Push spec limit ~4 KB; оставляем запас


# ── Типы ──────────────────────────────────────────────────────────────────────

class SubscriptionKeys(TypedDict):
    p256dh: str
    auth: str


class Subscription(TypedDict):
    endpoint: str
    keys: SubscriptionKeys


# ── Файловые операции ─────────────────────────────────────────────────────────

def _load() -> list[Subscription]:
    if not SUBSCRIPTIONS_FILE.exists():
        return []
    try:
        data = json.loads(SUBSCRIPTIONS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception as exc:
        logger.error("Failed to load subscriptions: %s", exc)
        return []


def _save(subs: list[Subscription]) -> None:
    """
    Записывает подписки в файл.
    Безопасна при параллельных вызовах благодаря _file_lock.
    Прямая запись (без tempfile) — os.replace() падает с EXDEV когда
    subscriptions.json смонтирован через Docker bind mount (разные FS).
    """
    SUBSCRIPTIONS_FILE.write_text(
        json.dumps(subs, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _is_valid_subscription(sub: object) -> bool:
    """Проверяет структуру подписки перед отправкой push."""
    if not isinstance(sub, dict):
        return False
    keys = sub.get("keys", {})
    return (
        isinstance(sub.get("endpoint"), str)
        and sub["endpoint"].startswith("https://")
        and isinstance(keys.get("p256dh"), str)
        and isinstance(keys.get("auth"), str)
        and bool(keys["p256dh"])
        and bool(keys["auth"])
    )


# ── Публичный API ─────────────────────────────────────────────────────────────

def add_subscription(sub: dict) -> None:
    """Сохраняет подписку. Дубликаты по endpoint заменяются."""
    with _file_lock:
        subs = _load()
        subs = [s for s in subs if s.get("endpoint") != sub.get("endpoint")]
        subs.append(sub)  # type: ignore[arg-type]
        _save(subs)
    logger.info("Push subscription added. Total: %d", len(subs))


def remove_subscription(endpoint: str) -> None:
    """Удаляет подписку по endpoint."""
    with _file_lock:
        subs = _load()
        before = len(subs)
        subs = [s for s in subs if s.get("endpoint") != endpoint]
        _save(subs)
    logger.info("Push subscription removed: %d → %d", before, len(subs))


def send_push_to_all(payload: dict) -> None:
    """
    Отправляет push всем подписанным CRM-менеджерам.
    Вызывается через asyncio.to_thread() из async-эндпоинта,
    чтобы не блокировать event loop.
    """
    if not settings.vapid_private_key:
        logger.warning("VAPID keys not configured — push skipped")
        return

    # Определяем ключ: сначала ищем файл рядом с кодом, затем берём из env
    vapid_key: str = (
        str(_PRIVATE_KEY_FILE)
        if _PRIVATE_KEY_FILE.exists()
        else settings.vapid_private_key
    )

    raw_payload = json.dumps(payload, ensure_ascii=False)
    if len(raw_payload.encode()) > MAX_PAYLOAD_BYTES:
        logger.warning("Push payload too large (%d bytes), truncating body", len(raw_payload))
        payload = {**payload, "body": payload.get("body", "")[:200]}
        raw_payload = json.dumps(payload, ensure_ascii=False)

    with _file_lock:
        subs = _load()

    if not subs:
        logger.info("No push subscriptions — skipped")
        return

    dead: list[str] = []

    for sub in subs:
        if not _is_valid_subscription(sub):
            logger.warning("Skipping malformed subscription: %s", sub)
            continue
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"],
                },
                data=raw_payload,
                vapid_private_key=vapid_key,
                vapid_claims={"sub": settings.vapid_email},
            )
            logger.info("Push sent → %s…", sub["endpoint"][:60])
        except WebPushException as exc:
            status_code = exc.response.status_code if exc.response else None
            if status_code in (404, 410):
                # Подписка устарела — браузер её отозвал
                dead.append(sub["endpoint"])
                logger.info("Dead subscription cleaned: %s…", sub["endpoint"][:60])
            else:
                logger.error("Push error (status=%s): %s", status_code, exc)

    if dead:
        with _file_lock:
            subs = _load()
            subs = [s for s in subs if s.get("endpoint") not in dead]
            _save(subs)
