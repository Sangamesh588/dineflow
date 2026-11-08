"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Order, OrderStatus } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ClipboardList,
  Clock,
  Eye,
  Volume2,
  VolumeX,
  Search,
  LayoutGrid,
  List,
  User,
  Phone,
} from "lucide-react";

export default function OrdersDashboardPage() {
  const isConfigured = isSupabaseConfigured();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Sound chime settings
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Selected Order for Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Synthesize an audio notification chime using Web Audio API
  const playOrderChime = useCallback(() => {
    if (isSoundMuted || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio autoplay restrictions
    }
  }, [isSoundMuted]);

  // Load orders & subscribe to Supabase Realtime
  useEffect(() => {
    if (!isConfigured) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const supabase = createClient();

    async function setupRealtime() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: member } = await supabase
            .from("restaurant_members")
            .select("restaurant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (member?.restaurant_id) {
            setRestaurantId(member.restaurant_id);

            // Fetch recent orders
            const { data: orderData } = await supabase
              .from("orders")
              .select("*, items:order_items(*)")
              .eq("restaurant_id", member.restaurant_id)
              .order("created_at", { ascending: false });

            if (orderData) {
              setOrders(orderData);
            } else {
              setOrders([]);
            }

            // Realtime subscription scoped to restaurant_id
            channel = supabase
              .channel(`orders_realtime_${member.restaurant_id}`)
              .on(
                "postgres_changes",
                {
                  event: "INSERT",
                  schema: "public",
                  table: "orders",
                  filter: `restaurant_id=eq.${member.restaurant_id}`,
                },
                (payload) => {
                  playOrderChime();
                  setOrders((prev) => [payload.new as Order, ...prev]);
                }
              )
              .on(
                "postgres_changes",
                {
                  event: "UPDATE",
                  schema: "public",
                  table: "orders",
                  filter: `restaurant_id=eq.${member.restaurant_id}`,
                },
                (payload) => {
                  setOrders((prev) =>
                    prev.map((o) => (o.id === payload.new.id ? { ...o, ...(payload.new as Order) } : o))
                  );
                }
              )
              .subscribe();
          }
        }
      } catch (err) {
        console.error("Error connecting Realtime orders:", err);
      }
    }

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isConfigured, playOrderChime]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        const currentOrder = orders.find((o) => o.id === orderId);
        await supabase
          .from("orders")
          .update({ order_status: nextStatus })
          .eq("id", orderId);

        await supabase.from("order_status_history").insert({
          order_id: orderId,
          from_status: currentOrder?.order_status || null,
          to_status: nextStatus,
          metadata: { updated_from: "orders_dashboard" },
        });
      } catch (err) {
        console.error("Error updating order status in Supabase:", err);
      }
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: nextStatus } : o))
    );

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, order_status: nextStatus } : null));
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" ? true : o.order_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const orderStatusBadgeClasses: Record<OrderStatus, string> = {
    pending: "border-amber-500/50 bg-amber-500/20 text-amber-300 animate-pulse",
    accepted: "border-blue-500/50 bg-blue-500/20 text-blue-300",
    preparing: "border-orange-500/50 bg-orange-500/20 text-orange-300",
    ready: "border-emerald/50 bg-emerald/20 text-emerald-light font-bold",
    served: "border-purple-500/50 bg-purple-500/20 text-purple-300",
    completed: "border-charcoal-muted bg-charcoal-surface text-charcoal-muted",
    cancelled: "border-red-500/50 bg-red-950/40 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Audio Chime & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-emerald" />
            Live Restaurant Orders
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Real-time table orders, KDS sync, payment status, and table fulfillment
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Mute Button */}
          <button
            onClick={() => {
              setIsSoundMuted(!isSoundMuted);
              if (isSoundMuted) playOrderChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isSoundMuted
                ? "border-charcoal-border bg-charcoal-surface text-charcoal-muted"
                : "border-emerald/40 bg-emerald/10 text-emerald"
            }`}
            title={isSoundMuted ? "Unmute Order Chimes" : "Mute Order Chimes"}
          >
            {isSoundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span>{isSoundMuted ? "Chime Muted" : "Chime Active"}</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-charcoal-border bg-charcoal p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md ${viewMode === "card" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md ${viewMode === "table" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <Card className="border-charcoal-border bg-charcoal-card p-3 sm:p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
            <Input
              placeholder="Search by order # or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-charcoal text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {["all", "pending", "accepted", "preparing", "ready", "served", "completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-emerald text-cream"
                    : "bg-charcoal text-charcoal-muted hover:text-cream border border-charcoal-border"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Orders Display */}
      {filteredOrders.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-charcoal-card rounded-2xl border border-charcoal-border">
          <ClipboardList className="h-10 w-10 text-charcoal-muted mx-auto" />
          <p className="text-base font-semibold text-cream">No matching orders</p>
          <p className="text-xs text-charcoal-muted">All active tickets have been fulfilled or filtered.</p>
        </div>
      ) : viewMode === "card" ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            return (
              <Card
                key={order.id}
                className="border border-charcoal-border bg-charcoal-card flex flex-col justify-between hover:border-emerald/40 transition-all shadow-md"
              >
                <CardHeader className="p-4 pb-2 border-b border-charcoal-border/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-cream">
                          {order.order_number}
                        </span>
                        <span className="rounded bg-emerald/10 border border-emerald/30 px-2 py-0.5 text-xs font-bold text-emerald font-mono">
                          T-02
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>3 mins ago</span>
                        {order.customer_name && <span>• {order.customer_name}</span>}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`capitalize text-[11px] ${orderStatusBadgeClasses[order.order_status]}`}
                    >
                      {order.order_status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-2.5 flex-1">
                  {/* Items preview list */}
                  <div className="space-y-1.5 text-xs">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-cream">
                          <strong className="text-emerald">{item.quantity}x</strong>{" "}
                          {item.item_name_snapshot}
                        </span>
                        <span className="text-charcoal-muted">
                          {formatCurrency(item.item_total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <p className="text-[11px] text-amber-300 italic bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
                      Note: {order.special_instructions}
                    </p>
                  )}

                  <div className="pt-2 border-t border-charcoal-border/50 flex items-center justify-between text-xs">
                    <span className="text-charcoal-muted">Total:</span>
                    <span className="font-extrabold text-sm text-cream">
                      {formatCurrency(order.grand_total)}
                    </span>
                  </div>
                </CardContent>

                {/* Status action buttons */}
                <div className="p-3 pt-0 border-t border-charcoal-border/60 flex items-center justify-between gap-2 mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="text-xs text-charcoal-muted hover:text-cream h-8"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {order.order_status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "accepted")}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        Accept
                      </Button>
                    )}
                    {order.order_status === "accepted" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "preparing")}
                        className="h-8 text-xs bg-orange-600 hover:bg-orange-700"
                      >
                        Start Prep
                      </Button>
                    )}
                    {order.order_status === "preparing" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "ready")}
                        className="h-8 text-xs bg-emerald hover:bg-emerald-hover"
                      >
                        Mark Ready
                      </Button>
                    )}
                    {order.order_status === "ready" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "served")}
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                      >
                        Serve
                      </Button>
                    )}
                    {order.order_status === "served" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                        className="h-8 text-xs"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-bold text-cream">
                      {o.order_number}
                    </TableCell>
                    <TableCell className="font-bold text-emerald">T-02</TableCell>
                    <TableCell className="text-xs text-cream">{o.customer_name || "Guest"}</TableCell>
                    <TableCell className="text-xs text-charcoal-muted">
                      {o.items?.length || 0} items
                    </TableCell>
                    <TableCell className="font-bold text-cream">
                      {formatCurrency(o.grand_total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold ${
                          o.payment_status === "paid" ? "text-emerald" : "text-amber-400"
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[11px] ${orderStatusBadgeClasses[o.order_status]}`}>
                        {o.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(o)}
                        className="h-8 text-xs text-emerald"
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 4. ORDER DETAIL DRAWER DIALOG */}
      <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order {selectedOrder?.order_number}</span>
              <span className="text-sm font-bold text-emerald">Table T-02</span>
            </DialogTitle>
            <DialogDescription>
              Placed {selectedOrder?.created_at ? new Date(selectedOrder.created_at).toLocaleTimeString() : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs">
              {/* Customer info */}
              <div className="p-3 rounded-xl bg-charcoal border border-charcoal-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald" />
                  <span className="font-semibold text-cream">{selectedOrder.customer_name || "Guest"}</span>
                </div>
                {selectedOrder.customer_phone && (
                  <span className="text-charcoal-muted flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3" /> {selectedOrder.customer_phone}
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 border-y border-charcoal-border py-3">
                <p className="font-bold text-cream uppercase tracking-wider text-[11px]">
                  Dishes & Portions
                </p>
                {selectedOrder.items?.map((it, i) => (
                  <div key={i} className="flex justify-between border-b border-charcoal-border/40 pb-2 last:border-0">
                    <div>
                      <p className="font-bold text-cream">
                        {it.quantity}x {it.item_name_snapshot}
                      </p>
                      {it.variant_snapshot && (
                        <p className="text-[11px] text-emerald">Portion: {it.variant_snapshot.name}</p>
                      )}
                      {it.addons_snapshot && it.addons_snapshot.length > 0 && (
                        <p className="text-[10px] text-charcoal-muted">
                          Extras: {it.addons_snapshot.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-cream">{formatCurrency(it.item_total)}</span>
                  </div>
                ))}
              </div>

              {selectedOrder.special_instructions && (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-300">
                  <strong>Kitchen Note:</strong> {selectedOrder.special_instructions}
                </div>
              )}

              {/* Financials */}
              <div className="p-3 rounded-xl bg-charcoal border border-charcoal-border space-y-1">
                <div className="flex justify-between text-charcoal-muted">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-cream border-t border-charcoal-border/50 pt-1">
                  <span>Grand Total:</span>
                  <span className="text-emerald">{formatCurrency(selectedOrder.grand_total)}</span>
                </div>
              </div>

              {/* Status Update Pipeline */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-cream uppercase tracking-wider">
                  Transition Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={selectedOrder.order_status === "accepted" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "accepted")}
                    className="text-xs"
                  >
                    Accepted
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedOrder.order_status === "preparing" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "preparing")}
                    className="text-xs"
                  >
                    Preparing
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedOrder.order_status === "ready" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "ready")}
                    className="text-xs"
                  >
                    Ready
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedOrder.order_status === "served" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "served")}
                    className="text-xs"
                  >
                    Served
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedOrder.order_status === "completed" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}
                    className="text-xs"
                  >
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "cancelled")}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
