import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

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
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, key);

async function inspect() {
  const rest = await adminClient.from("restaurants").select("*");
  console.log("Restaurants error:", rest.error, "count:", rest.data?.length);
  if (rest.data) console.log("Restaurants:", rest.data.map(r => ({ id: r.id, name: r.name, slug: r.slug })));

  const orders = await adminClient.from("orders").select("id, order_number, grand_total");
  console.log("Orders count:", orders.data?.length, "error:", orders.error);

  const categories = await adminClient.from("menu_categories").select("id, name, restaurant_id");
  console.log("Categories count:", categories.data?.length, "error:", categories.error);

  const items = await adminClient.from("menu_items").select("id, name, restaurant_id");
  console.log("Menu items count:", items.data?.length, "error:", items.error);

  const users = await adminClient.auth.admin.listUsers();
  console.log("Auth users count:", users.data?.users?.length);
  if (users.data?.users) {
    console.log("Users:", users.data.users.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })));
  }
}

inspect().catch(console.error);
