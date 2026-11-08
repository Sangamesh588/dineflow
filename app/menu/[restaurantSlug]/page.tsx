import React from "react";
import { notFound } from "next/navigation";
import { CustomerMenuClient } from "@/components/menu/CustomerMenuClient";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveTableToken } from "@/lib/tables/token";
import { Restaurant, RestaurantSettings, MenuCategory, MenuItem } from "@/types";

// Default demo restaurant fallback
const fallbackRestaurant: Restaurant = {
  id: "demo_rest_id",
  owner_id: "demo_owner",
  name: "DineFlow Bistro & Lounge",
  slug: "demo-restaurant",
  description:
    "Artisanal coastal curries, charcoal grilled tandoori skewers, and stone-baked flatbreads.",
  logo_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80",
  cover_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
  address: "Plot 42, Bandra West, Mumbai, MH",
  phone: "+91 98765 43210",
  email: "dining@dineflow.com",
  cuisine_type: "North Indian & Mughlai",
  opening_time: "11:00 AM",
  closing_time: "11:30 PM",
  currency: "INR",
  tax_percentage: 5.0,
  created_at: new Date().toISOString(),
};

const fallbackSettings: RestaurantSettings = {
  id: "demo_set_id",
  restaurant_id: "demo_rest_id",
  accepting_orders: true,
  currency: "INR",
  tax_percentage: 5.0,
  service_charge: 0.0,
  created_at: new Date().toISOString(),
};

const fallbackCategories: MenuCategory[] = [
  {
    id: "cat_1",
    restaurant_id: "demo_rest_id",
    name: "Starters & Appetizers",
    description: "Charcoal skewers and crunchy street chaats",
    image_url: null,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cat_2",
    restaurant_id: "demo_rest_id",
    name: "Main Curries & Handis",
    description: "Slow-simmered rich curries with aromatic spices",
    image_url: null,
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cat_3",
    restaurant_id: "demo_rest_id",
    name: "Artisan Breads & Rice",
    description: "Stone-baked tandoori rotis and fragrant biryanis",
    image_url: null,
    sort_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cat_4",
    restaurant_id: "demo_rest_id",
    name: "Desserts & Drinks",
    description: "Traditional sweets and cold refreshments",
    image_url: null,
    sort_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const fallbackItems: MenuItem[] = [
  {
    id: "item_1",
    restaurant_id: "demo_rest_id",
    category_id: "cat_1",
    name: "Paneer Tikka Angara",
    description:
      "Charcoal smoked cottage cheese chunks marinated in fiery Kashmiri spices and Greek yogurt.",
    image_url:
      "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80",
    price: 340,
    is_vegetarian: true,
    is_available: true,
    preparation_time_minutes: 18,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: "v_1", restaurant_id: "demo_rest_id", menu_item_id: "item_1", name: "Regular (6 Pcs)", price_adjustment: 0, is_available: true },
      { id: "v_2", restaurant_id: "demo_rest_id", menu_item_id: "item_1", name: "Platter (10 Pcs)", price_adjustment: 160, is_available: true },
    ],
    addons: [
      { id: "a_1", restaurant_id: "demo_rest_id", menu_item_id: "item_1", name: "Extra Mint Chutney & Dip", additional_price: 35, is_available: true },
      { id: "a_2", restaurant_id: "demo_rest_id", menu_item_id: "item_1", name: "Cheese Melt Topping", additional_price: 60, is_available: true },
    ],
  },
  {
    id: "item_2",
    restaurant_id: "demo_rest_id",
    category_id: "cat_2",
    name: "Butter Chicken Delhi Style",
    description:
      "Tender boneless chicken roasted in clay oven, simmered in a velvety tomato and butter cream gravy.",
    image_url:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80",
    price: 420,
    is_vegetarian: false,
    is_available: true,
    preparation_time_minutes: 20,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: "v_3", restaurant_id: "demo_rest_id", menu_item_id: "item_2", name: "Half (2 Pcs)", price_adjustment: 0, is_available: true },
      { id: "v_4", restaurant_id: "demo_rest_id", menu_item_id: "item_2", name: "Full (4 Pcs)", price_adjustment: 220, is_available: true },
    ],
    addons: [
      { id: "a_3", restaurant_id: "demo_rest_id", menu_item_id: "item_2", name: "Extra Butter Swirl", additional_price: 40, is_available: true },
    ],
  },
  {
    id: "item_3",
    restaurant_id: "demo_rest_id",
    category_id: "cat_2",
    name: "Dal Makhani Handi",
    description:
      "Whole black lentils slow cooked overnight on charcoal embers with fresh cream and clarified butter.",
    image_url:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80",
    price: 290,
    is_vegetarian: true,
    is_available: true,
    preparation_time_minutes: 15,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [],
    addons: [],
  },
  {
    id: "item_4",
    restaurant_id: "demo_rest_id",
    category_id: "cat_3",
    name: "Truffle Butter Garlic Naan",
    description:
      "Artisan leavened flatbread brushed with garlic butter and infused with white truffle essence.",
    image_url:
      "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80",
    price: 120,
    is_vegetarian: true,
    is_available: true,
    preparation_time_minutes: 8,
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [],
    addons: [
      { id: "a_4", restaurant_id: "demo_rest_id", menu_item_id: "item_4", name: "Add Shredded Cheddar", additional_price: 45, is_available: true },
    ],
  },
  {
    id: "item_5",
    restaurant_id: "demo_rest_id",
    category_id: "cat_4",
    name: "Alfonso Mango Saffron Lassi",
    description:
      "Chilled thick yogurt beverage blended with Ratnagiri mango pulp and fragrant saffron strands.",
    image_url:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&auto=format&fit=crop&q=80",
    price: 150,
    is_vegetarian: true,
    is_available: true,
    preparation_time_minutes: 6,
    sort_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [],
    addons: [],
  },
];

export default async function CustomerMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ table_token?: string; table?: string }>;
}) {
  const { restaurantSlug } = await params;
  const { table_token, table } = await searchParams;

  // Resolve table token securely server-side (Phase 5)
  const resolvedTable = await resolveTableToken(restaurantSlug, table_token || table);

  let restaurant: Restaurant = fallbackRestaurant;
  let settings: RestaurantSettings = fallbackSettings;
  let categories: MenuCategory[] = fallbackCategories;
  let menuItems: MenuItem[] = fallbackItems;

  const isConfigured = isSupabaseServerConfigured();

  if (isConfigured && restaurantSlug !== "demo-restaurant") {
    try {
      const supabase = await createClient();

      // Fetch restaurant
      const { data: restData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", restaurantSlug)
        .maybeSingle();

      if (!restData) {
        notFound();
      }

      restaurant = restData;

      // Fetch settings
      const { data: setData } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restData.id)
        .maybeSingle();

      if (setData) {
        settings = setData;
      }

      // Fetch active categories
      const { data: catData } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restData.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catData && catData.length > 0) {
        categories = catData;
      }

      // Fetch available menu items with variants and addons
      const { data: itemData } = await supabase
        .from("menu_items")
        .select("*, variants:menu_item_variants(*), addons:menu_item_addons(*)")
        .eq("restaurant_id", restData.id)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (itemData && itemData.length > 0) {
        menuItems = itemData;
      }
    } catch (err) {
      console.warn("Could not load database records for slug:", restaurantSlug, err);
    }
  }

  return (
    <CustomerMenuClient
      restaurant={restaurant}
      settings={settings}
      categories={categories}
      menuItems={menuItems}
      resolvedTable={resolvedTable}
      tableTokenParam={table_token || table || null}
    />
  );
}
