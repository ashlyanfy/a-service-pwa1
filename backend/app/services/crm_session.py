"""
CRM Session — in-memory token store.

Логика:
  - При успешном логине генерируется криптографически случайный токен.
  - Токен живёт TOKEN_TTL_SECONDS секунд (24 ч).
  - Все операции защищены threading.Lock — безопасно при нескольких потоках uvicorn.
  - Для нескольких uvicorn-воркеров (--workers N) нужен общий Redis-хранилище;
    при одном воркере (дефолт) этого достаточно.
"""

import secrets
import threading
import time

# ── Константы ─────────────────────────────────────────────────────────────────

TOKEN_TTL_SECONDS: int = 86_400  # 24 часа
TOKEN_BYTES: int = 32            # 256 бит случайности

# ── Хранилище ─────────────────────────────────────────────────────────────────

_tokens: dict[str, float] = {}   # token → expiry timestamp (monotonic)
_lock = threading.Lock()


# ── Публичный API ─────────────────────────────────────────────────────────────

def create_token() -> str:
    """Генерирует новый CRM-токен и сохраняет его."""
    token = secrets.token_hex(TOKEN_BYTES)
    expiry = time.monotonic() + TOKEN_TTL_SECONDS

    with _lock:
        _purge_expired()
        _tokens[token] = expiry

    return token


def verify_token(token: str) -> bool:
    """Возвращает True если токен существует и не истёк."""
    if not token:
        return False

    with _lock:
        expiry = _tokens.get(token)
        if expiry is None:
            return False
        if time.monotonic() > expiry:
            del _tokens[token]
            return False
        return True


def revoke_token(token: str) -> None:
    """Отзывает токен (выход из CRM)."""
    with _lock:
        _tokens.pop(token, None)


# ── Внутренние хелперы ────────────────────────────────────────────────────────

def _purge_expired() -> None:
    """Удаляет просроченные токены. Вызывать под _lock."""
    now = time.monotonic()
    expired = [t for t, exp in _tokens.items() if now > exp]
    for t in expired:
        del _tokens[t]
