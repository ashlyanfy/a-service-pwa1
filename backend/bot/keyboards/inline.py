from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

CITIES = [
    "Алматы", "Астана", "Шымкент", "Актобе",
    "Тараз", "Павлодар", "Усть-Каменогорск",
    "Атырау", "Семей", "Другой",
]

SERVICES = {
    "atm-install":        "Монтаж банкоматов",
    "atm-uninstall":      "Демонтаж банкоматов",
    "terminal-uninstall": "Демонтаж терминалов",
    "service":            "Обслуживание",
    "logistics":          "Логистика",
    "painting":           "Покраска и ребрендинг",
    "other":              "Другое",
}


def start_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="📋 Оставить заявку", callback_data="start_order"),
    ]])


def cities_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=city, callback_data=f"city:{city}")]
        for city in CITIES
    ])


def services_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=label, callback_data=f"service:{key}")]
        for key, label in SERVICES.items()
    ])


def skip_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Пропустить →", callback_data="skip_comment"),
    ]])