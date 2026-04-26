from aiogram.fsm.state import State, StatesGroup


class OrderForm(StatesGroup):
    company = State()
    city    = State()
    service = State()
    phone   = State()
    comment = State()