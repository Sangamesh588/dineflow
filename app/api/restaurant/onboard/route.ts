import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { restaurantOnboardingSchema } from "@/lib/validations/restaurant";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Helper to authenticate the user from either cookie session or Bearer header
 */
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) return user;
  } catch {
    // Cookie auth failed or not present, try Bearer header
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    try {
      const admin = createAdminClient();
      const {
        data: { user },
      } = await admin.auth.getUser(token);
      if (user) return user;
    } catch {
      // Token invalid
    }
  }

  return null;
}

/**
 * GET: Check existing restaurant membership for the current user
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("restaurant_members")
      .select("restaurant_id, role, restaurant:restaurants(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (member?.restaurant_id) {
      return NextResponse.json({
        hasRestaurant: true,
        restaurant: member.restaurant,
        role: member.role,
      });
    }

    return NextResponse.json({ hasRestaurant: false, restaurant: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking restaurant membership";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Setup / Onboard a new restaurant safely via server admin client
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: "Supabase server is not configured. Please check environment variables." },
      { status: 503 }
    );
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Please log in again to complete setup." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request payload." }, { status: 400 });
  }

  const parseResult = restaurantOnboardingSchema.safeParse(body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Validation failed." },
      { status: 422 }
    );
  }

  const data = parseResult.data;
  const admin = createAdminClient();

  try {
    // 1. Check if user already has an active restaurant
    const { data: existingMember } = await admin
      .from("restaurant_members")
      .select("restaurant_id, restaurant:restaurants(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingMember?.restaurant_id) {
      return NextResponse.json({
        success: true,
        message: "You already have an active restaurant configured.",
        restaurant: existingMember.restaurant,
      });
    }

    // 2. Resolve Unique Slug
    let finalSlug = slugify(data.slug || data.name);
    if (!finalSlug || finalSlug.length < 2) {
      finalSlug = `restaurant-${Date.now().toString(36)}`;
    }

    const { data: existingSlug } = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingSlug) {
      // Auto-append short unique suffix to avoid blocking the user
      finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    // 3. Insert Restaurant
    const { data: restaurant, error: restaurantError } = await admin
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description?.trim() || null,
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        address: data.address.trim(),
        city: data.city?.trim() || null,
        time_zone: data.time_zone || "Asia/Kolkata",
        cuisine_type: data.cuisine_type.trim(),
        opening_time: data.opening_time || "09:00",
        closing_time: data.closing_time || "22:00",
        currency: data.currency || "INR",
        tax_percentage: Number(data.tax_percentage) || 5.0,
        logo_url: data.logo_url || null,
        cover_url: data.cover_url || null,
        status: "active",
        is_suspended: false,
      })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: `Database error creating restaurant: ${restaurantError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // 4. Upsert Profile
    try {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email: data.email.trim().toLowerCase(),
          full_name: data.name.trim(),
          phone: data.phone.trim(),
          role: "owner",
        },
        { onConflict: "id" }
      );
    } catch (profileErr) {
      console.warn("Profile upsert warning:", profileErr);
    }

    // 5. Insert Restaurant Member (Role: Owner)
    const { error: memberError } = await admin
      .from("restaurant_members")
      .upsert(
        {
          restaurant_id: restaurant.id,
          user_id: user.id,
          role: "owner",
        },
        { onConflict: "restaurant_id,user_id" }
      );

    if (memberError) {
      console.warn("Restaurant member link warning:", memberError);
    }

    // 6. Insert Restaurant Settings
    try {
      await admin.from("restaurant_settings").upsert(
        {
          restaurant_id: restaurant.id,
          accepting_orders: true,
          currency: data.currency || "INR",
          tax_percentage: Number(data.tax_percentage) || 5.0,
          service_charge: 0.0,
        },
        { onConflict: "restaurant_id" }
      );
    } catch (settingsErr) {
      console.warn("Restaurant settings warning:", settingsErr);
    }

    // 7. Attach Starter Free Subscription
    try {
      const { data: freePlan } = await admin
        .from("subscription_plans")
        .select("id")
        .eq("slug", "free")
        .maybeSingle();

      if (freePlan) {
        await admin.from("subscriptions").upsert(
          {
            restaurant_id: restaurant.id,
            plan_id: freePlan.id,
            status: "active",
          },
          { onConflict: "restaurant_id" }
        );
      }
    } catch (planErr) {
      console.warn("Subscription assignment warning:", planErr);
    }

    // 8. Seed Default Menu Categories
    const starterCategories = [
      { name: "Starters", sort_order: 1 },
      { name: "Main Course", sort_order: 2 },
      { name: "Beverages", sort_order: 3 },
      { name: "Desserts", sort_order: 4 },
    ];

    for (const cat of starterCategories) {
      try {
        await admin.from("menu_categories").insert({
          restaurant_id: restaurant.id,
          name: cat.name,
          sort_order: cat.sort_order,
          is_active: true,
        });
      } catch {
        // Ignore duplicate category errors
      }
    }

    // 9. Record Immutable Audit Log
    try {
      await admin.from("audit_logs").insert({
        restaurant_id: restaurant.id,
        actor_user_id: user.id,
        action: "restaurant_onboarded",
        entity_type: "restaurant",
        entity_id: restaurant.id,
        metadata: {
          name: restaurant.name,
          slug: restaurant.slug,
          city: restaurant.city,
        },
      });
    } catch (logErr) {
      console.warn("Audit log warning:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: "Restaurant setup completed successfully!",
      restaurant,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during setup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
