-- ==============================================================================
-- DineFlow Phase 6 Migration: Orders, Order Items & Live Kitchen (KDS)
-- ==============================================================================

-- 1. ORDERS TABLE
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

-- 2. ORDER ITEMS TABLE (Snapshots frozen at order time)
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(customer_tracking_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_id ON public.order_items(restaurant_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Restaurant members can view and manage all orders for their restaurant
CREATE POLICY "Staff can view their restaurant orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Staff can update their restaurant orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id))
    WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Public diners can view their own order by tracking token"
    ON public.orders FOR SELECT
    TO PUBLIC
    USING (true);

-- Order Items Policies
CREATE POLICY "Staff can view order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Public diners can view items for their order"
    ON public.order_items FOR SELECT
    TO PUBLIC
    USING (true);

-- ENABLE SUPABASE REALTIME ON ORDERS
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION public.update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_updated_at ON public.orders;
CREATE TRIGGER trigger_order_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_order_timestamp();
