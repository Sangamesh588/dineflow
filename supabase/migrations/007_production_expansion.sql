-- ==============================================================================
-- DineFlow Phase 9 Migration: Production Expansion
-- Add city/timezone to restaurants, order_status_history, subscription_plans,
-- subscriptions, and qr_codes tables with complete RLS and indexes.
-- ==============================================================================

-- 1. ADD CITY AND TIMEZONE TO RESTAURANTS
ALTER TABLE public.restaurants 
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'Asia/Kolkata' NOT NULL;

-- 2. ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. SUBSCRIPTION PLANS
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

-- 4. SUBSCRIPTIONS
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

-- 5. QR CODES TABLE
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON public.subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_restaurant_id ON public.qr_codes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Order Status History: Members of the restaurant that owns the order can view history
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

-- Subscription Plans: Public readable for plan selection
CREATE POLICY "Public can view active subscription plans"
    ON public.subscription_plans FOR SELECT
    TO PUBLIC
    USING (is_active = true);

-- Subscriptions: Restaurant members can view their restaurant's subscription
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

-- QR Codes: Restaurant members can manage QR codes
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

-- Customers can resolve active table QR codes by token
CREATE POLICY "Public can read table QR by token"
    ON public.qr_codes FOR SELECT
    TO PUBLIC
    USING (true);

-- SEED DEFAULT SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (name, slug, price_inr, billing_interval, menu_items_limit, tables_limit, staff_members_limit, orders_per_month_limit, features)
VALUES 
    (
        'Starter Free', 
        'free', 
        0, 
        'monthly', 
        25, 
        5, 
        2, 
        100, 
        '["Digital QR Menu", "Mobile Ordering", "Live Kitchen Ticket View", "Basic Sales Summary"]'::jsonb
    ),
    (
        'Growth Basic', 
        'basic', 
        999, 
        'monthly', 
        75, 
        15, 
        5, 
        600, 
        '["Everything in Starter", "Table QR & NFC Printouts", "Kitchen Display System (KDS)", "Staff Role-Based Access", "Direct Razorpay Online Billing"]'::jsonb
    ),
    (
        'Professional', 
        'pro', 
        2499, 
        'monthly', 
        250, 
        50, 
        20, 
        3000, 
        '["Everything in Growth", "Unlimited Order Audio Alerts", "Advanced Revenue Analytics & Export", "Custom Branding & Domain", "Priority Realtime Sync", "24/7 Dedicated Support"]'::jsonb
    ),
    (
        'Enterprise Multi-Outlet', 
        'enterprise', 
        5999, 
        'monthly', 
        1000, 
        200, 
        100, 
        20000, 
        '["Multi-Branch Central Management", "Custom POS & Hardware Integrations", "Custom SLA & Account Manager", "Raw Event Webhook Stream", "Full Audit History"]'::jsonb
    )
ON CONFLICT (slug) DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    menu_items_limit = EXCLUDED.menu_items_limit,
    tables_limit = EXCLUDED.tables_limit,
    staff_members_limit = EXCLUDED.staff_members_limit,
    orders_per_month_limit = EXCLUDED.orders_per_month_limit,
    features = EXCLUDED.features;

-- ENABLE REALTIME FOR TABLES & STATUS
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
