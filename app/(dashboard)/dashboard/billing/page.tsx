"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PaymentRecord } from "@/types";
import {
  Receipt,
  ShieldCheck,
  Printer,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  CreditCard,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Users,
  UtensilsCrossed,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface SubscriptionPlanInfo {
  name: string;
  slug: string;
  price_inr: number;
  billing_interval?: string;
  status?: string;
  menu_items_limit: number;
  tables_limit: number;
  staff_members_limit: number;
  orders_per_month_limit: number;
  features?: string[];
}

interface SubscriptionUsage {
  menuItems: { used: number; limit: number };
  tables: { used: number; limit: number };
  staff: { used: number; limit: number };
  orders: { used: number; limit: number };
}

interface ExtendedPaymentRecord extends PaymentRecord {
  order_number?: string;
  table_number?: string;
  customer_name?: string;
  subtotal?: number;
  tax_amount?: number;
}

export default function BillingManagementPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "subscription">("orders");
  const [payments, setPayments] = useState<ExtendedPaymentRecord[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>("DineFlow Restaurant");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ExtendedPaymentRecord | null>(null);
  const [refundCandidate, setRefundCandidate] = useState<ExtendedPaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SaaS Subscriptions & Usage Limits
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlanInfo>({
    name: "Starter Free",
    slug: "free",
    price_inr: 0,
    status: "active",
    menu_items_limit: 25,
    tables_limit: 5,
    staff_members_limit: 2,
    orders_per_month_limit: 100,
  });
  const [planUsage, setPlanUsage] = useState<SubscriptionUsage>({
    menuItems: { used: 12, limit: 25 },
    tables: { used: 4, limit: 5 },
    staff: { used: 2, limit: 2 },
    orders: { used: 38, limit: 100 },
  });
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    async function loadSubscription() {
      try {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
          const data = await res.json();
          if (data.plan) setCurrentPlan(data.plan);
          if (data.usage) setPlanUsage(data.usage);
        }
      } catch (err) {
        console.warn("Could not load subscription details:", err);
      }
    }
    loadSubscription();
  }, []);

  const handleUpgradePlan = async (slug: string) => {
    setIsUpgrading(slug);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanSlug: slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(data.message || `Successfully transitioned to ${slug} plan.`);
        const subRes = await fetch("/api/subscriptions");
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.plan) setCurrentPlan(subData.plan);
          if (subData.usage) setPlanUsage(subData.usage);
        }
      } else {
        setActionFeedback(`Upgrade failed: ${data.error || "Please try again"}`);
      }
    } catch {
      setActionFeedback("Failed to update subscription. Please check your connection.");
    } finally {
      setIsUpgrading(null);
    }
  };

  useEffect(() => {
    if (!configured) return;
    const fetchPayments = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("payment_records")
          .select("*, order:orders(*, table:restaurant_tables(table_number))")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) {
          const mapped: ExtendedPaymentRecord[] = (data as unknown as Array<{
            id: string;
            restaurant_id: string;
            order_id: string;
            razorpay_order_id: string;
            razorpay_payment_id: string | null;
            amount_paise: number;
            currency: string;
            payment_status: "pending" | "captured" | "failed" | "refunded";
            payment_method: string | null;
            signature_verified: boolean;
            split_type: "full" | "equal" | "custom";
            payer_name: string | null;
            created_at: string;
            updated_at: string;
            order?: {
              order_number?: string;
              subtotal?: number;
              tax_amount?: number;
              customer_name?: string;
              table?: { table_number?: string };
            };
          }>).map((item) => ({
            ...item,
            order_number: item.order?.order_number || `#DF-${item.order_id?.slice(0, 4)}`,
            table_number: item.order?.table?.table_number ? `Table ${item.order?.table?.table_number}` : "Takeaway",
            customer_name: item.order?.customer_name || item.payer_name || "Guest",
            subtotal: item.order?.subtotal || item.amount_paise / 100 / 1.05,
            tax_amount: item.order?.tax_amount || (item.amount_paise / 100) * 0.05,
          }));
          setPayments(mapped);
        } else {
          setPayments([]);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from("restaurant_members")
            .select("restaurant:restaurants(name)")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          if (member?.restaurant) {
            setRestaurantName((member.restaurant as { name?: string })?.name || "DineFlow Restaurant");
          }
        }
      } catch (err) {
        console.error("Failed to fetch payments:", err);
      }
    };
    fetchPayments();
  }, [configured]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProcessRefund = async () => {
    if (!refundCandidate) return;
    setRefundLoading(true);

    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentRecordId: refundCandidate.id,
          reason: refundReason || "Customer requested refund",
          amountPaise: refundCandidate.amount_paise,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === refundCandidate.id ? { ...p, payment_status: "refunded" } : p
        )
      );

      setActionFeedback(`Successfully refunded ₹${(refundCandidate.amount_paise / 100).toFixed(2)}.`);
      setRefundCandidate(null);
      setRefundReason("");
    } catch (err: unknown) {
      const error = err as Error;
      setActionFeedback(`Refund failed: ${error.message}`);
    } finally {
      setRefundLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Aggregated Metrics
  const totalCapturedPaise = payments
    .filter((p) => p.payment_status === "captured")
    .reduce((sum, p) => sum + p.amount_paise, 0);

  const pendingPaise = payments
    .filter((p) => p.payment_status === "pending")
    .reduce((sum, p) => sum + p.amount_paise, 0);

  const refundedPaise = payments
    .filter((p) => p.payment_status === "refunded")
    .reduce((sum, p) => sum + p.amount_paise, 0);

  // Filtered List
  const filteredPayments = payments.filter((p) => {
    const matchesFilter =
      statusFilter === "all" || p.payment_status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.razorpay_payment_id?.toLowerCase().includes(q) ||
      p.order_number?.toLowerCase().includes(q) ||
      p.table_number?.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.payer_name?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7 text-emerald" />
            Billing & Invoicing (INR)
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Indian GST compliance, live Razorpay settlements, split payment tracking, and audit logs
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3.5 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-charcoal-border">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-emerald text-emerald"
              : "border-transparent text-charcoal-muted hover:text-cream"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Customer Orders & Receipts
        </button>
        <button
          onClick={() => setActiveTab("subscription")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "subscription"
              ? "border-emerald text-emerald"
              : "border-transparent text-charcoal-muted hover:text-cream"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          SaaS Subscription & Plan Limits
        </button>
      </div>

      {activeTab === "orders" ? (
        <>
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Settled Collections
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">
            {formatCurrency(totalCapturedPaise / 100)}
          </p>
          <span className="text-[11px] text-emerald font-medium mt-1 block">
            {payments.filter((p) => p.payment_status === "captured").length} verified transactions
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Pending Authorization
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">
            {formatCurrency(pendingPaise / 100)}
          </p>
          <span className="text-[11px] text-amber-300 font-medium mt-1 block">
            {payments.filter((p) => p.payment_status === "pending").length} active customer checkouts
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Total Refunded
            </span>
            <RotateCcw className="h-4 w-4 text-charcoal-muted" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">
            {formatCurrency(refundedPaise / 100)}
          </p>
          <span className="text-[11px] text-charcoal-muted font-medium mt-1 block">
            {payments.filter((p) => p.payment_status === "refunded").length} reversals processed
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              GST Collected (5%)
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">
            {formatCurrency(((totalCapturedPaise / 100) * 0.05) / 1.05)}
          </p>
          <span className="text-[11px] text-emerald-light font-medium mt-1 block">
            CGST (2.5%) + SGST (2.5%)
          </span>
        </Card>
      </div>

      {/* Razorpay Architecture & Compliance Notice */}
      <div className="rounded-xl border border-emerald/30 bg-emerald/10 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-cream">Production Razorpay Gateway Active</p>
          <p className="text-charcoal-muted leading-relaxed">
            All customer card, netbanking, and UPI transactions are signed and verified server-side with HMAC SHA256 timingSafeEqual algorithms. Webhook notifications update order records idempotently without double-charging split payers.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order #, Payment ID, Table..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Records" },
            { id: "captured", label: "Captured" },
            { id: "pending", label: "Pending" },
            { id: "refunded", label: "Refunded" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.id)}
              className="text-xs h-8 whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader className="py-4">
          <CardTitle className="text-base text-cream">Payment Settlements & Receipts</CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            All amounts displayed in Indian Rupees (INR) with server-verified timestamps
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment / Txn ID</TableHead>
                <TableHead>Order & Table</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Split</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-charcoal-muted text-xs">
                    No payment records match your search or filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => {
                  const amountRupees = p.amount_paise / 100;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => handleCopyId(p.razorpay_payment_id || p.id)}
                          className="flex items-center gap-1 text-emerald hover:text-emerald-light transition-colors text-left"
                          title="Click to copy ID"
                        >
                          <span className="truncate max-w-[120px]">
                            {p.razorpay_payment_id || p.razorpay_order_id}
                          </span>
                          {copiedId === (p.razorpay_payment_id || p.id) ? (
                            <Check className="h-3 w-3 text-emerald" />
                          ) : null}
                        </button>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-cream text-xs">{p.order_number}</div>
                        <div className="text-[10px] text-emerald font-medium">{p.table_number}</div>
                      </TableCell>

                      <TableCell className="text-xs text-charcoal-muted">
                        {p.customer_name || p.payer_name || "Guest"}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {p.split_type || "full"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-charcoal-muted">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-emerald" />
                          <span className="truncate max-w-[130px]">{p.payment_method || "Online"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-charcoal-muted whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </TableCell>

                      <TableCell>
                        {p.payment_status === "captured" && (
                          <Badge className="bg-emerald/20 text-emerald border-emerald/40 text-[10px]">
                            Captured
                          </Badge>
                        )}
                        {p.payment_status === "pending" && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                            Pending
                          </Badge>
                        )}
                        {p.payment_status === "refunded" && (
                          <Badge className="bg-charcoal-surface text-charcoal-muted border-charcoal-border text-[10px]">
                            Refunded
                          </Badge>
                        )}
                        {p.payment_status === "failed" && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
                            Failed
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-xs text-cream">
                        {formatCurrency(amountRupees)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2 text-emerald hover:text-emerald-light"
                            onClick={() => setSelectedReceipt(p)}
                          >
                            <Printer className="h-3 w-3" />
                            Receipt
                          </Button>

                          {p.payment_status === "captured" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1 px-2 text-red-400 hover:text-red-300"
                              onClick={() => {
                                setRefundCandidate(p);
                                setRefundReason("");
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      ) : (
        /* Subscription Management View */
        <div className="space-y-6">
          {/* Current Plan Overview Card */}
          <Card className="border-charcoal-border bg-charcoal-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald/20 text-emerald border-emerald/40 text-xs px-2.5 py-0.5">
                    {currentPlan.status?.toUpperCase() || "ACTIVE"}
                  </Badge>
                  <span className="text-xs text-charcoal-muted">SaaS Billing Cycle: Monthly (INR)</span>
                </div>
                <h2 className="text-2xl font-black text-cream mt-2 flex items-center gap-2">
                  <span>{currentPlan.name}</span>
                  <span className="text-lg font-bold text-emerald">
                    {currentPlan.price_inr === 0 ? "Free forever" : `₹${currentPlan.price_inr.toLocaleString("en-IN")}/mo`}
                  </span>
                </h2>
                <p className="text-xs text-charcoal-muted mt-1">
                  Enjoy seamless restaurant QR ordering, live KDS ticketing, and automated customer checkout.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleUpgradePlan("pro")}
                  disabled={isUpgrading !== null}
                  className="gap-2 border-emerald/40 text-emerald hover:bg-emerald/10"
                >
                  <Sparkles className="h-4 w-4" />
                  {currentPlan.slug === "pro" ? "Current Tier" : "Upgrade to Pro"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Resource Usage & Quota Meters */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-muted mb-3">
              Resource Usage & Quota Meters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Menu Items */}
              <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-muted">Menu Items</span>
                  <UtensilsCrossed className="h-4 w-4 text-emerald" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-cream">{planUsage.menuItems.used}</span>
                  <span className="text-xs text-charcoal-muted font-medium">/ {planUsage.menuItems.limit} items</span>
                </div>
                <div className="h-2 w-full rounded-full bg-charcoal-surface overflow-hidden">
                  <div
                    className="h-full bg-emerald transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((planUsage.menuItems.used / Math.max(1, planUsage.menuItems.limit)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-charcoal-muted">
                  {Math.round((planUsage.menuItems.used / Math.max(1, planUsage.menuItems.limit)) * 100)}% capacity utilized
                </p>
              </Card>

              {/* Restaurant Tables */}
              <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-muted">Active Tables</span>
                  <Layers className="h-4 w-4 text-emerald" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-cream">{planUsage.tables.used}</span>
                  <span className="text-xs text-charcoal-muted font-medium">/ {planUsage.tables.limit} tables</span>
                </div>
                <div className="h-2 w-full rounded-full bg-charcoal-surface overflow-hidden">
                  <div
                    className="h-full bg-emerald transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((planUsage.tables.used / Math.max(1, planUsage.tables.limit)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-charcoal-muted">
                  {Math.round((planUsage.tables.used / Math.max(1, planUsage.tables.limit)) * 100)}% tables configured
                </p>
              </Card>

              {/* Staff Members */}
              <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-muted">Staff Seats</span>
                  <Users className="h-4 w-4 text-emerald" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-cream">{planUsage.staff.used}</span>
                  <span className="text-xs text-charcoal-muted font-medium">/ {planUsage.staff.limit} seats</span>
                </div>
                <div className="h-2 w-full rounded-full bg-charcoal-surface overflow-hidden">
                  <div
                    className="h-full bg-emerald transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((planUsage.staff.used / Math.max(1, planUsage.staff.limit)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-charcoal-muted">
                  {Math.round((planUsage.staff.used / Math.max(1, planUsage.staff.limit)) * 100)}% seats occupied
                </p>
              </Card>

              {/* Orders Quota */}
              <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-muted">Orders this Month</span>
                  <Receipt className="h-4 w-4 text-emerald" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-cream">{planUsage.orders.used}</span>
                  <span className="text-xs text-charcoal-muted font-medium">/ {planUsage.orders.limit} orders</span>
                </div>
                <div className="h-2 w-full rounded-full bg-charcoal-surface overflow-hidden">
                  <div
                    className="h-full bg-emerald transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((planUsage.orders.used / Math.max(1, planUsage.orders.limit)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-charcoal-muted">
                  {Math.round((planUsage.orders.used / Math.max(1, planUsage.orders.limit)) * 100)}% monthly quota
                </p>
              </Card>
            </div>
          </div>

          {/* Pricing Tiers Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-muted mb-3">
              Available SaaS Subscription Plans
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  slug: "free",
                  name: "Starter Free",
                  price: "₹0",
                  period: "forever",
                  description: "Best for small cafes or pop-up stalls getting started.",
                  limits: ["25 Menu Items", "5 Tables", "2 Staff Seats", "100 Orders/mo"],
                  features: ["Digital QR Menu", "Basic Kitchen View", "Mobile Ordering"],
                },
                {
                  slug: "basic",
                  name: "Growth Basic",
                  price: "₹999",
                  period: "/month",
                  description: "Great for quick service outlets and busy bistros.",
                  limits: ["75 Menu Items", "15 Tables", "5 Staff Seats", "600 Orders/mo"],
                  features: ["NFC & Print Sheets", "Interactive KDS", "Staff RBAC", "Razorpay Invoicing"],
                },
                {
                  slug: "pro",
                  name: "Professional",
                  price: "₹2,499",
                  period: "/month",
                  popular: true,
                  description: "For high-volume fine dining and full-service restaurants.",
                  limits: ["250 Menu Items", "50 Tables", "20 Staff Seats", "3,000 Orders/mo"],
                  features: [
                    "Everything in Growth",
                    "Audio Kitchen Chimes",
                    "Advanced GST Reports",
                    "Custom Brand Identity",
                    "Realtime Multi-Device Sync",
                  ],
                },
                {
                  slug: "enterprise",
                  name: "Enterprise Multi-Outlet",
                  price: "₹5,999",
                  period: "/month",
                  description: "For chains, multi-outlet dining groups and franchises.",
                  limits: ["1,000 Menu Items", "200 Tables", "100 Staff Seats", "20,000 Orders/mo"],
                  features: [
                    "Multi-Location Dashboard",
                    "Hardware POS Bridge",
                    "Dedicated SLA Support",
                    "Full Audit Trails",
                  ],
                },
              ].map((tier) => {
                const isCurrent = currentPlan.slug === tier.slug;
                return (
                  <Card
                    key={tier.slug}
                    className={`border p-5 flex flex-col justify-between transition-all ${
                      tier.popular
                        ? "border-emerald bg-charcoal-card ring-1 ring-emerald shadow-lg"
                        : "border-charcoal-border bg-charcoal-card"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-cream">{tier.name}</span>
                        {tier.popular && (
                          <Badge className="bg-emerald text-white text-[10px] px-2 py-0.5">
                            Recommended
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="bg-emerald/20 text-emerald text-[10px] px-2 py-0.5">
                            Active Plan
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-cream">{tier.price}</span>
                        <span className="text-xs text-charcoal-muted">{tier.period}</span>
                      </div>
                      <p className="text-xs text-charcoal-muted mt-2">{tier.description}</p>

                      <div className="mt-4 pt-4 border-t border-charcoal-border space-y-2">
                        <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                          Resource Limits
                        </span>
                        {tier.limits.map((lim, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-cream">
                            <Check className="h-3.5 w-3.5 text-emerald shrink-0" />
                            <span>{lim}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-charcoal-border space-y-1.5">
                        <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                          Key Features
                        </span>
                        {tier.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                            <CheckCircle2 className="h-3 w-3 text-emerald/60 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        size="sm"
                        disabled={isCurrent || isUpgrading !== null}
                        onClick={() => handleUpgradePlan(tier.slug)}
                        className={`w-full text-xs font-semibold ${
                          isCurrent
                            ? "bg-charcoal-surface text-charcoal-muted border border-charcoal-border"
                            : tier.popular
                            ? "bg-emerald text-white hover:bg-emerald-light"
                            : "bg-charcoal-surface text-cream hover:bg-charcoal-border"
                        }`}
                      >
                        {isUpgrading === tier.slug ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrent ? (
                          "Current Plan"
                        ) : (
                          <>
                            Switch to {tier.name}
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice & Digital Receipt Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <div id="printable-receipt" className="space-y-4 text-xs font-sans">
              {/* Receipt Header */}
              <div className="text-center border-b border-charcoal-border pb-4">
                <h3 className="text-lg font-black tracking-wider text-emerald uppercase">
                  {restaurantName}
                </h3>
                <p className="text-[11px] text-charcoal-muted">
                  Official Digital Dining Tax Invoice
                </p>
                <p className="text-[11px] text-charcoal-muted font-mono mt-0.5">
                  GSTIN: 27AAAAA0000A1Z5 | FSSAI: 11521018000123
                </p>
                <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald/10 text-emerald text-[10px] font-semibold">
                  Official GST Tax Invoice
                </div>
              </div>

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-charcoal-border">
                <div>
                  <span className="text-charcoal-muted">Invoice No:</span>
                  <p className="font-mono font-bold text-cream">INV-{selectedReceipt.order_number?.replace("#", "")}</p>
                </div>
                <div className="text-right">
                  <span className="text-charcoal-muted">Date & Time:</span>
                  <p className="text-cream">{formatDate(selectedReceipt.created_at)}</p>
                </div>
                <div>
                  <span className="text-charcoal-muted">Table / Zone:</span>
                  <p className="font-bold text-emerald">{selectedReceipt.table_number || "Takeaway"}</p>
                </div>
                <div className="text-right">
                  <span className="text-charcoal-muted">Customer:</span>
                  <p className="font-medium text-cream">{selectedReceipt.customer_name || "Guest"}</p>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="space-y-1.5 py-2">
                <div className="flex justify-between text-charcoal-muted">
                  <span>Net Item Subtotal:</span>
                  <span className="font-mono text-cream">
                    {formatCurrency(selectedReceipt.subtotal || selectedReceipt.amount_paise / 100 / 1.05)}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>Central GST (CGST @ 2.5%):</span>
                  <span className="font-mono text-cream">
                    {formatCurrency((selectedReceipt.tax_amount || (selectedReceipt.amount_paise / 100) * 0.05) / 2)}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>State GST (SGST @ 2.5%):</span>
                  <span className="font-mono text-cream">
                    {formatCurrency((selectedReceipt.tax_amount || (selectedReceipt.amount_paise / 100) * 0.05) / 2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-cream border-t border-charcoal-border pt-2">
                  <span>Total Paid (INR):</span>
                  <span className="font-mono text-emerald">
                    {formatCurrency(selectedReceipt.amount_paise / 100)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3 rounded-lg bg-charcoal-surface border border-charcoal-border space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Payment Method:</span>
                  <span className="font-medium text-cream">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Razorpay Payment ID:</span>
                  <span className="font-mono text-[10px] text-emerald truncate max-w-[180px]">
                    {selectedReceipt.razorpay_payment_id || selectedReceipt.razorpay_order_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Split Strategy:</span>
                  <span className="uppercase font-mono text-[10px] text-cream">
                    {selectedReceipt.split_type || "Full Bill"}
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-charcoal-muted pt-2 border-t border-charcoal-border">
                Thank you for dining at {restaurantName}. Generated electronically.
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button size="sm" onClick={handlePrintReceipt} className="gap-2">
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Refund Confirmation Modal */}
      {refundCandidate && (
        <Dialog open={!!refundCandidate} onOpenChange={() => setRefundCandidate(null)}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                Issue Payment Refund
              </DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                This will trigger a refund for transaction {refundCandidate.razorpay_payment_id || refundCandidate.id} and update the order ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-charcoal-surface border border-charcoal-border flex justify-between items-center">
                <span className="text-charcoal-muted">Refund Amount:</span>
                <span className="text-lg font-bold text-cream font-mono">
                  {formatCurrency(refundCandidate.amount_paise / 100)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Refund Reason</label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer cancelled dish, billing error"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setRefundCandidate(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleProcessRefund}
                disabled={refundLoading}
              >
                {refundLoading ? "Processing Refund..." : "Confirm & Refund"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
