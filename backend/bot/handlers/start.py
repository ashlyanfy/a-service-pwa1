from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.keyboards.inline import start_keyboard

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "👋 Добро пожаловать в <b>A-SERVICE</b>!\n\n"
        "Монтаж, обслуживание и логистика банкоматов по всему Казахстану.\n\n"
        "Нажмите кнопку ниже, чтобы оставить заявку — мы свяжемся с вами в ближайшее время.",
        parse_mode="HTML",
        reply_markup=start_keyboard(),
    )