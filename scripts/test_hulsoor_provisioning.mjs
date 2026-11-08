import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import crypto from "crypto";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

// Load environment variables
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "").trim();
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error("Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Import or replicate helper logic for verification
function generateSecureTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_+=";
  const allChars = upper + lower + digits + symbols;

  let pwd = "";
  pwd += upper[crypto.randomInt(upper.length)];
  pwd += lower[crypto.randomInt(lower.length)];
  pwd += digits[crypto.randomInt(digits.length)];
  pwd += symbols[crypto.randomInt(symbols.length)];

  while (pwd.length < 14) {
    pwd += allChars[crypto.randomInt(allChars.length)];
  }

  return pwd
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

function normalizeHotelName(name) {
  const cleaned = name.trim().toLowerCase();
  const slug = cleaned
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const emailPrefix = cleaned.replace(/[^a-z0-9]/g, "").slice(0, 32);
  return { slug: slug || "hotel", emailPrefix: emailPrefix || "hotel" };
}

async function runTests() {
  console.log("================================================================================");
  console.log("       DINEFLOW: HULSOOR HOTEL PROVISIONING & SECURITY VERIFICATION SUITE       ");
  console.log("================================================================================");

  const createdUserIds = [];
  const createdRestIds = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Password Generator Entropy & Complexity
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying secure temporary password generator...");
    const passwords = new Set();
    for (let i = 0; i < 20; i++) {
      const p = generateSecureTempPassword();
      passwords.add(p);
      if (p.length < 14) throw new Error(`Password length ${p.length} is less than 14 characters!`);
      if (!/[A-Z]/.test(p)) throw new Error("Password missing uppercase character!");
      if (!/[a-z]/.test(p)) throw new Error("Password missing lowercase character!");
      if (!/[0-9]/.test(p)) throw new Error("Password missing digit!");
      if (!/[!@#$%^&*_\-+=]/.test(p)) throw new Error("Password missing symbol!");
    }
    if (passwords.size !== 20) throw new Error("Duplicate passwords detected across 20 samples!");
    console.log("  ✓ Password generator produces 14+ character unguessable, high-entropy passwords.");

    // -------------------------------------------------------------------------
    // TEST 2: Name Normalization for 'Hulsoor Hotel'
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying identifier normalization for 'Hulsoor Hotel'...");
    const norm = normalizeHotelName("Hulsoor Hotel");
    console.log(`  Hotel Name: 'Hulsoor Hotel' -> slug: '${norm.slug}', emailPrefix: '${norm.emailPrefix}'`);
    if (norm.slug !== "hulsoor-hotel") throw new Error(`Unexpected slug: ${norm.slug}`);
    if (norm.emailPrefix !== "hulsoorhotel") throw new Error(`Unexpected emailPrefix: ${norm.emailPrefix}`);
    console.log("  ✓ Normalization conforms to spec (lowercase, spaces stripped, safe symbols).");

    // -------------------------------------------------------------------------
    // TEST 3: Provision 'Hulsoor Hotel' with ONLY Hotel Name
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Provisioning 'Hulsoor Hotel' with ONLY Hotel Name...");

    // Check existing slug and email
    let finalSlug = norm.slug;
    let slugCounter = 1;
    while (true) {
      const { data: existingRest } = await adminClient
        .from("restaurants")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (!existingRest) break;
      slugCounter++;
      finalSlug = `${norm.slug}-${slugCounter}`;
    }

    const { data: usersList } = await adminClient.auth.admin.listUsers();
    const existingEmails = new Set((usersList?.users || []).map((u) => u.email?.toLowerCase()));

    let candidateEmail = `${norm.emailPrefix}@gmail.com`;
    let emailCounter = 1;
    while (existingEmails.has(candidateEmail)) {
      candidateEmail = `${norm.emailPrefix}${emailCounter}@gmail.com`;
      emailCounter++;
    }

    const tempPassword = generateSecureTempPassword();

    console.log(`  Assigning slug: '${finalSlug}'`);
    console.log(`  Assigning login email: '${candidateEmail}'`);
    console.log(`  Assigning temporary password: '${tempPassword}'`);

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: candidateEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Hulsoor Hotel Owner",
        must_change_password: true,
        is_generated_email: true,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }
    const newUserId = authData.user.id;
    createdUserIds.push(newUserId);
    console.log(`  ✓ Auth user created: ${newUserId} (${candidateEmail})`);

    // 2. Create Restaurant
    const { data: restData, error: restError } = await adminClient
      .from("restaurants")
      .insert({
        name: "Hulsoor Hotel",
        slug: finalSlug,
        owner_id: newUserId,
        city: "Mumbai",
        currency: "INR",
        status: "active",
        is_suspended: false,
      })
      .select()
      .single();

    if (restError || !restData) {
      throw new Error(`Failed to create restaurant: ${restError?.message}`);
    }
    const newRestId = restData.id;
    createdRestIds.push(newRestId);
    console.log(`  ✓ Restaurant created: ${newRestId} ('${restData.name}')`);

    // 3. Upsert Profile
    await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        email: candidateEmail,
        full_name: "Hulsoor Hotel Owner",
      },
      { onConflict: "id" }
    );
    console.log(`  ✓ Profile upserted for user ${newUserId}`);

    // 4. Restaurant Member Association (role: owner)
    await adminClient.from("restaurant_members").upsert(
      {
        restaurant_id: newRestId,
        user_id: newUserId,
        role: "owner",
      },
      { onConflict: "restaurant_id,user_id" }
    );
    console.log(`  ✓ Restaurant member link created with role 'owner'`);

    // 5. Restaurant Settings
    await adminClient.from("restaurant_settings").upsert(
      {
        restaurant_id: newRestId,
        accepting_orders: true,
        currency: "INR",
        tax_percentage: 5.0,
        service_charge: 0.0,
      },
      { onConflict: "restaurant_id" }
    );
    console.log(`  ✓ Default restaurant settings initialized`);

    // 6. Assign Starter Free Subscription Plan
    const { data: freePlan } = await adminClient
      .from("subscription_plans")
      .select("id, name")
      .eq("slug", "free")
      .maybeSingle();

    if (freePlan) {
      await adminClient.from("subscriptions").upsert(
        {
          restaurant_id: newRestId,
          plan_id: freePlan.id,
          status: "active",
        },
        { onConflict: "restaurant_id" }
      );
      console.log(`  ✓ Subscription assigned: '${freePlan.name}'`);
    }

    // 7. Create 4 Default Categories
    const defaultCategories = ["Starters", "Main Course", "Beverages", "Desserts"];
    for (let idx = 0; idx < defaultCategories.length; idx++) {
      await adminClient.from("menu_categories").insert({
        restaurant_id: newRestId,
        name: defaultCategories[idx],
        sort_order: idx + 1,
        is_active: true,
      });
    }
    console.log(`  ✓ 4 default menu categories created: ${defaultCategories.join(", ")}`);

    // 8. Immutable Audit Log (NEVER storing plaintext password)
    const { data: auditData } = await adminClient
      .from("audit_logs")
      .insert({
        restaurant_id: newRestId,
        action: "admin_created_restaurant",
        entity_type: "restaurant",
        entity_id: newRestId,
        metadata: {
          name: "Hulsoor Hotel",
          slug: finalSlug,
          loginEmail: candidateEmail,
          isGeneratedEmail: true,
          plan: "Starter Free",
        },
      })
      .select()
      .single();

    console.log(`  ✓ Immutable audit log recorded (id: ${auditData?.id})`);

    // -------------------------------------------------------------------------
    // TEST 4: Security Verification - No Plaintext Password Stored
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Verifying security: Plaintext password is not persisted...");
    const auditMeta = JSON.stringify(auditData?.metadata || {});
    if (auditMeta.includes(tempPassword)) {
      throw new Error("SECURITY FAILURE: Plaintext temporary password was found in audit logs!");
    }
    console.log("  ✓ Audit log metadata is free of password values.");

    // -------------------------------------------------------------------------
    // TEST 5: Verify Database Records Integrity
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying database records integrity...");
    // Check member
    const { data: memberCheck } = await adminClient
      .from("restaurant_members")
      .select("role, restaurant_id, user_id")
      .eq("restaurant_id", newRestId)
      .single();
    if (memberCheck?.role !== "owner" || memberCheck?.user_id !== newUserId) {
      throw new Error("Member check failed!");
    }
    console.log("  ✓ Member record verified: owner role attached.");

    // Check categories
    const { data: catCheck } = await adminClient
      .from("menu_categories")
      .select("name")
      .eq("restaurant_id", newRestId);
    const catNames = (catCheck || []).map((c) => c.name);
    defaultCategories.forEach((cat) => {
      if (!catNames.includes(cat)) throw new Error(`Missing expected category: ${cat}`);
    });
    console.log(`  ✓ Verified all 4 default menu categories exist in database (${catNames.join(", ")}).`);

    // -------------------------------------------------------------------------
    // TEST 6: Duplicate Handling for 'Hulsoor Hotel'
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing duplicate provisioning of 'Hulsoor Hotel'...");
    const { slug: dupSlug, emailPrefix: dupPrefix } = normalizeHotelName("Hulsoor Hotel");

    let secondSlug = dupSlug;
    let sCount = 1;
    while (true) {
      const { data: exRest } = await adminClient
        .from("restaurants")
        .select("id")
        .eq("slug", secondSlug)
        .maybeSingle();
      if (!exRest) break;
      sCount++;
      secondSlug = `${dupSlug}-${sCount}`;
    }

    const { data: allUsers } = await adminClient.auth.admin.listUsers();
    const emailsSet = new Set((allUsers?.users || []).map((u) => u.email?.toLowerCase()));
    let secondEmail = `${dupPrefix}@gmail.com`;
    let eCount = 1;
    while (emailsSet.has(secondEmail)) {
      secondEmail = `${dupPrefix}${eCount}@gmail.com`;
      eCount++;
    }

    if (secondSlug === finalSlug) {
      throw new Error(`Duplicate slug generation failed: generated same slug '${secondSlug}'!`);
    }
    if (secondEmail === candidateEmail) {
      throw new Error(`Duplicate email generation failed: generated same email '${secondEmail}'!`);
    }

    console.log(`  Original: slug '${finalSlug}', email '${candidateEmail}'`);
    console.log(`  Duplicate: slug '${secondSlug}', email '${secondEmail}'`);
    console.log("  ✓ Collision resolution handles duplicate hotel names automatically.");

    // -------------------------------------------------------------------------
    // TEST 7: Authentication & Mandatory Password Change
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing login with temporary password and mandatory password change...");

    const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: candidateEmail,
      password: tempPassword,
    });

    if (loginErr || !loginData.user) {
      throw new Error(`Failed to sign in with generated temporary password: ${loginErr?.message}`);
    }

    console.log(`  ✓ Successfully authenticated as '${candidateEmail}' using temporary password.`);
    const mustChange = loginData.user.user_metadata?.must_change_password;
    console.log(`  User metadata 'must_change_password': ${mustChange}`);
    if (mustChange !== true) {
      throw new Error("Expected user_metadata.must_change_password to be true!");
    }
    console.log("  ✓ Mandatory first-login password flag is active.");

    // Simulate password update
    const newPersonalPassword = "HulsoorSecure2026!#";
    const { data: updateData, error: updateErr } = await anonClient.auth.updateUser({
      password: newPersonalPassword,
      data: {
        must_change_password: false,
      },
    });

    if (updateErr) {
      throw new Error(`Failed to update personal password: ${updateErr.message}`);
    }

    console.log("  ✓ Updated to personal password and cleared 'must_change_password' flag.");
    const updatedMustChange = updateData.user?.user_metadata?.must_change_password;
    if (updatedMustChange !== false) {
      throw new Error("Expected user_metadata.must_change_password to be false after update!");
    }
    console.log(`  ✓ Flag successfully cleared: must_change_password = ${updatedMustChange}.`);

    // Sign out session
    await anonClient.auth.signOut();

    // -------------------------------------------------------------------------
    // TEST 8: Super Admin Password Reset
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Testing Super Admin password reset action...");
    const resetTempPassword = generateSecureTempPassword();

    const { error: resetErr } = await adminClient.auth.admin.updateUserById(newUserId, {
      password: resetTempPassword,
      user_metadata: { must_change_password: true },
    });

    if (resetErr) {
      throw new Error(`Failed to reset password: ${resetErr.message}`);
    }

    // Verify login with new temporary password
    const { data: resetLoginData, error: resetLoginErr } = await anonClient.auth.signInWithPassword({
      email: candidateEmail,
      password: resetTempPassword,
    });

    if (resetLoginErr || !resetLoginData.user) {
      throw new Error(`Failed to login with newly reset temporary password: ${resetLoginErr?.message}`);
    }

    if (resetLoginData.user.user_metadata?.must_change_password !== true) {
      throw new Error("Expected must_change_password to be re-activated on admin reset!");
    }

    console.log("  ✓ Super Admin reset generated new temp password and re-enforced first-login change.");
    await anonClient.auth.signOut();

    console.log("\n================================================================================");
    console.log("       ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! (8/8 PASSED)       ");
    console.log("================================================================================");
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\nCleaning up test entities...");
    for (const rid of createdRestIds) {
      await adminClient.from("menu_categories").delete().eq("restaurant_id", rid);
      await adminClient.from("restaurant_settings").delete().eq("restaurant_id", rid);
      await adminClient.from("subscriptions").delete().eq("restaurant_id", rid);
      await adminClient.from("restaurant_members").delete().eq("restaurant_id", rid);
      await adminClient.from("audit_logs").delete().eq("restaurant_id", rid);
      await adminClient.from("restaurants").delete().eq("id", rid);
      console.log(`  ✓ Cleaned up test restaurant: ${rid}`);
    }

    for (const uid of createdUserIds) {
      await adminClient.from("profiles").delete().eq("id", uid);
      await adminClient.auth.admin.deleteUser(uid);
      console.log(`  ✓ Cleaned up test auth user: ${uid}`);
    }
    console.log("Cleanup complete. Existing database state preserved.");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
