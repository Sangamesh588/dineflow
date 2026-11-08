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

async function inspect() {
  console.log("=== CHECKING DATABASE TABLES FOR DEMO DATA ===");
  
  const { data: restaurants } = await adminClient.from("restaurants").select("id, name, slug, email, created_at");
  console.log("Restaurants in DB:", restaurants);

  const { data: users } = await adminClient.auth.admin.listUsers();
  console.log("Auth Users in DB:", users.users.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })));

  const { data: members } = await adminClient.from("restaurant_members").select("id, restaurant_id, user_id, role");
  console.log("Restaurant members in DB:", members);

  const { data: orders } = await adminClient.from("orders").select("id, order_number, restaurant_id, grand_total");
  console.log("Orders count in DB:", orders?.length, orders);

  const { data: tables } = await adminClient.from("restaurant_tables").select("id, table_number, restaurant_id");
  console.log("Tables count in DB:", tables?.length);

  const { data: categories } = await adminClient.from("menu_categories").select("id, name, restaurant_id");
  console.log("Menu categories count in DB:", categories?.length, categories);

  const { data: items } = await adminClient.from("menu_items").select("id, name, restaurant_id");
  console.log("Menu items count in DB:", items?.length);

  const { data: coupons } = await adminClient.from("platform_coupons").select("id, code, discount_value");
  console.log("Platform coupons count in DB:", coupons?.length, coupons);

  const { data: tickets } = await adminClient.from("platform_support_tickets").select("id, subject");
  console.log("Tickets count in DB:", tickets?.length, tickets);
}

inspect().catch(console.error);
