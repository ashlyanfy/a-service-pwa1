import logging
import re
import uuid

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.models.order import SERVICE_LABELS
from app.tasks.notifications import send_email_task, send_telegram_task
from bot.keyboards.inline import cities_keyboard, services_keyboard, skip_keyboard
from bot.states import OrderForm

logger = logging.getLogger(__name__)
router = Router()


@router.callback_query(F.data == "start_order")
async def ask_company(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(OrderForm.company)
    await callback.message.answer("🏢 Введите название вашей компании:")
    await callback.answer()


@router.message(OrderForm.company)
async def ask_city(message: Message, state: FSMContext) -> None:
    company = (message.text or "").strip()
    if not (2 <= len(company) <= 200):
        await message.answer("❌ Введите корректное название компании (2–200 символов).")
        return
    await state.update_data(company=company)
    await state.set_state(OrderForm.city)
    await message.answer("📍 Выберите ваш город:", reply_markup=cities_keyboard())


@router.callback_query(F.data.startswith("city:"), OrderForm.city)
async def ask_service(callback: CallbackQuery, state: FSMContext) -> None:
    city = callback.data.split(":", 1)[1]
    await state.update_data(city=city)
    await state.set_state(OrderForm.service)
    await callback.message.edit_text(
        f"📍 Город: <b>{city}</b>\n\n🔧 Выберите тип услуги:",
        parse_mode="HTML",
        reply_markup=services_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("service:"), OrderForm.service)
async def ask_phone(callback: CallbackQuery, state: FSMContext) -> None:
    service_key = callback.data.split(":", 1)[1]
    service_label = SERVICE_LABELS.get(service_key, service_key)
    await state.update_data(service=service_key)
    await state.set_state(OrderForm.phone)
    await callback.message.edit_text(
        f"🔧 Услуга: <b>{service_label}</b>\n\n📞 Введите номер телефона для связи:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(OrderForm.phone)
async def ask_comment(message: Message, state: FSMContext) -> None:
    phone = (message.text or "").strip()
    if not (10 <= len(re.sub(r"\D", "", phone)) <= 12):
        await message.answer("❌ Введите корректный номер телефона (например: +7 700 123 45 67).")
        return
    await state.update_data(phone=phone)
    await state.set_state(OrderForm.comment)
    await message.answer(
        "💬 Добавьте комментарий к заявке (требования, детали, адрес и т.д.):",
        reply_markup=skip_keyboard(),
    )


@router.callback_query(F.data == "skip_comment", OrderForm.comment)
async def finish_order_skip(callback: CallbackQuery, state: FSMContext) -> None:
    await _submit_order(callback.message, state, comment=None)
    await callback.answer()


@router.message(OrderForm.comment)
async def finish_order_comment(message: Message, state: FSMContext) -> None:
    comment = (message.text or "").strip() or None
    await _submit_order(message, state, comment=comment)


async def _submit_order(message: Message, state: FSMContext, comment: str | None) -> None:
    data = await state.get_data()
    order_id = uuid.uuid4().hex[:8].upper()

    order_data = {
        "order_id": order_id,
        "company":  data["company"],
        "city":     data["city"],
        "service":  data["service"],
        "phone":    data["phone"],
        "comment":  comment,
        "name":     None,
        "source":   "telegram_bot",
    }

    try:
        send_email_task.delay(order_data)
        send_telegram_task.delay(order_data)
    except Exception as exc:
        logger.error("Failed to enqueue tasks for order %s: %s", order_id, exc)
        await state.clear()
        await message.answer(
            "⚠️ Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь с нами напрямую."
        )
        return

    await state.clear()
    logger.info("Order from bot enqueued: %s", order_id)

    await message.answer(
        f"✅ <b>Заявка принята!</b>\n\n"
        f"🆔 Номер заявки: <code>{order_id}</code>\n\n"
        f"Наш менеджер свяжется с вами в ближайшее время.",
        parse_mode="HTML",
    )
