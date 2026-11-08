import { NextResponse } from "next/server";
import { createClient, createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        role: "owner",
        redirectUrl: "/dashboard",
        isDemo: true,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = (user.email || "").toLowerCase();
    const mustChangePassword = user.user_metadata?.must_change_password === true;
    const configuredAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "sangameshnidode58@gmail.com")
      .trim()
      .toLowerCase();

    // 1. Check Platform Super Admin table
    const { data: superAdmin } = await supabase
      .from("platform_admins")
      .select("super_admin_role")
      .eq("id", user.id)
      .maybeSingle();

    if (superAdmin) {
      return NextResponse.json({
        role: "superadmin",
        redirectUrl: "/super-admin",
        isSuperAdmin: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || "Super Admin",
        },
      });
    }

    // 2. Check if user matches configured platform owner email (auto-provision verified admin)
    if (userEmail && userEmail === configuredAdminEmail) {
      try {
        const adminClient = createAdminClient();
        await adminClient
          .from("platform_admins")
          .upsert({ id: user.id, super_admin_role: "superadmin" }, { onConflict: "id" });

        await adminClient.from("profiles").upsert(
          {
            id: user.id,
            email: userEmail,
            full_name: user.user_metadata?.full_name || "DineFlow Super Admin",
          },
          { onConflict: "id" }
        );

        return NextResponse.json({
          role: "superadmin",
          redirectUrl: "/super-admin",
          isSuperAdmin: true,
          provisioned: true,
          user: {
            id: user.id,
            email: user.email,
            name: "DineFlow Super Admin",
          },
        });
      } catch (provisionErr) {
        console.warn("Could not auto-provision platform_admin row:", provisionErr);
      }
    }

    // 3. Query Restaurant Membership
    const { data: member, error: memberErr } = await supabase
      .from("restaurant_members")
      .select("role, restaurant_id, restaurant:restaurants(id, name, slug, status, is_suspended)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberErr) {
      console.error("Error querying restaurant membership:", memberErr);
    }

    if (member) {
      const rest = member.restaurant as unknown as {
        id?: string;
        name?: string;
        slug?: string;
        status?: string;
        is_suspended?: boolean;
      } | null;

      // 4. Check Restaurant Suspension Status
      if (rest?.is_suspended || rest?.status === "suspended") {
        return NextResponse.json(
          {
            suspended: true,
            message: `The restaurant account for "${rest?.name || "your restaurant"}" has been temporarily suspended by the platform administrator.`,
            redirectUrl: "/login?error=account_suspended",
          },
          { status: 403 }
        );
      }

      // 5. Server-verified role routing map
      const roleRedirects: Record<string, string> = {
        owner: "/dashboard",
        manager: "/dashboard",
        cashier: "/dashboard/billing",
        kitchen_staff: "/dashboard/kitchen",
        waiter: "/dashboard/tables",
        staff: "/dashboard/tables",
      };

      const defaultDestination = roleRedirects[member.role] || "/dashboard";
      const destination = mustChangePassword
        ? "/reset-password?mustChange=true"
        : defaultDestination;

      return NextResponse.json({
        role: member.role,
        redirectUrl: destination,
        mustChangePassword,
        restaurantName: rest?.name || "My Restaurant",
        restaurantSlug: rest?.slug || "dashboard",
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || "Staff Member",
        },
      });
    }

    // 6. User has no restaurant membership yet -> Route to Onboarding wizard
    return NextResponse.json({
      role: "new_owner",
      redirectUrl: "/onboarding",
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || "New Owner",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server role check error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
