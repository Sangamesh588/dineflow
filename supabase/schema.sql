-- ==============================================================================
-- DineFlow Complete Database Schema (Phases 1-8)
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    cuisine_type TEXT,
    city TEXT,
    time_zone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
    opening_time TEXT DEFAULT '09:00',
    closing_time TEXT DEFAULT '22:00',
    currency TEXT DEFAULT 'INR' NOT NULL,
    tax_percentage NUMERIC(5,2) DEFAULT 5.00 NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    is_suspended BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. RESTAURANT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen_staff', 'waiter', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(restaurant_id, user_id)
);

-- 4. RESTAURANT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
    accepting_orders BOOLEAN DEFAULT true NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    tax_percentage NUMERIC(5,2) DEFAULT 5.00 NOT NULL,
    service_charge NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. MENU CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_vegetarian BOOLEAN DEFAULT false NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    preparation_time_minutes INTEGER DEFAULT 15 NOT NULL CHECK (preparation_time_minutes >= 0),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. MENU ITEM VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.menu_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL
);

-- 8. MENU ITEM ADDONS TABLE
CREATE TABLE IF NOT EXISTS public.menu_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    additional_price NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (additional_price >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL
);

-- 9. RESTAURANT TABLES TABLE (Phase 5)
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    display_name TEXT,
    capacity INTEGER DEFAULT 4 NOT NULL CHECK (capacity > 0),
    status TEXT DEFAULT 'available' NOT NULL CHECK (status IN ('available', 'occupied', 'reserved', 'inactive')),
    qr_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(restaurant_id, table_number)
);

-- 10. ORDERS TABLE (Phase 6)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    order_type TEXT DEFAULT 'dine_in' NOT NULL CHECK (order_type IN ('dine_in', 'takeaway')),
    order_status TEXT DEFAULT 'pending' NOT NULL CHECK (order_status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' NOT NULL CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(10,2) NOT NULL CHECK (tax_amount >= 0),
    service_charge NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (service_charge >= 0),
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    customer_name TEXT,
    customer_phone TEXT,
    special_instructions TEXT,
    idempotency_key TEXT UNIQUE,
    customer_tracking_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. ORDER ITEMS TABLE (Phase 6)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name_snapshot TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    variant_snapshot JSONB,
    addons_snapshot JSONB,
    special_instructions TEXT,
    item_total NUMERIC(10,2) NOT NULL CHECK (item_total >= 0)
);

-- 12. PAYMENT RECORDS TABLE (Phase 7)
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency TEXT DEFAULT 'INR' NOT NULL,
    payment_status TEXT DEFAULT 'pending' NOT NULL CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded')),
    payment_method TEXT,
    signature_verified BOOLEAN DEFAULT false NOT NULL,
    split_type TEXT DEFAULT 'full' CHECK (split_type IN ('full', 'equal', 'custom')),
    payer_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. PAYMENT EVENTS TABLE (Phase 7)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. STAFF INVITATIONS TABLE (Phase 8)
CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen_staff', 'waiter', 'staff')),
    token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. AUDIT LOGS TABLE (Phase 8)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 16. NOTIFICATIONS TABLE (Phase 8)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'order' NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 17. PLATFORM ADMINS TABLE (Phase 8)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    super_admin_role TEXT DEFAULT 'superadmin' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 18. ORDER STATUS HISTORY TABLE (Phase 9)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 19. SUBSCRIPTION PLANS TABLE (Phase 9)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
    menu_items_limit INTEGER NOT NULL DEFAULT 50,
    tables_limit INTEGER NOT NULL DEFAULT 10,
    staff_members_limit INTEGER NOT NULL DEFAULT 5,
    orders_per_month_limit INTEGER NOT NULL DEFAULT 500,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 20. SUBSCRIPTIONS TABLE (Phase 9)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    current_period_end TIMESTAMPTZ,
    razorpay_subscription_id TEXT,
    razorpay_customer_id TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_restaurant_subscription UNIQUE (restaurant_id)
);

-- 21. QR CODES TABLE (Phase 9)
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    qr_data_url TEXT,
    scan_count INTEGER DEFAULT 0 NOT NULL,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_table_qr UNIQUE (table_id)
);

-- INDEXES FOR PHASE 9 TABLES
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON public.subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_restaurant_id ON public.qr_codes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);

