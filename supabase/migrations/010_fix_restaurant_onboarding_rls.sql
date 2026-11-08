-- ==============================================================================
-- DineFlow Migration 010: Fix Restaurant Onboarding & Creation RLS Policies
-- ==============================================================================

-- 1. Ensure authenticated users can create restaurants where they are the owner
DROP POLICY IF EXISTS "Authenticated users can create restaurants" ON public.restaurants;
CREATE POLICY "Authenticated users can create restaurants"
    ON public.restaurants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- 2. Ensure initial owner can add themselves as restaurant member
DROP POLICY IF EXISTS "Initial member insertion on onboarding" ON public.restaurant_members;
CREATE POLICY "Initial member insertion on onboarding"
    ON public.restaurant_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE id = restaurant_members.restaurant_id AND owner_id = auth.uid()
        )
    );

-- 3. Ensure owners can insert initial restaurant settings
DROP POLICY IF EXISTS "Members can insert restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Members can insert restaurant settings"
    ON public.restaurant_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE id = restaurant_settings.restaurant_id AND owner_id = auth.uid()
        )
        OR public.is_restaurant_member(restaurant_id)
    );

-- 4. Ensure owners can view and select their own restaurant
DROP POLICY IF EXISTS "Owners can view their restaurant" ON public.restaurants;
CREATE POLICY "Owners can view their restaurant"
    ON public.restaurants FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid() OR public.is_restaurant_member(id));
