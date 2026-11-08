-- ==============================================================================
-- DineFlow Phase 7 Migration: Razorpay Payments, Split Billing & Events
-- ==============================================================================

-- 1. PAYMENT RECORDS TABLE
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

-- 2. PAYMENT EVENTS TABLE (Webhook Idempotency)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_payment_records_restaurant_id ON public.payment_records(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON public.payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_razorpay_order_id ON public.payment_records(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON public.payment_events(event_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Staff can view payment records"
    ON public.payment_records FOR SELECT
    TO authenticated
    USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Public can view payment for their order"
    ON public.payment_records FOR SELECT
    TO PUBLIC
    USING (true);

-- TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION public.update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_updated_at ON public.payment_records;
CREATE TRIGGER trigger_payment_updated_at
    BEFORE UPDATE ON public.payment_records
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_timestamp();
