-- =============================================
-- A-SERVICE — Supabase Database Setup
-- Запустить в: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. ТАБЛИЦЫ

CREATE TABLE IF NOT EXISTS contacts (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  label text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extra_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position int DEFAULT 0,
  icon_name text DEFAULT 'truck',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS site_texts (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  section text DEFAULT '',
  label text DEFAULT ''
);

-- 2. ROW LEVEL SECURITY

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;

-- Публичное чтение (для сайта)
CREATE POLICY "public_read_contacts"       ON contacts       FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_portfolio"      ON portfolio      FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_extra_services" ON extra_services FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_site_texts"     ON site_texts     FOR SELECT TO anon USING (true);

-- Запись только для авторизованных (для админки)
CREATE POLICY "auth_all_contacts"       ON contacts       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_portfolio"      ON portfolio      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_extra_services" ON extra_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_site_texts"     ON site_texts     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. НАЧАЛЬНЫЕ ДАННЫЕ

INSERT INTO contacts (key, value, label) VALUES
  ('phone',          '+7 777 729 49 64',         'Телефон'),
  ('email',          'haba-87@mail.ru',           'Email'),
  ('contact_person', 'Асылжанов Азиз, директор', 'Контактное лицо'),
  ('whatsapp',       '77777294964',               'WhatsApp')
ON CONFLICT (key) DO NOTHING;

-- Портфолио не заполняется начальными данными.
-- Карточки добавляются через /admin.html с загрузкой фото в Supabase Storage.
-- Пока таблица пуста — на сайте показывается статический HTML с правильными путями.

INSERT INTO extra_services (position, icon_name, title, description) VALUES
  (0, 'truck',   'Перевозка мебели',           'Организуем аккуратную перевозку мебели по всему Казахстану — от одной точки до комплексного переезда.'),
  (1, 'package', 'Погрузка и разгрузка',       'Бережно выполняем погрузку, разгрузку, занос, вынос и расстановку мебели на объекте.'),
  (2, 'users',   'Профессиональные грузчики',  'Опытная команда быстро подключается к задаче и берёт тяжёлую работу на себя.');

INSERT INTO site_texts (key, value, section, label) VALUES
  ('hero_headline',    'Надёжный подрядчик<br><em>для сети банкоматов</em>', 'hero', 'Главный заголовок'),
  ('hero_subheadline', 'Монтаж, демонтаж, логистика, покраска и сервисное сопровождение банкоматов и платёжных терминалов — по всей Республике Казахстан.', 'hero', 'Подзаголовок'),
  -- Статистика
  ('stat_1_value', '10 000+', 'stats', 'Цифра 1'),
  ('stat_1_label', 'установок и обслуживаний устройств самообслуживания', 'stats', 'Подпись 1'),
  ('stat_2_value', 'с 2012',  'stats', 'Цифра 2'),
  ('stat_2_label', 'работаем на рынке Казахстана', 'stats', 'Подпись 2'),
  ('stat_3_value', '24/7',    'stats', 'Цифра 3'),
  ('stat_3_label', 'оперативная логистика и выезды по задачам клиента', 'stats', 'Подпись 3'),
  -- Услуги
  ('s1_title', 'Монтаж и демонтаж',       'services', 'Услуга 1 — заголовок'),
  ('s1_desc',  'Межстенные, уличные и офисные банкоматы. Учёт технических требований модели и специфики объекта.', 'services', 'Услуга 1 — описание'),
  ('s2_title', 'Логистика и такелаж',      'services', 'Услуга 2 — заголовок'),
  ('s2_desc',  'Собственный спецтранспорт: гидроборты грузоподъёмностью до 1000 кг, манипуляторы, упаковка и контроль сохранности.', 'services', 'Услуга 2 — описание'),
  ('s3_title', 'Покраска и ребрендинг',    'services', 'Услуга 3 — заголовок'),
  ('s3_desc',  'Покраска банкоматов, терминалов и зон обслуживания по брендбуку банка. Точная цветопередача и аккуратная подача.', 'services', 'Услуга 3 — описание'),
  ('s4_title', 'Пусконаладка и СКС',       'services', 'Услуга 4 — заголовок'),
  ('s4_desc',  'Прокладка силового кабеля, пусконаладочные работы и подготовка зоны обслуживания к запуску.', 'services', 'Услуга 4 — описание'),
  ('s5_title', 'Козырьки и подиумы',       'services', 'Услуга 5 — заголовок'),
  ('s5_desc',  'Изготовление и монтаж навесных рекламных козырьков, металлических подиумов и дополнительных конструкций.', 'services', 'Услуга 5 — описание'),
  ('s6_title', 'Чистка и восстановление',  'services', 'Услуга 6 — заголовок'),
  ('s6_desc',  'Сервисное восстановление внешнего вида банкоматов и терминалов до аккуратного фирменного стандарта банка.', 'services', 'Услуга 6 — описание'),
  -- Для кого
  ('for_whom_title',    'Подходит банкам и организациям<br>с действующей сетью устройств самообслуживания', 'for_whom', 'Заголовок раздела'),
  ('for_whom_card1_title', 'Банки',             'for_whom', 'Карточка 1 — заголовок'),
  ('for_whom_card1_desc',  'Для расширения сети, ребрендинга, переезда, замены и обновления парка банкоматов.', 'for_whom', 'Карточка 1 — описание'),
  ('for_whom_card2_title', 'Сервисные компании','for_whom', 'Карточка 2 — заголовок'),
  ('for_whom_card2_desc',  'Когда нужен проверенный подрядчик на монтаж, логистику, выезды по регионам и поддержку проектов.', 'for_whom', 'Карточка 2 — описание'),
  ('for_whom_card3_title', 'Корпоративные сети','for_whom', 'Карточка 3 — заголовок'),
  ('for_whom_card3_desc',  'Для платёжных терминалов, информационных киосков и устройства самообслуживания в филиальной сети.', 'for_whom', 'Карточка 3 — описание'),
  -- Почему выбирают нас
  ('why_title',    'Спокойная организация<br>сложных работ', 'why', 'Заголовок раздела'),
  ('why_card1_title', 'Собственный спецтранспорт',       'why', 'Карточка 1 — заголовок'),
  ('why_card1_desc',  'Гидроборты грузоподъёмностью от 80 до 1 000 кг, манипуляторы и такелажное оснащение.', 'why', 'Карточка 1 — описание'),
  ('why_card2_title', 'Вся Республика Казахстан',        'why', 'Карточка 2 — заголовок'),
  ('why_card2_desc',  'Работаем в крупных городах и регионах, выстраиваем логистику под график заказчика.', 'why', 'Карточка 2 — описание'),
  ('why_card3_title', 'Ответственность за сохранность',  'why', 'Карточка 3 — заголовок'),
  ('why_card3_desc',  'Контроль груза на всём маршруте и бережная работа с банкоматами и терминалами.', 'why', 'Карточка 3 — описание'),
  ('why_card4_title', 'Формат под задачу',               'why', 'Карточка 4 — заголовок'),
  ('why_card4_desc',  'Разовые работы, серийные выезды, долгосрочное сопровождение и отдельные региональные проекты.', 'why', 'Карточка 4 — описание'),
  -- Банки
  ('clients_title', 'Банки, которые нам доверяют', 'clients', 'Заголовок раздела'),
  -- Как мы работаем
  ('process_title',       'Чёткий процесс<br>от заявки до сдачи', 'process', 'Заголовок раздела'),
  ('process_step1_title', 'Заявка и расчёт',   'process', 'Шаг 1 — название'),
  ('process_step1_desc',  'Принимаем задачу, уточняем адрес, тип объекта, количество устройств и сроки. Готовим точный расчёт.', 'process', 'Шаг 1 — описание'),
  ('process_step2_title', 'Выезд на объект',   'process', 'Шаг 2 — название'),
  ('process_step2_desc',  'Бригада выезжает со спецтранспортом и необходимым оборудованием. Оцениваем условия на месте.', 'process', 'Шаг 2 — описание'),
  ('process_step3_title', 'Выполнение работ',  'process', 'Шаг 3 — название'),
  ('process_step3_desc',  'Монтаж, демонтаж, покраска или логистика — в соответствии с техзаданием и требованиями банка.', 'process', 'Шаг 3 — описание'),
  ('process_step4_title', 'Сдача и документы', 'process', 'Шаг 4 — название'),
  ('process_step4_desc',  'Акт выполненных работ, уборка после работ и фотофиксация результата. Оборудование сдаётся в полном порядке.', 'process', 'Шаг 4 — описание')
ON CONFLICT (key) DO NOTHING;

-- 4. STORAGE BUCKET для фото портфолио
-- Выполнить отдельно в: Storage → New bucket
-- Название: portfolio
-- Public bucket: YES (включить)
