import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export interface ResolvedTableInfo {
  isValid: boolean;
  tableId?: string;
  tableNumber?: string;
  displayName?: string | null;
  capacity?: number;
  status?: string;
  error?: string;
}

export async function resolveTableToken(
  restaurantSlug: string,
  tableToken?: string | null
): Promise<ResolvedTableInfo> {
  if (!tableToken || tableToken.trim() === "") {
    return {
      isValid: false,
      error: "No table token provided. Browsing in view-only mode.",
    };
  }

  const isConfigured = isSupabaseServerConfigured();

  // Demo fallback for testing with demo restaurant
  if (!isConfigured || restaurantSlug === "demo-restaurant") {
    // If demo token matches our demo tokens or test format
    if (tableToken.startsWith("demo_token_") || tableToken === "demo-token" || tableToken.length >= 10) {
      const tableNum = tableToken.includes("t2") ? "T-02" : tableToken.includes("t4") ? "T-04" : "T-01";
      return {
        isValid: true,
        tableId: `tbl_demo_${tableNum.toLowerCase()}`,
        tableNumber: tableNum,
        displayName: `Main Floor ${tableNum}`,
        capacity: 4,
        status: "available",
      };
    }
    return {
      isValid: false,
      error: "Invalid or unrecognized table token for demo restaurant.",
    };
  }

  try {
    const supabase = await createClient();

    // 1. Resolve restaurant by slug
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", restaurantSlug)
      .maybeSingle();

    if (restErr || !restaurant) {
      return {
        isValid: false,
        error: "Restaurant not found.",
      };
    }

    // 2. Resolve table by qr_token and verify it belongs to this restaurant and is active
    const { data: table, error: tblErr } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, display_name, capacity, status, is_active")
      .eq("restaurant_id", restaurant.id)
      .eq("qr_token", tableToken)
      .maybeSingle();

    if (tblErr || !table) {
      return {
        isValid: false,
        error: "Table QR token is invalid, revoked, or belongs to another restaurant.",
      };
    }

    if (!table.is_active) {
      return {
        isValid: false,
        error: "This table is currently inactive and cannot accept orders.",
      };
    }

    return {
      isValid: true,
      tableId: table.id,
      tableNumber: table.table_number,
      displayName: table.display_name,
      capacity: table.capacity,
      status: table.status,
    };
  } catch (err) {
    console.error("Error resolving table token:", err);
    return {
      isValid: false,
      error: "Failed to verify table token.",
    };
  }
}
