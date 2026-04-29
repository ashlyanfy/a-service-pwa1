-- ============================================================
-- A-SERVICE — полные RLS политики
-- Запустить в Supabase → SQL Editor
-- ============================================================

-- 1. Функция проверки администратора
--    Замени 'haba-87@mail.ru' на реальный email admin-аккаунта
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'haba-87@mail.ru'
  );
$$;

-- ============================================================
-- 2. client_orders — полное покрытие всех операций
-- ============================================================
ALTER TABLE client_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Клиент видит только свои заявки" ON client_orders;
DROP POLICY IF EXISTS "Клиент создаёт свои заявки" ON client_orders;
DROP POLICY IF EXISTS "client_orders_select" ON client_orders;
DROP POLICY IF EXISTS "client_orders_insert" ON client_orders;
DROP POLICY IF EXISTS "client_orders_update" ON client_orders;
DROP POLICY IF EXISTS "client_orders_delete" ON client_orders;

CREATE POLICY "client_orders_select" ON client_orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "client_orders_insert" ON client_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Клиент не может менять статус сам — только admin
CREATE POLICY "client_orders_update" ON client_orders
  FOR UPDATE USING (is_admin());

CREATE POLICY "client_orders_delete" ON client_orders
  FOR DELETE USING (is_admin());

-- ============================================================
-- 3. contacts — только admin пишет, все читают
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (true);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (is_admin());

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (is_admin());

-- ============================================================
-- 4. site_texts — только admin пишет, все читают
-- ============================================================
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_texts_select" ON site_texts;
DROP POLICY IF EXISTS "site_texts_insert" ON site_texts;
DROP POLICY IF EXISTS "site_texts_update" ON site_texts;
DROP POLICY IF EXISTS "site_texts_delete" ON site_texts;

CREATE POLICY "site_texts_select" ON site_texts
  FOR SELECT USING (true);

CREATE POLICY "site_texts_insert" ON site_texts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "site_texts_update" ON site_texts
  FOR UPDATE USING (is_admin());

CREATE POLICY "site_texts_delete" ON site_texts
  FOR DELETE USING (is_admin());

-- ============================================================
-- 5. portfolio — только admin пишет, все читают
-- ============================================================
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_select" ON portfolio;
DROP POLICY IF EXISTS "portfolio_insert" ON portfolio;
DROP POLICY IF EXISTS "portfolio_update" ON portfolio;
DROP POLICY IF EXISTS "portfolio_delete" ON portfolio;

CREATE POLICY "portfolio_select" ON portfolio
  FOR SELECT USING (true);

CREATE POLICY "portfolio_insert" ON portfolio
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "portfolio_update" ON portfolio
  FOR UPDATE USING (is_admin());

CREATE POLICY "portfolio_delete" ON portfolio
  FOR DELETE USING (is_admin());

-- ============================================================
-- 6. extra_services — только admin пишет, все читают
-- ============================================================
ALTER TABLE extra_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extra_services_select" ON extra_services;
DROP POLICY IF EXISTS "extra_services_insert" ON extra_services;
DROP POLICY IF EXISTS "extra_services_update" ON extra_services;
DROP POLICY IF EXISTS "extra_services_delete" ON extra_services;

CREATE POLICY "extra_services_select" ON extra_services
  FOR SELECT USING (true);

CREATE POLICY "extra_services_insert" ON extra_services
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "extra_services_update" ON extra_services
  FOR UPDATE USING (is_admin());

CREATE POLICY "extra_services_delete" ON extra_services
  FOR DELETE USING (is_admin());
