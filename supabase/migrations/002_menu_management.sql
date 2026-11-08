-- ==============================================================================
-- DineFlow Phase 4 Migration: Menu Categories, Menu Items, Variants & Add-ons
-- ==============================================================================

-- 1. MENU CATEGORIES TABLE
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

-- 2. MENU ITEMS TABLE
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

-- 3. MENU ITEM VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.menu_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL
);

-- 4. MENU ITEM ADDONS TABLE
CREATE TABLE IF NOT EXISTS public.menu_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    additional_price NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (additional_price >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_menu_item_id ON public.menu_item_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_menu_item_id ON public.menu_item_addons(menu_item_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR MENU CATEGORIES
CREATE POLICY "Public can view active menu categories"
    ON public.menu_categories FOR SELECT
    TO PUBLIC
    USING (is_active = true);

CREATE POLICY "Restaurant members can view all categories"
    ON public.menu_categories FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can insert categories"
    ON public.menu_categories FOR INSERT
    TO authenticated
    WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can update categories"
    ON public.menu_categories FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can delete categories"
    ON public.menu_categories FOR DELETE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

-- POLICIES FOR MENU ITEMS
CREATE POLICY "Public can view available menu items"
    ON public.menu_items FOR SELECT
    TO PUBLIC
    USING (is_available = true);

CREATE POLICY "Restaurant members can view all items"
    ON public.menu_items FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can insert items"
    ON public.menu_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can update items"
    ON public.menu_items FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can delete items"
    ON public.menu_items FOR DELETE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

-- POLICIES FOR MENU ITEM VARIANTS
CREATE POLICY "Public can view available variants"
    ON public.menu_item_variants FOR SELECT
    TO PUBLIC
    USING (is_available = true);

CREATE POLICY "Restaurant members can view all variants"
    ON public.menu_item_variants FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can manage variants"
    ON public.menu_item_variants FOR ALL
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- POLICIES FOR MENU ITEM ADDONS
CREATE POLICY "Public can view available addons"
    ON public.menu_item_addons FOR SELECT
    TO PUBLIC
    USING (is_available = true);

CREATE POLICY "Restaurant members can view all addons"
    ON public.menu_item_addons FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Restaurant members can manage addons"
    ON public.menu_item_addons FOR ALL
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- TRIGGER TO UPDATE updated_at ON MENU ITEMS
CREATE OR REPLACE FUNCTION public.update_menu_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_menu_item_updated_at ON public.menu_items;
CREATE TRIGGER trigger_menu_item_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_menu_item_timestamp();
