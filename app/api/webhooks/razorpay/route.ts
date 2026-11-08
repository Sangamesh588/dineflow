import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_placeholder";

    // 1. Signature Verification
    if (signature && !webhookSecret.includes("placeholder")) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

      if (!isSignatureValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = payload.event;

    const isConfigured = isSupabaseServerConfigured();
    if (!isConfigured) {
      return NextResponse.json({ received: true, simulated: true });
    }

    const supabase = await createClient();

    // 2. Idempotency Check in payment_events
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // 3. Record Event
    await supabase.from("payment_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload: payload,
      processed: true,
    });

    // 4. Handle Event Types
    if (eventType === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        await supabase
          .from("payment_records")
          .update({
            razorpay_payment_id: paymentId,
            payment_status: "captured",
            signature_verified: true,
          })
          .eq("razorpay_order_id", razorpayOrderId);
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        await supabase
          .from("payment_records")
          .update({ payment_status: "failed" })
          .eq("razorpay_order_id", razorpayOrderId);
      }
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
