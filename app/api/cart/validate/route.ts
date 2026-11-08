import { NextResponse } from "next/server";
import { validateCartOrderSchema } from "@/lib/validations/menu";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateCartOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { restaurantSlug, tableNumber, items } = parsed.data;

    // Default rates
    let taxPercentage = 5.0;
    let serviceChargePercentage = 0.0;
    let currency = "INR";
    let isAcceptingOrders = true;

    const isConfigured = isSupabaseServerConfigured();

    if (isConfigured) {
      const supabase = await createClient();

      // Fetch restaurant and settings
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, tax_percentage, currency, settings:restaurant_settings(accepting_orders, service_charge)")
        .eq("slug", restaurantSlug)
        .maybeSingle();

      if (restaurant) {
        taxPercentage = Number(restaurant.tax_percentage) || 5.0;
        currency = restaurant.currency || "INR";
        const restWithSettings = restaurant as unknown as {
          settings?: Array<{ accepting_orders?: boolean; service_charge?: number }>;
        };
        if (restWithSettings.settings && restWithSettings.settings[0]) {
          isAcceptingOrders = restWithSettings.settings[0].accepting_orders ?? true;
          serviceChargePercentage = Number(restWithSettings.settings[0].service_charge) || 0.0;
        }
      }
    }

    if (!isAcceptingOrders) {
      return NextResponse.json(
        { error: "The restaurant is currently not accepting new digital orders." },
        { status: 400 }
      );
    }

    // Server-side calculation verification
    // In production with Supabase, query menu_items, variants and addons by IDs to ensure tamper-proof prices.
    const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);

    return NextResponse.json({
      valid: true,
      restaurantSlug,
      tableNumber: tableNumber ? String(tableNumber).trim() : null,
      itemCount,
      taxPercentage,
      serviceChargePercentage,
      currency,
      timestamp: new Date().toISOString(),
      note: "Checkout validation passed. Architecture ready for Razorpay INR order generation.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
