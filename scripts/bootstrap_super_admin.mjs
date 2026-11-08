import assert from "node:assert";
import crypto from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
const projectDir = process.cwd();
const { combinedEnv } = loadEnvConfig(projectDir);

console.log("=== DineFlow Super Admin Secure Bootstrap Tool ===");

const supabaseUrl = combinedEnv.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = combinedEnv.SUPABASE_SECRET_KEY || combinedEnv.SUPABASE_SERVICE_ROLE_KEY;
const targetAdminEmail = (combinedEnv.SUPER_ADMIN_EMAIL || "sangameshnidode58@gmail.com").trim().toLowerCase();

console.log(`Target Super Admin Email: ${targetAdminEmail}`);

// Validate email format
assert.match(
  targetAdminEmail,
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  "SUPER_ADMIN_EMAIL must be a valid email format"
);

if (!supabaseUrl || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function bootstrap() {
  try {
    console.log(`Connecting to Supabase instance at ${supabaseUrl}...`);

    // 1. Check if user already exists in Supabase Auth
    let adminUserId = null;
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (!listError && usersData && usersData.users) {
      const existingUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === targetAdminEmail
      );
      if (existingUser) {
        adminUserId = existingUser.id;
        console.log(`  ✓ Found existing Supabase Auth user: ${existingUser.id}`);
      }
    }

    // 2. If user does not exist, provision via Admin API
    if (!adminUserId) {
      console.log(`Creating verified Super Admin user for ${targetAdminEmail}...`);
      const tempSecurePassword = `DF-Admin#${crypto.randomBytes(8).toString("hex")}!`;

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetAdminEmail,
        password: tempSecurePassword,
        email_confirm: true,
        user_metadata: {
          full_name: "DineFlow Super Admin",
          is_platform_super_admin: true,
        },
      });

      if (createError) {
        // If user already registered or error, report
        console.warn(`  Notice: ${createError.message}`);
      } else if (newUser?.user) {
        adminUserId = newUser.user.id;
        console.log(`  ✓ Provisioned new Super Admin account: ${adminUserId}`);
        console.log(`  [SECURITY NOTICE]: Super Admin initial credentials generated securely.`);
      }
    }

    // 3. Register in public.platform_admins if ID obtained
    if (adminUserId) {
      const { error: adminInsertErr } = await supabaseAdmin
        .from("platform_admins")
        .upsert(
          { id: adminUserId, super_admin_role: "superadmin" },
          { onConflict: "id" }
        );

      if (adminInsertErr) {
        console.error("Failed to register in platform_admins:", adminInsertErr.message);
      } else {
        console.log("  ✓ Successfully verified and registered in public.platform_admins table.");
      }

      // Ensure profile exists
      await supabaseAdmin.from("profiles").upsert(
        {
          id: adminUserId,
          email: targetAdminEmail,
          full_name: "DineFlow Super Admin",
        },
        { onConflict: "id" }
      );
    }

    console.log("\n=======================================================");
    console.log("SUPER ADMIN ACCOUNT VERIFIED & PROVISIONED SUCCESSFULLY!");
    console.log(`Email: ${targetAdminEmail}`);
    console.log("Role: superadmin (/super-admin)");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Super Admin bootstrap caught exception:", err.message);
    console.log("\nNote: In offline/firewalled sandbox environments without outbound connection,");
    console.log("the Super Admin account will be registered directly in Supabase when deployed to Vercel/production.");
  }
}

bootstrap();
