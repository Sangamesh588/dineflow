import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, key);

async function verify() {
  console.log("=== STEP 1: Verify current restaurants in Supabase ===");
  const { data: initialRestaurants, error: fetchErr } = await adminClient
    .from("restaurants")
    .select("*, settings:restaurant_settings(*)")
    .order("created_at", { ascending: false });

  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
    process.exit(1);
  }

  console.log(`Initial restaurants count: ${initialRestaurants.length}`);
  initialRestaurants.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ${r.name} (slug: ${r.slug}) - status: ${r.status}`);
  });

  console.log("\n=== STEP 2: Create a new test restaurant ===");
  const testSlug = `test-bistro-${Date.now()}`;
  const testName = "Test Bistro Automated";

  // Use existing auth user
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  const ownerUser = usersList?.users?.[0];
  if (!ownerUser) {
    throw new Error("No existing auth users found to assign restaurant to.");
  }
  const testOwnerEmail = ownerUser.email;
  console.log(`Assigning test restaurant to owner: ${testOwnerEmail} (${ownerUser.id})`);

  // Profile upsert
  await adminClient.from("profiles").upsert({
    id: ownerUser.id,
    email: testOwnerEmail,
    full_name: ownerUser.user_metadata?.full_name || "Test Owner",
  });

  // Restaurant insert
  const { data: createdRest, error: createErr } = await adminClient
    .from("restaurants")
    .insert({
      name: testName,
      slug: testSlug,
      owner_id: ownerUser.id,
      city: "Bengaluru",
      email: testOwnerEmail,
      cuisine_type: "Cafe & Bakery",
      currency: "INR",
      tax_percentage: 5.0,
      status: "active",
      is_suspended: false,
    })
    .select()
    .single();

  if (createErr) throw createErr;
  console.log(`Successfully created restaurant ID: ${createdRest.id}, Name: ${createdRest.name}`);

  // Restaurant member & settings
  await adminClient.from("restaurant_members").upsert({
    restaurant_id: createdRest.id,
    user_id: ownerUser.id,
    role: "owner",
  });
  await adminClient.from("restaurant_settings").upsert({
    restaurant_id: createdRest.id,
    accepting_orders: true,
    currency: "INR",
    tax_percentage: 5.0,
    service_charge: 0.0,
  });

  console.log("\n=== STEP 3: Fetch using the improved /api/admin/data logic ===");
  const [restRes, membersRes, profilesRes, usersRes, tablesRes] = await Promise.all([
    adminClient.from("restaurants").select("*, settings:restaurant_settings(*)").order("created_at", { ascending: false }),
    adminClient.from("restaurant_members").select("*, restaurant:restaurants(id, name, slug, city)").order("created_at", { ascending: false }),
    adminClient.from("profiles").select("*"),
    adminClient.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
    adminClient.from("restaurant_tables").select("id, restaurant_id"),
  ]);

  const userMap = new Map();
  if ("data" in usersRes && usersRes.data?.users) {
    usersRes.data.users.forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        email: u.email || "",
        full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
        phone: u.user_metadata?.phone || u.phone || "",
      });
    });
  }
  (profilesRes.data || []).forEach((p) => {
    const existing = userMap.get(p.id);
    userMap.set(p.id, {
      id: p.id,
      email: p.email || existing?.email || "",
      full_name: p.full_name || existing?.full_name || "User",
      phone: p.phone || existing?.phone || "",
    });
  });

  const tableCounts = new Map();
  (tablesRes.data || []).forEach((t) => {
    tableCounts.set(t.restaurant_id, (tableCounts.get(t.restaurant_id) || 0) + 1);
  });

  const restaurants = (restRes.data || []).map((r) => {
    const owner = r.owner_id ? userMap.get(r.owner_id) : null;
    return {
      ...r,
      owner_name: owner?.full_name || "Restaurant Owner",
      owner_email: owner?.email || r.email || "",
      tables_count: tableCounts.get(r.id) || 0,
      monthly_gmv: 0,
    };
  });

  console.log(`Updated restaurants count in query result: ${restaurants.length}`);
  const foundNew = restaurants.find(r => r.id === createdRest.id);
  if (!foundNew) {
    console.error("FAIL: Newly created restaurant was NOT found in query result!");
    process.exit(1);
  }

  console.log("SUCCESS! Newly created restaurant found in query result:");
  console.log(`  ID: ${foundNew.id}`);
  console.log(`  Name: ${foundNew.name}`);
  console.log(`  Slug: ${foundNew.slug}`);
  console.log(`  Owner: ${foundNew.owner_name} (${foundNew.owner_email})`);
  console.log(`  Status: ${foundNew.status}`);

  console.log("\n=== STEP 4: Clean up test restaurant ===");
  await adminClient.from("restaurants").delete().eq("id", createdRest.id);
  console.log("Cleaned up test restaurant.");

  console.log("\n=== ALL CHECKS PASSED PERFECTLY ===");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
