import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackingToken, amount, splitType = "full", payerName } = body;

    if (!trackingToken) {
      return NextResponse.json(
        { error: "Customer tracking token is required." },
        { status: 400 }
      );
    }

    const isConfigured = isSupabaseServerConfigured();

    // Demo / Dev Simulation Fallback
    if (!isConfigured) {
      const simulatedAmount = amount || 714;
      const simulatedAmountPaise = Math.round(simulatedAmount * 100);
      const simulatedRazorpayOrderId = `order_sim_${Date.now()}`;

      return NextResponse.json({
        success: true,
        razorpayOrderId: simulatedRazorpayOrderId,
        amountPaise: simulatedAmountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
        orderNumber: "#DF-DEMO",
        splitType,
        isSimulation: true,
        message: "Razorpay test order initialized (Simulation Mode)",
      });
    }

    const supabase = await createClient();

    // 1. Fetch Order by tracking token
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, restaurant:restaurants(*)")
      .eq("customer_tracking_token", trackingToken)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid in full." },
        { status: 400 }
      );
    }

    if (order.order_status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot accept payments for cancelled orders." },
        { status: 400 }
      );
    }

    // 2. Fetch existing payments to verify remaining balance
    const { data: existingPayments } = await supabase
      .from("payment_records")
      .select("amount_paise, payment_status")
      .eq("order_id", order.id)
      .eq("payment_status", "captured");

    const capturedPaise = (existingPayments || []).reduce(
      (sum, p) => sum + Number(p.amount_paise),
      0
    );
    const totalOrderPaise = Math.round(Number(order.grand_total) * 100);
    const remainingPaise = totalOrderPaise - capturedPaise;

    if (remainingPaise <= 0) {
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id);
      return NextResponse.json(
        { error: "Order is already fully paid." },
        { status: 400 }
      );
    }

    // Determine amount to charge
    let requestedAmountPaise = remainingPaise;
    if (amount && amount > 0) {
      const parsedPaise = Math.round(amount * 100);
      if (parsedPaise > remainingPaise) {
        return NextResponse.json(
          { error: `Payment amount exceeds remaining balance of ₹${(remainingPaise / 100).toFixed(2)}` },
          { status: 400 }
        );
      }
      requestedAmountPaise = parsedPaise;
    }

    // 3. Initialize Razorpay Client
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";

    let razorpayOrderId = `order_${Date.now()}`;
    let isSimulation = false;

    if (
      razorpayKeyId.includes("placeholder") ||
      razorpayKeySecret.includes("placeholder") ||
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      // Simulation mode when real API keys are not supplied
      razorpayOrderId = `order_sim_${Date.now()}`;
      isSimulation = true;
    } else {
      const razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: requestedAmountPaise,
        currency: "INR",
        receipt: `${order.order_number.replace("#", "")}_${Date.now().toString().slice(-4)}`,
        notes: {
          restaurant_id: order.restaurant_id,
          order_id: order.id,
          order_number: order.order_number,
          split_type: splitType,
        },
      });

      razorpayOrderId = razorpayOrder.id;
    }

    // 4. Record Pending Payment Record
    await supabase.from("payment_records").insert({
      restaurant_id: order.restaurant_id,
      order_id: order.id,
      razorpay_order_id: razorpayOrderId,
      amount_paise: requestedAmountPaise,
      currency: "INR",
      payment_status: "pending",
      split_type: splitType,
      payer_name: payerName || null,
      signature_verified: false,
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId,
      amountPaise: requestedAmountPaise,
      currency: "INR",
      keyId: razorpayKeyId,
      orderNumber: order.order_number,
      restaurantName: order.restaurant?.name || "DineFlow Restaurant",
      splitType,
      isSimulation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    console.error("Razorpay create-order error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
