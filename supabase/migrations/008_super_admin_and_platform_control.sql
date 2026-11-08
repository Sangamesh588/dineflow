-- ==============================================================================
-- DineFlow Migration 008: Super Admin Control Center & Platform Controls
-- ==============================================================================

-- 1. RESTAURANT STATUS & SUSPENSION
ALTER TABLE public.restaurants 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false NOT NULL;

-- 2. PLATFORM SETTINGS TABLE
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

-- Seed default platform settings if empty
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

-- 3. PLATFORM COUPONS & PROMOTIONS
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

-- Seed initial coupons
INSERT INTO public.platform_coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, is_active, valid_until)
VALUES 
    ('DINEFLOW50', 'percentage', 20.00, 500.00, 200.00, 1000, 42, true, NOW() + INTERVAL '90 days'),
    ('FLAT100', 'fixed', 100.00, 600.00, 100.00, 500, 18, true, NOW() + INTERVAL '60 days'),
    ('WELCOMEFREE', 'fixed', 50.00, 200.00, 50.00, 2000, 120, true, NOW() + INTERVAL '120 days')
ON CONFLICT (code) DO NOTHING;

-- 4. PLATFORM SUPPORT TICKETS
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

-- 5. SUPER ADMIN VERIFICATION FUNCTION
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_tickets ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES

-- Platform Settings Policies
CREATE POLICY "Public can view platform settings"
    ON public.platform_settings FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Super Admins can manage platform settings"
    ON public.platform_settings FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Platform Coupons Policies
CREATE POLICY "Public can view active coupons"
    ON public.platform_coupons FOR SELECT
    TO PUBLIC
    USING (is_active = true);

CREATE POLICY "Super Admins can manage all coupons"
    ON public.platform_coupons FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Support Tickets Policies
CREATE POLICY "Super Admins can manage all support tickets"
    ON public.platform_support_tickets FOR ALL
    TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "Restaurant members can view their restaurant support tickets"
    ON public.platform_support_tickets FOR SELECT
    TO authenticated
    USING (
        restaurant_id IS NOT NULL AND public.is_restaurant_member(restaurant_id)
    );

CREATE POLICY "Restaurant members can submit support tickets"
    ON public.platform_support_tickets FOR INSERT
    TO authenticated
    WITH CHECK (
        restaurant_id IS NOT NULL AND public.is_restaurant_member(restaurant_id)
    );

-- Super Admin Global Read Policies
CREATE POLICY "Super Admins can view all restaurants"
    ON public.restaurants FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "Super Admins can update all restaurants"
    ON public.restaurants FOR UPDATE
    TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "Super Admins can view all orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "Super Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
