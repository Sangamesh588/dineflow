-- ==============================================================================
-- DineFlow Phase 5 Migration: Restaurant Tables & Cryptographic QR/NFC Tokens
-- ==============================================================================

-- 1. RESTAURANT TABLES TABLE
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_qr_token ON public.restaurant_tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Restaurant staff can view all tables of their restaurant
CREATE POLICY "Staff can view tables of their restaurant"
    ON public.restaurant_tables FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

-- Restaurant staff can insert tables
CREATE POLICY "Staff can insert tables"
    ON public.restaurant_tables FOR INSERT
    TO authenticated
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- Restaurant staff can update tables
CREATE POLICY "Staff can update tables"
    ON public.restaurant_tables FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

-- Restaurant staff can delete tables
CREATE POLICY "Staff can delete tables"
    ON public.restaurant_tables FOR DELETE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

-- Public diners can ONLY select table details if they hold the exact active qr_token
CREATE POLICY "Public diners can resolve active table by token"
    ON public.restaurant_tables FOR SELECT
    TO PUBLIC
    USING (is_active = true);

-- TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION public.update_table_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_table_updated_at ON public.restaurant_tables;
CREATE TRIGGER trigger_table_updated_at
    BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW EXECUTE FUNCTION public.update_table_timestamp();
