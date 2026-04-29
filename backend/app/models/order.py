import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator


class ServiceType(str, Enum):
    atm_install = "atm-install"
    atm_uninstall = "atm-uninstall"
    terminal_uninstall = "terminal-uninstall"
    service = "service"
    logistics = "logistics"
    painting = "painting"
    other = "other"


SERVICE_LABELS: dict[str, str] = {
    "atm-install": "Монтаж банкоматов",
    "atm-uninstall": "Демонтаж банкоматов",
    "terminal-uninstall": "Демонтаж терминалов",
    "service": "Обслуживание",
    "logistics": "Логистика",
    "painting": "Покраска и ребрендинг",
    "other": "Другое",
}

ALLOWED_CITIES = {
    "Алматы", "Астана", "Шымкент", "Актобе",
    "Тараз", "Павлодар", "Усть-Каменогорск",
    "Атырау", "Семей", "Другой",
}


class OrderRequest(BaseModel):
    name: Optional[str] = None
    company: str
    phone: str
    city: str
    service: ServiceType
    comment: Optional[str] = None
    # Поля из личного кабинета
    address: Optional[str] = None
    count: Optional[int] = None
    scheduled_at: Optional[str] = None

    @field_validator("company")
    @classmethod
    def validate_company(cls, v: str) -> str:
        v = v.strip()
        if not (2 <= len(v) <= 200):
            raise ValueError("Некорректное название компании")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if not (10 <= len(digits) <= 12):
            raise ValueError("Некорректный номер телефона")
        return v

    @field_validator("city")
    @classmethod
    def validate_city(cls, v: str) -> str:
        if v not in ALLOWED_CITIES:
            raise ValueError("Неизвестный город")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 100:
                raise ValueError("Имя слишком длинное")
            return v or None
        return None

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 1000:
                raise ValueError("Комментарий слишком длинный")
            return v or None
        return None

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 300:
                raise ValueError("Адрес слишком длинный")
            return v or None
        return None

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 9999):
            raise ValueError("Количество должно быть от 1 до 9999")
        return v


class OrderResponse(BaseModel):
    success: bool
    message: str
    order_id: str