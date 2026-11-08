import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod = "upi",
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: "Missing razorpay_order_id or razorpay_payment_id" },
        { status: 400 }
      );
    }

    const isConfigured = isSupabaseServerConfigured();
    const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";
    const isSimulation = secret.includes("placeholder") || razorpay_order_id.startsWith("order_sim_");

    // 1. Cryptographic HMAC SHA256 Signature Verification
    if (!isSimulation) {
      if (!razorpay_signature) {
        return NextResponse.json({ error: "Missing razorpay_signature" }, { status: 400 });
      }

      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(razorpay_signature)
      );

      if (!isSignatureValid) {
        return NextResponse.json(
          { error: "Invalid Razorpay payment signature. Payment verification failed." },
          { status: 400 }
        );
      }
    }

    // In demo mode or if Supabase not configured:
    if (!isConfigured) {
      return NextResponse.json({
        success: true,
        paymentStatus: "paid",
        remainingBalance: 0,
        message: "Payment successfully verified and settled.",
      });
    }

    const supabase = await createClient();

    // 2. Fetch Payment Record
    const { data: record, error: recErr } = await supabase
      .from("payment_records")
      .select("*, order:orders(*)")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (recErr || !record) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    // Prevent duplicate confirmation
    if (record.signature_verified && record.payment_status === "captured") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        paymentStatus: record.order?.payment_status || "paid",
      });
    }

    // 3. Update Payment Record to Captured
    await supabase
      .from("payment_records")
      .update({
        razorpay_payment_id,
        payment_status: "captured",
        payment_method: paymentMethod,
        signature_verified: true,
      })
      .eq("id", record.id);

    // 4. Check Complete Order Balance
    const { data: allCaptured } = await supabase
      .from("payment_records")
      .select("amount_paise")
      .eq("order_id", record.order_id)
      .eq("payment_status", "captured");

    const totalCapturedPaise = (allCaptured || []).reduce(
      (acc, p) => acc + Number(p.amount_paise),
      0
    );

    const orderTotalPaise = Math.round(Number(record.order?.grand_total || 0) * 100);
    const remainingBalance = Math.max(0, (orderTotalPaise - totalCapturedPaise) / 100);
    const isFullyPaid = totalCapturedPaise >= orderTotalPaise;

    // 5. Update Order Status
    const newPaymentStatus = isFullyPaid ? "paid" : "pending";
    await supabase
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
      })
      .eq("id", record.order_id);

    // 6. Audit Log & Notifications (Phase 8)
    await supabase.from("audit_logs").insert({
      restaurant_id: record.restaurant_id,
      action: "payment_captured",
      entity_type: "order",
      entity_id: record.order_id,
      metadata: {
        payment_id: razorpay_payment_id,
        amount_paise: record.amount_paise,
        fully_paid: isFullyPaid,
      },
    });

    await supabase.from("notifications").insert({
      restaurant_id: record.restaurant_id,
      title: `Payment Received (${record.order?.order_number})`,
      message: `₹${(record.amount_paise / 100).toFixed(2)} captured via ${paymentMethod.toUpperCase()}`,
      type: "payment",
      read: false,
    });

    return NextResponse.json({
      success: true,
      paymentStatus: newPaymentStatus,
      isFullyPaid,
      remainingBalance,
      orderNumber: record.order?.order_number,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification error";
    console.error("Payment verification API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
