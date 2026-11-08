-- ==============================================================================
-- DineFlow Phase 3 Migration: Auth, Profiles, Restaurants, Members, Settings
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
    opening_time TEXT DEFAULT '09:00',
    closing_time TEXT DEFAULT '22:00',
    currency TEXT DEFAULT 'INR' NOT NULL,
    tax_percentage NUMERIC(5,2) DEFAULT 5.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. RESTAURANT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'chef')),
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_members_user_id ON public.restaurant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_members_restaurant_id ON public.restaurant_members(restaurant_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION FOR CHECKING RESTAURANT MEMBERSHIP
CREATE OR REPLACE FUNCTION public.is_restaurant_member(restaurant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.restaurant_members
        WHERE restaurant_id = restaurant_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROW LEVEL SECURITY POLICIES

-- Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Restaurants
CREATE POLICY "Public can view active restaurants by slug"
    ON public.restaurants FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Authenticated users can create restaurants"
    ON public.restaurants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and members can update restaurants"
    ON public.restaurants FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(id) OR auth.uid() = owner_id);

CREATE POLICY "Owners can delete their restaurant"
    ON public.restaurants FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- Restaurant Members
CREATE POLICY "Members can view members of their restaurant"
    ON public.restaurant_members FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id) OR user_id = auth.uid());

CREATE POLICY "Owners can manage restaurant members"
    ON public.restaurant_members FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE id = restaurant_members.restaurant_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Initial member insertion on onboarding"
    ON public.restaurant_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Restaurant Settings
CREATE POLICY "Public can view restaurant settings"
    ON public.restaurant_settings FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Members can update restaurant settings"
    ON public.restaurant_settings FOR ALL
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKET CREATION (if storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for restaurant assets"
    ON storage.objects FOR SELECT
    TO PUBLIC
    USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Authenticated users can upload restaurant assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'restaurant-assets');

CREATE POLICY "Users can update/delete their uploaded restaurant assets"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'restaurant-assets');
