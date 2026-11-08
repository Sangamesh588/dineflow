import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  try {
    const isConfigured = isSupabaseServerConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        plan: {
          name: "Starter Free",
          slug: "free",
          price_inr: 0,
          billing_interval: "monthly",
          menu_items_limit: 25,
          tables_limit: 5,
          staff_members_limit: 2,
          orders_per_month_limit: 100,
          status: "active",
        },
        usage: {
          menuItems: { used: 12, limit: 25 },
          tables: { used: 4, limit: 5 },
          staff: { used: 2, limit: 2 },
          orders: { used: 38, limit: 100 },
        },
        availablePlans: [
          {
            name: "Starter Free",
            slug: "free",
            price_inr: 0,
            features: ["Digital QR Menu", "Mobile Ordering", "Live Kitchen Ticket View", "Basic Sales Summary"],
            limits: { menuItems: 25, tables: 5, staff: 2, orders: 100 },
          },
          {
            name: "Growth Basic",
            slug: "basic",
            price_inr: 999,
            features: ["Everything in Starter", "Table QR & NFC Printouts", "Kitchen Display System (KDS)", "Staff Role-Based Access", "Direct Razorpay Online Billing"],
            limits: { menuItems: 75, tables: 15, staff: 5, orders: 600 },
          },
          {
            name: "Professional",
            slug: "pro",
            price_inr: 2499,
            features: ["Everything in Growth", "Unlimited Order Audio Alerts", "Advanced Revenue Analytics & Export", "Custom Branding & Domain", "Priority Realtime Sync", "24/7 Dedicated Support"],
            limits: { menuItems: 250, tables: 50, staff: 20, orders: 3000 },
          },
          {
            name: "Enterprise Multi-Outlet",
            slug: "enterprise",
            price_inr: 5999,
            features: ["Multi-Branch Central Management", "Custom POS & Hardware Integrations", "Custom SLA & Account Manager", "Raw Event Webhook Stream", "Full Audit History"],
            limits: { menuItems: 1000, tables: 200, staff: 100, orders: 20000 },
          },
        ],
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member } = await supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
    }

    const restaurantId = member.restaurant_id;

    // 1. Fetch current subscription and plan
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    // 2. Fetch all available plans
    const { data: allPlans } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_inr", { ascending: true });

    // 3. Count live resources
    const [menuRes, tablesRes, staffRes, ordersRes] = await Promise.all([
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      supabase.from("restaurant_members").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    ]);

    const activePlan = (subData?.plan as unknown as {
      name: string;
      slug: string;
      price_inr: number;
      billing_interval: string;
      menu_items_limit: number;
      tables_limit: number;
      staff_members_limit: number;
      orders_per_month_limit: number;
    }) || {
      name: "Starter Free",
      slug: "free",
      price_inr: 0,
      billing_interval: "monthly",
      menu_items_limit: 25,
      tables_limit: 5,
      staff_members_limit: 2,
      orders_per_month_limit: 100,
    };

    return NextResponse.json({
      plan: {
        ...activePlan,
        status: subData?.status || "active",
        current_period_end: subData?.current_period_end || null,
      },
      usage: {
        menuItems: { used: menuRes.count || 0, limit: activePlan.menu_items_limit },
        tables: { used: tablesRes.count || 0, limit: activePlan.tables_limit },
        staff: { used: staffRes.count || 0, limit: activePlan.staff_members_limit },
        orders: { used: ordersRes.count || 0, limit: activePlan.orders_per_month_limit },
      },
      availablePlans: allPlans || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load subscription info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { targetPlanSlug } = await request.json();

    if (!targetPlanSlug) {
      return NextResponse.json({ error: "targetPlanSlug is required" }, { status: 400 });
    }

    const isConfigured = isSupabaseServerConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        success: true,
        message: `Plan updated to ${targetPlanSlug} (Development Simulation)`,
        simulated: true,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!member || (member.role !== "owner" && member.role !== "manager")) {
      return NextResponse.json({ error: "Only owners or managers can modify subscriptions." }, { status: 403 });
    }

    const restaurantId = member.restaurant_id;

    // Fetch the target plan
    const { data: plan, error: planErr } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", targetPlanSlug)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: "Selected plan does not exist" }, { status: 404 });
    }

    // If free plan, update directly
    if (plan.price_inr === 0) {
      await supabase.from("subscriptions").upsert(
        {
          restaurant_id: restaurantId,
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id" }
      );

      // Audit log
      await supabase.from("audit_logs").insert({
        restaurant_id: restaurantId,
        actor_user_id: user.id,
        action: "subscription_changed",
        entity_type: "subscription",
        metadata: { new_plan: plan.slug, price: 0 },
      });

      return NextResponse.json({ success: true, message: "Subscribed to Starter Free plan." });
    }

    // For paid plans, check Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes("placeholder") || keyId.startsWith("<")) {
      // In development or when keys not supplied, transition plan directly with audit
      await supabase.from("subscriptions").upsert(
        {
          restaurant_id: restaurantId,
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id" }
      );

      return NextResponse.json({
        success: true,
        message: `Upgraded to ${plan.name} (Direct Activation)`,
      });
    }

    // Initialize Razorpay order for subscription payment
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amountPaise = Math.round(plan.price_inr * 100);

    const rzpOrder = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `sub_${restaurantId.substring(0, 8)}_${Date.now()}`,
      notes: {
        restaurant_id: restaurantId,
        plan_slug: plan.slug,
        type: "saas_subscription",
      },
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amountPaise,
      keyId,
      currency: "INR",
      planName: plan.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process subscription upgrade";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
