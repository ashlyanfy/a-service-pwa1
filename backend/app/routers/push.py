"""
Push Notification Router.

Эндпоинты:
  GET  /api/push/vapid-public-key  — публичный VAPID-ключ (открыт, нужен браузеру)
  POST /api/push/crm-login         — CRM-логин, возвращает сессионный токен
  POST /api/push/subscribe         — подписка (требует X-Crm-Token)
  POST /api/push/unsubscribe       — отписка  (требует X-Crm-Token)

Безопасность:
  - crm-login использует secrets.compare_digest против timing-атак
  - crm-login защищён rate limit (5 запросов / 60 сек)
  - subscribe и unsubscribe требуют валидный сессионный токен
  - endpoint валидируется: только HTTPS, максимальная длина
"""

import secrets as _secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, field_validator

from app.config import settings
from app.dependencies import rate_limit
from app.services.crm_session import create_token, revoke_token, verify_token
from app.services.webpush import add_subscription, remove_subscription

router = APIRouter(prefix="/api/push", tags=["push"])


# ── Схемы запросов ────────────────────────────────────────────────────────────

class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

    @field_validator("p256dh", "auth")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Key must not be empty")
        return v


class SubscriptionRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def endpoint_must_be_https(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("https://"):
            raise ValueError("Endpoint must use HTTPS")
        if len(v) > 512:
            raise ValueError("Endpoint URL too long")
        return v


class UnsubscribeRequest(BaseModel):
    endpoint: str

    @field_validator("endpoint")
    @classmethod
    def endpoint_must_be_https(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("https://"):
            raise ValueError("Endpoint must use HTTPS")
        return v


class CrmLoginRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Password is required")
        return v


class CrmLogoutRequest(BaseModel):
    token: str


# ── Зависимость: проверка CRM-токена ─────────────────────────────────────────

def require_crm_token(x_crm_token: str = Header(default="")) -> str:
    """
    FastAPI dependency.
    Читает заголовок X-Crm-Token и проверяет его валидность.
    Возвращает токен если он действителен, иначе 401.
    """
    if not verify_token(x_crm_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный токен CRM",
        )
    return x_crm_token


# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@router.get("/vapid-public-key")
async def get_vapid_public_key() -> dict:
    """Публичный VAPID-ключ — открытый эндпоинт, нужен браузеру при подписке."""
    return {"publicKey": settings.vapid_public_key}


@router.get("/crm-verify")
async def crm_verify(_token: str = Depends(require_crm_token)) -> dict:
    """
    Проверяет валидность токена.
    Фронтенд вызывает при открытии CRM-вкладки, чтобы убедиться что сессия активна.
    Возвращает 200 если токен жив, 401 если истёк или сервер перезапускался.
    """
    return {"valid": True}


@router.post("/crm-login", dependencies=[Depends(rate_limit)])
async def crm_login(data: CrmLoginRequest) -> dict:
    """
    Проверяет CRM-пароль и возвращает сессионный токен.
    secrets.compare_digest защищает от timing-атак.
    rate_limit защищает от brute force.
    """
    is_valid = _secrets.compare_digest(
        data.password.encode("utf-8"),
        settings.crm_password.encode("utf-8"),
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль",
        )
    token = create_token()
    return {"success": True, "token": token}


@router.post("/crm-logout")
async def crm_logout(
    data: CrmLogoutRequest,
    _token: str = Depends(require_crm_token),
) -> dict:
    """Отзывает CRM-токен (выход из системы)."""
    revoke_token(data.token)
    return {"success": True}


@router.post("/subscribe")
async def subscribe(
    data: SubscriptionRequest,
    _token: str = Depends(require_crm_token),
) -> dict:
    """
    Сохраняет push-подписку браузера CRM-менеджера.
    Требует валидный X-Crm-Token заголовок.
    """
    add_subscription(data.model_dump())
    return {"success": True}


@router.post("/unsubscribe")
async def unsubscribe(
    data: UnsubscribeRequest,
    _token: str = Depends(require_crm_token),
) -> dict:
    """
    Удаляет push-подписку.
    Используем POST (не DELETE) — тело запроса надёжнее при DELETE через прокси.
    Требует валидный X-Crm-Token заголовок.
    """
    remove_subscription(data.endpoint)
    return {"success": True}
