import { NextResponse } from "next/server";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveTableToken } from "@/lib/tables/token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      restaurantSlug,
      tableToken,
      customerName,
      customerPhone,
      specialInstructions,
      items,
      idempotencyKey,
      orderType = "dine_in",
    } = body;

    if (!restaurantSlug || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload: restaurantSlug and items array are required." },
        { status: 400 }
      );
    }

    // 1. Verify table token
    const resolvedTable = await resolveTableToken(restaurantSlug, tableToken);
    if (!resolvedTable.isValid && orderType === "dine_in") {
      return NextResponse.json(
        {
          error: "A verified dining table is required to place a dine-in order. Please scan your table's QR stand.",
          details: resolvedTable.error,
        },
        { status: 403 }
      );
    }

    const isConfigured = isSupabaseServerConfigured();

    // In demo mode or if Supabase not configured: generate simulated response
    if (!isConfigured || restaurantSlug === "demo-restaurant") {
      const demoOrderNumber = `#DF-${Math.floor(1000 + Math.random() * 9000)}`;
      const demoTrackingToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Calculate total from items
      let subtotal = 0;
      items.forEach((item: { unitPrice?: number; quantity?: number }) => {
        subtotal += (item.unitPrice || 250) * (item.quantity || 1);
      });
      const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
      const grandTotal = subtotal + taxAmount;

      return NextResponse.json({
        success: true,
        orderId: `ord_simulated_${Date.now()}`,
        orderNumber: demoOrderNumber,
        trackingToken: demoTrackingToken,
        trackingUrl: `/order-status/${demoTrackingToken}`,
        tableNumber: resolvedTable.tableNumber || "T-01",
        subtotal,
        taxAmount,
        serviceCharge: 0,
        grandTotal,
        currency: "INR",
        orderStatus: "pending",
        paymentStatus: "unpaid",
        message: "Order placed successfully! Sending to kitchen.",
      });
    }

    // Live Supabase Execution
    const supabase = await createClient();

    // 2. Fetch Restaurant & Settings
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, tax_percentage, currency, settings:restaurant_settings(*)")
      .eq("slug", restaurantSlug)
      .single();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    // Check if accepting orders
    const restaurantSettings = (restaurant as unknown as {
      settings?: Array<{ accepting_orders?: boolean; service_charge?: number }>;
    }).settings;
    const isAccepting = restaurantSettings?.[0]?.accepting_orders ?? true;
    if (!isAccepting) {
      return NextResponse.json(
        { error: "The restaurant is currently not accepting new digital orders." },
        { status: 400 }
      );
    }

    // 3. Idempotency Check
    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_number, customer_tracking_token, grand_total, order_status, payment_status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          trackingToken: existingOrder.customer_tracking_token,
          trackingUrl: `/order-status/${existingOrder.customer_tracking_token}`,
          grandTotal: existingOrder.grand_total,
          orderStatus: existingOrder.order_status,
          paymentStatus: existingOrder.payment_status,
          idempotentReplay: true,
        });
      }
    }

    // 4. Server-Side Price Verification from DB
    // Fetch all referenced menu items from DB
    const itemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const { data: dbItems, error: itemsErr } = await supabase
      .from("menu_items")
      .select("*, variants:menu_item_variants(*), addons:menu_item_addons(*)")
      .in("id", itemIds)
      .eq("restaurant_id", restaurant.id);

    if (itemsErr || !dbItems || dbItems.length === 0) {
      return NextResponse.json({ error: "Selected items not found in menu." }, { status: 400 });
    }

    let calculatedSubtotal = 0;
    const validatedOrderItems = [];

    for (const requestedItem of items) {
      const matchedDbItem = dbItems.find((d) => d.id === requestedItem.menuItemId);
      if (!matchedDbItem) {
        return NextResponse.json(
          { error: `Item ${requestedItem.menuItemId} is invalid or no longer available.` },
          { status: 400 }
        );
      }

      if (!matchedDbItem.is_available) {
        return NextResponse.json(
          { error: `"${matchedDbItem.name}" is currently out of stock.` },
          { status: 400 }
        );
      }

      let unitPrice = Number(matchedDbItem.price);
      let variantSnapshot = null;
      const addonsSnapshot = [];

      // Variant check
      if (requestedItem.variantId) {
        const matchedVariant = matchedDbItem.variants?.find(
          (v: { id: string }) => v.id === requestedItem.variantId
        );
        if (matchedVariant) {
          if (!matchedVariant.is_available) {
            return NextResponse.json(
              { error: `Variant "${matchedVariant.name}" for "${matchedDbItem.name}" is out of stock.` },
              { status: 400 }
            );
          }
          unitPrice += Number(matchedVariant.price_adjustment);
          variantSnapshot = matchedVariant;
        }
      }

      // Add-ons check
      if (Array.isArray(requestedItem.addonIds) && requestedItem.addonIds.length > 0) {
        for (const addonId of requestedItem.addonIds) {
          const matchedAddon = matchedDbItem.addons?.find((a: { id: string }) => a.id === addonId);
          if (matchedAddon) {
            if (!matchedAddon.is_available) {
              return NextResponse.json(
                { error: `Add-on "${matchedAddon.name}" is currently out of stock.` },
                { status: 400 }
              );
            }
            unitPrice += Number(matchedAddon.additional_price);
            addonsSnapshot.push(matchedAddon);
          }
        }
      }

      const quantity = Math.max(1, parseInt(requestedItem.quantity, 10) || 1);
      const itemTotal = unitPrice * quantity;
      calculatedSubtotal += itemTotal;

      validatedOrderItems.push({
        menu_item_id: matchedDbItem.id,
        item_name_snapshot: matchedDbItem.name,
        unit_price: unitPrice,
        quantity,
        variant_snapshot: variantSnapshot,
        addons_snapshot: addonsSnapshot,
        special_instructions: requestedItem.specialInstructions || null,
        item_total: itemTotal,
      });
    }

    // 5. Calculate Taxes & Grand Total
    const taxRate = Number(restaurant.tax_percentage) || 5.0;
    const taxAmount = Math.round((calculatedSubtotal * taxRate) / 100 * 100) / 100;
    const serviceChargeRate = Number(restaurantSettings?.[0]?.service_charge) || 0.0;
    const serviceChargeAmount = Math.round((calculatedSubtotal * serviceChargeRate) / 100 * 100) / 100;
    const grandTotal = calculatedSubtotal + taxAmount + serviceChargeAmount;

    // 6. Generate Order Number & Tracking Token
    const orderNumber = `#DF-${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingToken = crypto.randomUUID();

    // 7. Insert into Orders Table
    const { data: newOrder, error: orderInsertErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        table_id: resolvedTable.tableId || null,
        order_number: orderNumber,
        order_type: orderType,
        order_status: "pending",
        payment_status: "unpaid",
        subtotal: calculatedSubtotal,
        tax_amount: taxAmount,
        service_charge: serviceChargeAmount,
        grand_total: grandTotal,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        special_instructions: specialInstructions || null,
        idempotency_key: idempotencyKey || null,
        customer_tracking_token: trackingToken,
      })
      .select()
      .single();

    if (orderInsertErr || !newOrder) {
      throw orderInsertErr || new Error("Failed to create order record");
    }

    // 8. Insert Order Items
    const orderItemsPayload = validatedOrderItems.map((item) => ({
      order_id: newOrder.id,
      restaurant_id: restaurant.id,
      ...item,
    }));

    const { error: itemsInsertErr } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsInsertErr) {
      console.error("Failed to insert order items:", itemsInsertErr);
    }

    // 9. Update Table Status to 'occupied'
    if (resolvedTable.tableId) {
      await supabase
        .from("restaurant_tables")
        .update({ status: "occupied" })
        .eq("id", resolvedTable.tableId);
    }

    // 10. Status History, Audit Log & Staff Notification
    try {
      await supabase.from("order_status_history").insert({
        order_id: newOrder.id,
        from_status: null,
        to_status: "pending",
        metadata: {
          event: "order_placed",
          table: resolvedTable.tableNumber,
          customer_name: customerName,
        },
      });
    } catch (hErr) {
      console.warn("Status history warning:", hErr);
    }

    await supabase.from("audit_logs").insert({
      restaurant_id: restaurant.id,
      action: "order_created",
      entity_type: "order",
      entity_id: newOrder.id,
      metadata: {
        order_number: orderNumber,
        table: resolvedTable.tableNumber,
        total: grandTotal,
      },
    });

    await supabase.from("notifications").insert({
      restaurant_id: restaurant.id,
      title: `New Order ${orderNumber}`,
      message: `${resolvedTable.tableNumber ? `Table ${resolvedTable.tableNumber}` : "Dine-in"} placed order for ₹${grandTotal}`,
      type: "order",
      read: false,
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      trackingToken: newOrder.customer_tracking_token,
      trackingUrl: `/order-status/${newOrder.customer_tracking_token}`,
      tableNumber: resolvedTable.tableNumber || "T-01",
      subtotal: calculatedSubtotal,
      taxAmount,
      serviceCharge: serviceChargeAmount,
      grandTotal,
      currency: "INR",
      orderStatus: "pending",
      paymentStatus: "unpaid",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Order creation API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
