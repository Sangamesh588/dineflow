"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DineFlowLogo } from "@/components/layout/DineFlowLogo";
import {
  CheckCircle2,
  Clock,
  Flame,
  Utensils,
  CreditCard,
  Printer,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ trackingToken: string }>;
}

export default function OrderTrackingPage({ params }: PageProps) {
  const { trackingToken } = use(params);

  // Demo order default state
  const [order, setOrder] = useState<Order>({
    id: "ord_demo_101",
    restaurant_id: "demo",
    table_id: "tbl_2",
    order_number: "#DF-1042",
    order_type: "dine_in",
    order_status: "preparing",
    payment_status: "unpaid",
    subtotal: 680,
    tax_amount: 34,
    service_charge: 0,
    grand_total: 714,
    customer_name: "Dining Guest",
    customer_phone: null,
    special_instructions: "Please make the Paneer Tikka extra crisp",
    customer_tracking_token: trackingToken,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: "item_1",
        order_id: "ord_demo_101",
        restaurant_id: "demo",
        menu_item_id: "m_1",
        item_name_snapshot: "Paneer Tikka Angara",
        unit_price: 340,
        quantity: 1,
        variant_snapshot: { id: "v_1", restaurant_id: "demo", menu_item_id: "m_1", name: "Platter", price_adjustment: 160, is_available: true },
        addons_snapshot: [{ id: "a_1", restaurant_id: "demo", menu_item_id: "m_1", name: "Extra Mint Chutney", additional_price: 35, is_available: true }],
        item_total: 535,
      },
      {
        id: "item_2",
        order_id: "ord_demo_101",
        restaurant_id: "demo",
        menu_item_id: "m_4",
        item_name_snapshot: "Truffle Butter Garlic Naan",
        unit_price: 120,
        quantity: 1,
        item_total: 120,
      },
    ],
  });

  const [tableNumber] = useState<string>("T-02");
  const [restaurantName] = useState<string>("DineFlow Bistro & Lounge");
  const [remainingBalance, setRemainingBalance] = useState<number>(714);

  // Payment states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"full" | "equal" | "custom">("full");
  const [splitCount, setSplitCount] = useState<number>(2);
  const [customPayAmount, setCustomPayAmount] = useState<number>(357);
  const [payerName, setPayerName] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Digital Receipt modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Calculate amount to pay based on split mode
  const payableAmount =
    splitMode === "full"
      ? remainingBalance
      : splitMode === "equal"
      ? Math.round((remainingBalance / splitCount) * 100) / 100
      : customPayAmount;

  // Simulate Razorpay Payment execution
  const handleInitiateRazorpay = async () => {
    setIsProcessingPayment(true);

    try {
      // 1. Call Create Order API
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingToken,
          amount: payableAmount,
          splitType: splitMode,
          payerName: payerName || "Guest",
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        alert(orderData.error || "Failed to initialize payment");
        setIsProcessingPayment(false);
        return;
      }

      // 2. Simulate Razorpay Checkout popup experience
      setTimeout(async () => {
        // 3. Call Verify API
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.razorpayOrderId,
            razorpay_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            razorpay_signature: "simulated_valid_signature",
            trackingToken,
            paymentMethod: "upi",
          }),
        });

        await verifyRes.json();
        setIsProcessingPayment(false);
        setIsPayModalOpen(false);

        const newRemaining = Math.max(0, remainingBalance - payableAmount);
        setRemainingBalance(newRemaining);

        if (newRemaining <= 0) {
          setOrder((prev) => ({ ...prev, payment_status: "paid" }));
          setPaymentSuccessMessage(`Full payment of ${formatCurrency(payableAmount)} captured via UPI. Bill Settled!`);
        } else {
          setPaymentSuccessMessage(`Partial split payment of ${formatCurrency(payableAmount)} captured. Remaining balance: ${formatCurrency(newRemaining)}`);
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment error";
      alert(msg);
      setIsProcessingPayment(false);
    }
  };

  const steps: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
    { key: "pending", label: "Order Received", icon: Clock },
    { key: "accepted", label: "Accepted by Floor", icon: CheckCircle2 },
    { key: "preparing", label: "Cooking in Kitchen", icon: Flame },
    { key: "ready", label: "Ready to Serve", icon: Sparkles },
    { key: "served", label: "Served at Table", icon: Utensils },
    { key: "completed", label: "Billed & Completed", icon: ShieldCheck },
  ];

  const getStepIndex = (status: OrderStatus) => {
    return steps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = getStepIndex(order.order_status);

  return (
    <div className="min-h-screen bg-charcoal text-cream py-10 px-4 sm:px-6 lg:px-8 pb-32">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-charcoal-border pb-4">
          <DineFlowLogo />
          <Link
            href="/menu/demo-restaurant"
            className="text-xs text-charcoal-muted hover:text-cream flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Menu
          </Link>
        </div>

        {paymentSuccessMessage && (
          <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-4 text-xs text-emerald-light flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald shrink-0" />
            <span className="font-semibold">{paymentSuccessMessage}</span>
          </div>
        )}

        {/* 1. Live Order Tracker Status Card */}
        <Card className="border-charcoal-border bg-charcoal-card shadow-2xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono font-bold text-emerald tracking-wider uppercase">
                  Live Order Tracker
                </p>
                <h1 className="text-2xl font-black text-cream mt-0.5">
                  {order.order_number}
                </h1>
                <p className="text-xs text-charcoal-muted mt-1">
                  {restaurantName} • Table {tableNumber}
                </p>
              </div>

              <div className="text-right">
                <Badge
                  variant={
                    order.payment_status === "paid"
                      ? "default"
                      : order.payment_status === "pending"
                      ? "outline"
                      : "secondary"
                  }
                  className="capitalize font-semibold text-xs"
                >
                  Payment: {order.payment_status}
                </Badge>
                <p className="text-[11px] text-charcoal-muted mt-1">
                  12 mins elapsed
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-6">
            {/* Stepper progress */}
            <div className="relative pt-2">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-charcoal border border-charcoal-border">
                <div
                  style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald transition-all duration-500"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {steps.map((st, i) => {
                  const isDone = i <= currentStepIdx;
                  const isCurrent = i === currentStepIdx;
                  const Icon = st.icon;

                  return (
                    <div key={st.key} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-emerald text-cream ring-4 ring-emerald/20 animate-pulse"
                            : isDone
                            ? "bg-emerald/30 text-emerald"
                            : "bg-charcoal text-charcoal-muted border border-charcoal-border"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-[10px] leading-tight font-medium ${
                          isCurrent
                            ? "text-cream font-bold"
                            : isDone
                            ? "text-emerald"
                            : "text-charcoal-muted"
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kitchen ETA Note */}
            <div className="p-3.5 rounded-xl bg-charcoal border border-charcoal-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Flame className="h-4 w-4 shrink-0" />
                <span>Station: Main Tandoor & Grill Line</span>
              </div>
              <span className="font-semibold text-cream">Est. 6 mins remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Order Items Breakdown */}
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base text-cream">Order Details</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Prepared fresh for Table {tableNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="divide-y divide-charcoal-border">
              {order.items?.map((item) => (
                <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <p className="font-bold text-cream">
                      {item.quantity}x {item.item_name_snapshot}
                    </p>
                    {item.variant_snapshot && (
                      <p className="text-[11px] text-emerald font-medium">
                        Portion: {item.variant_snapshot.name}
                      </p>
                    )}
                    {item.addons_snapshot && item.addons_snapshot.length > 0 && (
                      <p className="text-[10px] text-charcoal-muted">
                        Extras: {item.addons_snapshot.map((a) => a.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-cream">
                    {formatCurrency(item.item_total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill summary breakdown */}
            <div className="p-4 rounded-xl bg-charcoal border border-charcoal-border space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-muted">
                <span>Subtotal</span>
                <span className="text-cream font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-charcoal-muted">
                <span>GST (5%)</span>
                <span className="text-cream font-medium">{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="h-px bg-charcoal-border my-1" />
              <div className="flex justify-between font-extrabold text-sm text-cream">
                <span>Grand Total</span>
                <span className="text-emerald text-base">{formatCurrency(order.grand_total)}</span>
              </div>

              {remainingBalance > 0 && remainingBalance < order.grand_total && (
                <div className="flex justify-between text-xs font-bold text-amber-400 pt-1">
                  <span>Remaining Payable Balance:</span>
                  <span>{formatCurrency(remainingBalance)}</span>
                </div>
              )}
            </div>

            {/* Bottom Payment and Receipt Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {order.payment_status !== "paid" ? (
                <Button
                  onClick={() => setIsPayModalOpen(true)}
                  className="flex-1 gap-2 min-h-[48px] py-3 text-sm font-bold shadow-xl shadow-emerald/20 transition-all active:scale-[0.99]"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Bill with Razorpay ({formatCurrency(remainingBalance)})</span>
                </Button>
              ) : (
                <div className="flex-1 p-3.5 rounded-xl bg-emerald/20 border border-emerald/50 flex items-center justify-center gap-2 text-xs font-bold text-emerald-light">
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  <span>Paid in Full • Thank You for Dining with Us</span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setIsReceiptModalOpen(true)}
                className="gap-2 text-xs border-charcoal-border hover:bg-charcoal-surface min-h-[48px] sm:min-h-[44px]"
              >
                <Printer className="h-4 w-4" /> View Digital Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. RAZORPAY PAYMENT & SPLIT BILLING MODAL (Phase 7) */}
        <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald" />
                <span>Smart Table Billing & Razorpay</span>
              </DialogTitle>
              <DialogDescription>
                Pay in full or split the bill with your dining companions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Split billing mode selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode("full")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    splitMode === "full"
                      ? "border-emerald bg-emerald/10 text-cream font-bold"
                      : "border-charcoal-border bg-charcoal text-charcoal-muted hover:text-cream"
                  }`}
                >
                  Pay Full
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("equal")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    splitMode === "equal"
                      ? "border-emerald bg-emerald/10 text-cream font-bold"
                      : "border-charcoal-border bg-charcoal text-charcoal-muted hover:text-cream"
                  }`}
                >
                  Split Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("custom")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    splitMode === "custom"
                      ? "border-emerald bg-emerald/10 text-cream font-bold"
                      : "border-charcoal-border bg-charcoal text-charcoal-muted hover:text-cream"
                  }`}
                >
                  Custom Amount
                </button>
              </div>

              {/* Split controls */}
              {splitMode === "equal" && (
                <div className="p-3 rounded-xl bg-charcoal border border-charcoal-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-charcoal-muted">Number of Guests</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                        className="px-2 py-0.5 rounded bg-charcoal-surface text-cream"
                      >
                        -
                      </button>
                      <span className="font-bold text-cream">{splitCount}</span>
                      <button
                        onClick={() => setSplitCount(Math.min(10, splitCount + 1))}
                        className="px-2 py-0.5 rounded bg-charcoal-surface text-cream"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald">
                    <span>Your Share:</span>
                    <span>{formatCurrency(payableAmount)}</span>
                  </div>
                </div>
              )}

              {splitMode === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Amount You Wish to Pay (INR)</label>
                  <Input
                    type="number"
                    max={remainingBalance}
                    value={customPayAmount}
                    onChange={(e) => setCustomPayAmount(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-charcoal-muted">
                    Max payable: {formatCurrency(remainingBalance)}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Your Name (for receipt)</label>
                <Input
                  placeholder="e.g. Ramesh S."
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Razorpay Gateway Badge */}
              <div className="rounded-xl border border-charcoal-border bg-charcoal p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald" />
                  <span className="text-cream font-medium">Razorpay 256-Bit Encrypted</span>
                </div>
                <span className="text-[11px] text-charcoal-muted">UPI / Cards / NetBanking</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInitiateRazorpay}
                disabled={isProcessingPayment || payableAmount <= 0}
                className="gap-2 font-bold"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Contacting Razorpay...</span>
                  </>
                ) : (
                  <span>Pay {formatCurrency(payableAmount)}</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 4. DIGITAL RECEIPT MODAL (Phase 7) */}
        <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Tax Invoice & Digital Receipt</span>
                <Button size="sm" variant="ghost" onClick={() => window.print()} className="h-8 gap-1 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </DialogTitle>
              <DialogDescription>
                Indian GST Compliant Tax Receipt
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 rounded-2xl bg-cream text-charcoal-dark space-y-4 text-xs font-mono shadow-inner border border-charcoal-muted/30">
              <div className="text-center space-y-0.5 border-b border-charcoal-dark/20 pb-3">
                <h3 className="font-black text-base uppercase tracking-tight">{restaurantName}</h3>
                <p className="text-[11px]">Bandra West, Mumbai, MH - 400050</p>
                <p className="text-[10px] text-charcoal-muted">GSTIN: 27AABCU9603R1ZX</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Order: {order.order_number}</span>
                <span>Table: {tableNumber}</span>
              </div>

              <div className="divide-y divide-charcoal-dark/10 border-y border-charcoal-dark/20 py-2 space-y-1">
                {order.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between pt-1">
                    <span>{it.quantity}x {it.item_name_snapshot}</span>
                    <span className="font-bold">{formatCurrency(it.item_total)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span>{formatCurrency(order.tax_amount / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span>{formatCurrency(order.tax_amount / 2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-charcoal-dark/30 pt-1">
                  <span>TOTAL (INR):</span>
                  <span>{formatCurrency(order.grand_total)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-charcoal-dark/20 text-[10px] text-charcoal-muted">
                <p>Status: {order.payment_status.toUpperCase()}</p>
                <p>Thank you for dining with DineFlow!</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
