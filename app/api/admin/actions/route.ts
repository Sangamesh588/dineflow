import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

function generateSecureTempPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = uppercase + lowercase + numbers + symbols;

  const bytes = crypto.randomBytes(16);
  const pwd = [
    uppercase[bytes[0] % uppercase.length],
    lowercase[bytes[1] % lowercase.length],
    numbers[bytes[2] % numbers.length],
    symbols[bytes[3] % symbols.length],
  ];

  for (let i = 4; i < 14; i++) {
    pwd.push(all[bytes[i] % all.length]);
  }

  return pwd.sort(() => crypto.randomBytes(1)[0] - 128).join("");
}

function normalizeHotelName(name: string): { slug: string; emailPrefix: string } {
  const clean = name.toLowerCase().trim();
  const slug =
    clean
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "hotel";
  const emailPrefix =
    clean
      .replace(/[^a-z0-9]/g, "") || "hotel";
  return { slug, emailPrefix };
}

export async function POST(request: Request) {
  try {
    const isConfigured = isSupabaseServerConfigured();
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    // 1. Verify Super Admin Privileges
    let superAdminUserId = "admin_super";
    if (isConfigured) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return NextResponse.json({ error: "Unauthorized: Super Admin required" }, { status: 401 });
      }

      superAdminUserId = user.id;
      const configuredAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "sangameshnidode58@gmail.com").trim().toLowerCase();
      const userEmail = (user.email || "").toLowerCase();

      const adminClient = createAdminClient();
      const { data: adminRecord } = await adminClient
        .from("platform_admins")
        .select("super_admin_role")
        .eq("id", user.id)
        .maybeSingle();

      const isOwnerEmail = userEmail && userEmail === configuredAdminEmail;

      if (!adminRecord && !isOwnerEmail) {
        return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
      }
    }

    // Demo simulation fallback if not configured
    if (!isConfigured) {
      return NextResponse.json({
        success: true,
        message: `Action '${action}' executed successfully (Development Simulation Mode)`,
        simulated: true,
      });
    }

    const adminClient = createAdminClient();

    // 2. Route Actions
    switch (action) {
      case "create_restaurant": {
        const { name, ownerName, phone, contactEmail, city = "Mumbai" } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
          return NextResponse.json({ error: "Hotel / Restaurant Name is required." }, { status: 400 });
        }

        const trimmedName = name.trim();
        const { slug: baseSlug, emailPrefix } = normalizeHotelName(trimmedName);

        // 1. Ensure Unique Slug
        let finalSlug = baseSlug;
        let slugCounter = 1;
        while (true) {
          const { data: existingRest } = await adminClient
            .from("restaurants")
            .select("id")
            .eq("slug", finalSlug)
            .maybeSingle();

          if (!existingRest) break;
          slugCounter++;
          finalSlug = `${baseSlug}-${slugCounter}`;
        }

        // 2. Determine and normalize login email identifier
        let loginEmail = (contactEmail || "").trim().toLowerCase();
        let isGeneratedEmail = false;

        const { data: usersList } = await adminClient.auth.admin.listUsers();
        const existingEmails = new Set((usersList?.users || []).map((u) => u.email?.toLowerCase()));

        if (!loginEmail) {
          isGeneratedEmail = true;
          let candidate = `${emailPrefix}@gmail.com`;
          let emailNum = 1;
          while (existingEmails.has(candidate)) {
            candidate = `${emailPrefix}${emailNum}@gmail.com`;
            emailNum++;
          }
          loginEmail = candidate;
        }

        // 3. Generate Cryptographically Secure One-Time Temporary Password
        const tempPassword = generateSecureTempPassword();

        // 4. Provision Supabase Auth User
        let ownerUserId: string | null = null;
        const existingUser = usersList?.users?.find((u) => u.email?.toLowerCase() === loginEmail);

        if (existingUser) {
          ownerUserId = existingUser.id;
          await adminClient.auth.admin.updateUserById(ownerUserId, {
            password: tempPassword,
            user_metadata: {
              ...existingUser.user_metadata,
              full_name: ownerName?.trim() || trimmedName,
              phone: phone?.trim() || null,
              must_change_password: true,
              is_generated_email: isGeneratedEmail,
            },
          });
        } else {
          const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
            email: loginEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: ownerName?.trim() || trimmedName,
              phone: phone?.trim() || null,
              hotel_name: trimmedName,
              must_change_password: true,
              is_generated_email: isGeneratedEmail,
            },
          });

          if (createErr || !createdUser.user) {
            return NextResponse.json(
              { error: `Failed creating hotel owner account: ${createErr?.message || "Unknown error"}` },
              { status: 400 }
            );
          }
          ownerUserId = createdUser.user.id;
        }

        // 5. Insert Restaurant Tenant
        const { data: newRest, error: restErr } = await adminClient
          .from("restaurants")
          .insert({
            name: trimmedName,
            slug: finalSlug,
            owner_id: ownerUserId,
            city: city || "Mumbai",
            phone: phone?.trim() || null,
            email: loginEmail,
            cuisine_type: "Multi-Cuisine",
            currency: "INR",
            tax_percentage: 5.0,
            status: "active",
            is_suspended: false,
          })
          .select()
          .single();

        if (restErr || !newRest) {
          if (!existingUser && ownerUserId) {
            await adminClient.auth.admin.deleteUser(ownerUserId).catch(() => {});
          }
          return NextResponse.json(
            { error: `Failed inserting hotel tenant: ${restErr?.message}` },
            { status: 500 }
          );
        }

        // 6. Upsert Profile
        await adminClient.from("profiles").upsert(
          {
            id: ownerUserId,
            email: loginEmail,
            full_name: ownerName?.trim() || trimmedName,
            phone: phone?.trim() || null,
          },
          { onConflict: "id" }
        );

        // 7. Associate Owner with Restaurant Members
        await adminClient.from("restaurant_members").upsert(
          { restaurant_id: newRest.id, user_id: ownerUserId, role: "owner" },
          { onConflict: "restaurant_id,user_id" }
        );

        // 8. Create Default Restaurant Settings
        await adminClient.from("restaurant_settings").upsert(
          {
            restaurant_id: newRest.id,
            accepting_orders: true,
            currency: "INR",
            tax_percentage: 5.0,
            service_charge: 0.0,
          },
          { onConflict: "restaurant_id" }
        );

        // 9. Assign Starter Free Subscription Plan
        const { data: freePlan } = await adminClient
          .from("subscription_plans")
          .select("id, name")
          .eq("slug", "free")
          .maybeSingle();

        if (freePlan) {
          await adminClient.from("subscriptions").upsert(
            {
              restaurant_id: newRest.id,
              plan_id: freePlan.id,
              status: "active",
            },
            { onConflict: "restaurant_id" }
          );
        }

        // 10. Create Default Menu Categories
        const defaultCategories = ["Starters", "Main Course", "Beverages", "Desserts"];
        for (let idx = 0; idx < defaultCategories.length; idx++) {
          try {
            await adminClient
              .from("menu_categories")
              .insert({
                restaurant_id: newRest.id,
                name: defaultCategories[idx],
                sort_order: idx + 1,
                is_active: true,
              });
          } catch {
            // Non-critical if category already exists
          }
        }

        // 11. Immutable Audit Log (NEVER store plaintext password)
        await adminClient.from("audit_logs").insert({
          restaurant_id: newRest.id,
          actor_user_id: superAdminUserId,
          action: "admin_created_restaurant",
          entity_type: "restaurant",
          entity_id: newRest.id,
          metadata: {
            name: trimmedName,
            slug: finalSlug,
            loginEmail,
            isGeneratedEmail,
            plan: "Starter Free",
          },
        });

        return NextResponse.json({
          success: true,
          message: `Hotel '${trimmedName}' provisioned successfully!`,
          restaurant: {
            ...newRest,
            owner_name: ownerName?.trim() || trimmedName,
            owner_email: loginEmail,
            tables_count: 0,
            monthly_gmv: 0,
          },
          credentials: {
            hotelName: trimmedName,
            loginEmail,
            tempPassword,
            slug: newRest.slug,
            mustChangePassword: true,
            isGeneratedEmail,
          },
        });
      }

      case "send_password_link": {
        const { email, userId } = body;
        let targetEmail = email;
        if (!targetEmail && userId) {
          const { data: u } = await adminClient.auth.admin.getUserById(userId);
          targetEmail = u?.user?.email;
        }
        if (!targetEmail) {
          return NextResponse.json({ error: "Valid email or userId required." }, { status: 400 });
        }

        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail,
        });

        if (linkErr) {
          return NextResponse.json({ error: linkErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Password setup link generated for ${targetEmail}.`,
          actionUrl: linkData?.properties?.action_link,
          isGeneratedEmail: targetEmail.includes("@gmail.com") && !targetEmail.includes("+"),
        });
      }

      case "reset_owner_password": {
        const { userId, email } = body;
        let targetId = userId;
        if (!targetId && email) {
          const { data: usersList } = await adminClient.auth.admin.listUsers();
          const found = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          targetId = found?.id;
        }
        if (!targetId) {
          return NextResponse.json({ error: "Owner account not found." }, { status: 404 });
        }

        const newTempPassword = generateSecureTempPassword();

        const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetId, {
          password: newTempPassword,
          user_metadata: { must_change_password: true },
        });

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        await adminClient.from("audit_logs").insert({
          actor_user_id: superAdminUserId,
          action: "admin_reset_owner_password",
          entity_type: "auth_user",
          entity_id: targetId,
          metadata: { userId: targetId },
        });

        return NextResponse.json({
          success: true,
          message: "New temporary password generated successfully.",
          tempPassword: newTempPassword,
        });
      }

      case "toggle_restaurant_status": {
        const { restaurantId, targetStatus } = body;
        if (!restaurantId || !targetStatus) {
          return NextResponse.json({ error: "restaurantId and targetStatus are required." }, { status: 400 });
        }

        const isSuspended = targetStatus === "suspended";

        const { error: updateErr } = await adminClient
          .from("restaurants")
          .update({
            status: targetStatus,
            is_suspended: isSuspended,
          })
          .eq("id", restaurantId);

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        // Audit log
        await adminClient.from("audit_logs").insert({
          restaurant_id: restaurantId,
          actor_user_id: superAdminUserId,
          action: isSuspended ? "tenant_suspended" : "tenant_reactivated",
          entity_type: "restaurant",
          entity_id: restaurantId,
          metadata: { new_status: targetStatus },
        });

        return NextResponse.json({
          success: true,
          message: `Restaurant status updated to '${targetStatus}'.`,
        });
      }

      case "update_restaurant_plan": {
        const { restaurantId, planSlug } = body;
        const { data: plan } = await adminClient
          .from("subscription_plans")
          .select("id, name")
          .eq("slug", planSlug)
          .single();

        if (!plan) {
          return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        await adminClient.from("subscriptions").upsert(
          {
            restaurant_id: restaurantId,
            plan_id: plan.id,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          },
          { onConflict: "restaurant_id" }
        );

        return NextResponse.json({
          success: true,
          message: `Assigned '${plan.name}' to restaurant.`,
        });
      }

      case "create_coupon": {
        const { code, discount_type, discount_value, min_order_amount = 0, max_discount_amount, usage_limit = 500 } = body;
        if (!code || !discount_type || !discount_value) {
          return NextResponse.json({ error: "Coupon code, type, and value are required." }, { status: 400 });
        }

        const { data: newCoupon, error: couponErr } = await adminClient
          .from("platform_coupons")
          .insert({
            code: code.trim().toUpperCase(),
            discount_type,
            discount_value: Number(discount_value),
            min_order_amount: Number(min_order_amount),
            max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
            usage_limit: Number(usage_limit),
            used_count: 0,
            is_active: true,
            valid_until: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
          })
          .select()
          .single();

        if (couponErr) {
          return NextResponse.json({ error: couponErr.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: `Coupon '${code}' created successfully.`,
          coupon: newCoupon,
        });
      }

      case "toggle_coupon": {
        const { couponId, isActive } = body;
        await adminClient
          .from("platform_coupons")
          .update({ is_active: isActive })
          .eq("id", couponId);

        return NextResponse.json({
          success: true,
          message: `Coupon status updated.`,
        });
      }

      case "resolve_ticket": {
        const { ticketId, status = "resolved", resolution_notes = "Resolved by platform administrator." } = body;
        await adminClient
          .from("platform_support_tickets")
          .update({
            status,
            resolution_notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId);

        return NextResponse.json({
          success: true,
          message: `Support ticket marked as ${status}.`,
        });
      }

      case "update_website_settings": {
        const {
          website_name,
          tagline,
          support_email,
          support_phone,
          maintenance_mode,
          pricing_visible,
          announcement_banner_text,
          announcement_banner_active,
        } = body;

        // Check if platform_settings has a row
        const { data: existing } = await adminClient.from("platform_settings").select("id").limit(1).maybeSingle();

        if (existing) {
          await adminClient
            .from("platform_settings")
            .update({
              website_name,
              tagline,
              support_email,
              support_phone,
              maintenance_mode: Boolean(maintenance_mode),
              pricing_visible: Boolean(pricing_visible),
              announcement_banner_text,
              announcement_banner_active: Boolean(announcement_banner_active),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await adminClient.from("platform_settings").insert({
            website_name,
            tagline,
            support_email,
            support_phone,
            maintenance_mode: Boolean(maintenance_mode),
            pricing_visible: Boolean(pricing_visible),
            announcement_banner_text,
            announcement_banner_active: Boolean(announcement_banner_active),
          });
        }

        return NextResponse.json({
          success: true,
          message: "Website & platform controls updated successfully.",
        });
      }

      case "send_broadcast": {
        const { title, message } = body;
        if (!title || !message) {
          return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
        }

        // Get all restaurants
        const { data: allRests } = await adminClient.from("restaurants").select("id");
        if (allRests && allRests.length > 0) {
          const notifications = allRests.map((r) => ({
            restaurant_id: r.id,
            title,
            message,
            type: "broadcast",
            read: false,
          }));

          await adminClient.from("notifications").insert(notifications);
        }

        return NextResponse.json({
          success: true,
          message: `Broadcast message sent to ${allRests?.length || 0} restaurants.`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Super Admin action processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