-- HELPER FUNCTIONS & RLS
CREATE OR REPLACE FUNCTION public.is_restaurant_member(restaurant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.restaurant_members
        WHERE restaurant_id = restaurant_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR NEW TABLES
CREATE POLICY "Restaurant members can view order status history"
    ON public.order_status_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.restaurant_members m ON o.restaurant_id = m.restaurant_id
            WHERE o.id = order_status_history.order_id
            AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant members can insert order status history"
    ON public.order_status_history FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.restaurant_members m ON o.restaurant_id = m.restaurant_id
            WHERE o.id = order_status_history.order_id
            AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can view active subscription plans"
    ON public.subscription_plans FOR SELECT
    TO PUBLIC
    USING (is_active = true);

CREATE POLICY "Restaurant members can view their subscription"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurant_members m
            WHERE m.restaurant_id = subscriptions.restaurant_id
            AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant members can manage table QR codes"
    ON public.qr_codes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurant_members m
            WHERE m.restaurant_id = qr_codes.restaurant_id
            AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can read table QR by token"
    ON public.qr_codes FOR SELECT
    TO PUBLIC
    USING (true);

-- SEED DEFAULT SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (name, slug, price_inr, billing_interval, menu_items_limit, tables_limit, staff_members_limit, orders_per_month_limit, features)
VALUES 
    ('Starter Free', 'free', 0, 'monthly', 25, 5, 2, 100, '["Digital QR Menu", "Mobile Ordering", "Live Kitchen Ticket View", "Basic Sales Summary"]'::jsonb),
    ('Growth Basic', 'basic', 999, 'monthly', 75, 15, 5, 600, '["Everything in Starter", "Table QR & NFC Printouts", "Kitchen Display System (KDS)", "Staff Role-Based Access", "Direct Razorpay Online Billing"]'::jsonb),
    ('Professional', 'pro', 2499, 'monthly', 250, 50, 20, 3000, '["Everything in Growth", "Unlimited Order Audio Alerts", "Advanced Revenue Analytics & Export", "Custom Branding & Domain", "Priority Realtime Sync", "24/7 Dedicated Support"]'::jsonb),
    ('Enterprise Multi-Outlet', 'enterprise', 5999, 'monthly', 1000, 200, 100, 20000, '["Multi-Branch Central Management", "Custom POS & Hardware Integrations", "Custom SLA & Account Manager", "Raw Event Webhook Stream", "Full Audit History"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    menu_items_limit = EXCLUDED.menu_items_limit,
    tables_limit = EXCLUDED.tables_limit,
    staff_members_limit = EXCLUDED.staff_members_limit,
    orders_per_month_limit = EXCLUDED.orders_per_month_limit,
    features = EXCLUDED.features;

-- ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for restaurant assets" ON storage.objects FOR SELECT TO PUBLIC USING (bucket_id = 'restaurant-assets');
CREATE POLICY "Authenticated users can upload restaurant assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant-assets');
CREATE POLICY "Users can update/delete their uploaded restaurant assets" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'restaurant-assets');

-- ==============================================================================
-- 22. PLATFORM SETTINGS (Phase 10: Super Admin Control Center)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_name TEXT DEFAULT 'DineFlow' NOT NULL,
    tagline TEXT DEFAULT 'Next-Gen Restaurant QR Ordering & Management SaaS' NOT NULL,
    support_email TEXT DEFAULT 'support@dineflow.com' NOT NULL,
    support_phone TEXT DEFAULT '+91 98765 43210' NOT NULL,
    maintenance_mode BOOLEAN DEFAULT false NOT NULL,
    pricing_visible BOOLEAN DEFAULT true NOT NULL,
    announcement_banner_text TEXT DEFAULT 'Welcome to DineFlow - Launch your digital restaurant menu in 5 minutes!',
    announcement_banner_active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed platform settings
INSERT INTO public.platform_settings (
    website_name, tagline, support_email, support_phone, maintenance_mode, pricing_visible, announcement_banner_text, announcement_banner_active
)
SELECT 
    'DineFlow', 
    'Next-Gen Restaurant QR Ordering & Management SaaS', 
    'support@dineflow.com', 
    '+91 98765 43210', 
    false, 
    true, 
    'Welcome to DineFlow - Elevate your restaurant dining experience with instant QR ordering!', 
    false
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 23. PLATFORM COUPONS & PROMOTIONS
CREATE TABLE IF NOT EXISTS public.platform_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
    max_discount_amount NUMERIC(10,2),
    usage_limit INTEGER DEFAULT 500 NOT NULL,
    used_count INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.platform_coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, is_active, valid_until)
VALUES 
    ('DINEFLOW50', 'percentage', 20.00, 500.00, 200.00, 1000, 42, true, NOW() + INTERVAL '90 days'),
    ('FLAT100', 'fixed', 100.00, 600.00, 100.00, 500, 18, true, NOW() + INTERVAL '60 days'),
    ('WELCOMEFREE', 'fixed', 50.00, 200.00, 50.00, 2000, 120, true, NOW() + INTERVAL '120 days')
ON CONFLICT (code) DO NOTHING;

-- 24. PLATFORM SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.platform_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SUPER ADMIN HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS ON NEW TABLES
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view platform settings" ON public.platform_settings FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Super Admins can manage platform settings" ON public.platform_settings FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Public can view active coupons" ON public.platform_coupons FOR SELECT TO PUBLIC USING (is_active = true);
CREATE POLICY "Super Admins can manage all coupons" ON public.platform_coupons FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Super Admins can manage all support tickets" ON public.platform_support_tickets FOR ALL TO authenticated USING (public.is_super_admin());
CREATE POLICY "Restaurant members can view their restaurant support tickets" ON public.platform_support_tickets FOR SELECT TO authenticated USING (restaurant_id IS NOT NULL AND public.is_restaurant_member(restaurant_id));
CREATE POLICY "Restaurant members can submit support tickets" ON public.platform_support_tickets FOR INSERT TO authenticated WITH CHECK (restaurant_id IS NOT NULL AND public.is_restaurant_member(restaurant_id));

CREATE POLICY "Super Admins can view all restaurants" ON public.restaurants FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admins can update all restaurants" ON public.restaurants FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Users can view own platform_admins entry" ON public.platform_admins FOR SELECT TO authenticated USING (id = auth.uid());
