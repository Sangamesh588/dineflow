-- ==============================================================================
-- DineFlow Phase 8 Migration: Staff Invitations, RBAC, Audit Logs & Notifications
-- ==============================================================================

-- 1. UPDATE RESTAURANT MEMBERS ROLE CHECK
-- Expand role check to include all staff roles
ALTER TABLE public.restaurant_members DROP CONSTRAINT IF EXISTS restaurant_members_role_check;
ALTER TABLE public.restaurant_members ADD CONSTRAINT restaurant_members_role_check 
    CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen_staff', 'waiter', 'staff'));

-- 2. STAFF INVITATIONS TABLE
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

-- 3. AUDIT LOGS TABLE
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

-- 4. NOTIFICATIONS TABLE
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

-- 5. SUPER ADMIN PROFILES (Protected platform administrators)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    super_admin_role TEXT DEFAULT 'superadmin' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_invitations_restaurant_id ON public.staff_invitations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant_id ON public.audit_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON public.notifications(restaurant_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Staff can view invitations"
    ON public.staff_invitations FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners can manage invitations"
    ON public.staff_invitations FOR ALL
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Staff can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Staff can view notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Staff can update notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Platform admins can view platform admin list"
    ON public.platform_admins FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- ENABLE SUPABASE REALTIME ON NOTIFICATIONS
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
