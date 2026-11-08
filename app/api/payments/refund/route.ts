import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentRecordId, reason = "Customer requested refund", amountPaise } = body;

    if (!paymentRecordId) {
      return NextResponse.json(
        { error: "Payment record ID is required." },
        { status: 400 }
      );
    }

    const isConfigured = isSupabaseServerConfigured();

    // Demo Mode Simulation
    if (!isConfigured) {
      return NextResponse.json({
        success: true,
        refundId: `rfnd_sim_${Date.now()}`,
        status: "refunded",
        message: "Simulated refund processed successfully in demo mode.",
      });
    }

    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Fetch payment record
    const { data: record, error: recordErr } = await supabase
      .from("payment_records")
      .select("*, order:orders(*)")
      .eq("id", paymentRecordId)
      .single();

    if (recordErr || !record) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    // Check staff permissions
    const { data: member } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", record.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!member || !["owner", "manager"].includes(member.role)) {
      return NextResponse.json(
        { error: "Only restaurant owners and managers can issue refunds." },
        { status: 403 }
      );
    }

    if (record.payment_status === "refunded") {
      return NextResponse.json(
        { error: "This payment has already been refunded." },
        { status: 400 }
      );
    }

    const refundPaise = amountPaise || record.amount_paise;

    // Process with Razorpay if key and payment_id exist
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (
      keyId &&
      keySecret &&
      !keyId.includes("placeholder") &&
      record.razorpay_payment_id &&
      !record.razorpay_payment_id.startsWith("pay_sim_")
    ) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      await razorpay.payments.refund(record.razorpay_payment_id, {
        amount: refundPaise,
        notes: { reason },
      });
    }

    // Update payment record in database
    await supabase
      .from("payment_records")
      .update({
        payment_status: "refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    // Update order status if all payments refunded
    if (record.order_id) {
      await supabase
        .from("orders")
        .update({
          payment_status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.order_id);
    }

    // Record audit log
    await supabase.from("audit_logs").insert({
      restaurant_id: record.restaurant_id,
      actor_user_id: user.id,
      action: "payment_refunded",
      entity_type: "payment",
      entity_id: record.id,
      metadata: {
        refund_amount_paise: refundPaise,
        reason,
        order_id: record.order_id,
      },
    });

    return NextResponse.json({
      success: true,
      status: "refunded",
      message: "Refund processed and record updated successfully.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Refund error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process refund." },
      { status: 500 }
    );
  }
}
