"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Flame,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";

interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableNumber: string;
  status: "new" | "accepted" | "preparing" | "ready";
  items: { name: string; quantity: number; variant?: string; notes?: string }[];
  elapsedMinutes: number;
}

export default function KitchenKdsPage() {
  const isConfigured = isSupabaseConfigured();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Play KDS bell sound via Web Audio API
  const playKdsBell = () => {
    if (isAudioMuted || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio autoplay policy
    }
  };

  // Fetch live kitchen tickets from Supabase
  useEffect(() => {
    if (!isConfigured) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const supabase = createClient();

    async function loadKitchenOrders() {
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
            const { data: orders } = await supabase
              .from("orders")
              .select("*, table:restaurant_tables(table_number), items:order_items(*)")
              .eq("restaurant_id", member.restaurant_id)
              .in("order_status", ["pending", "placed", "accepted", "preparing", "ready"])
              .order("created_at", { ascending: true });

            if (orders) {
              const mapped: KitchenTicket[] = orders.map((o) => {
                let mappedStatus: KitchenTicket["status"] = "new";
                if (o.order_status === "accepted") mappedStatus = "accepted";
                else if (o.order_status === "preparing") mappedStatus = "preparing";
                else if (o.order_status === "ready") mappedStatus = "ready";

                const elapsed = Math.max(0, Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000));
                const tableText = (o.table as { table_number?: string } | null)?.table_number
                  ? `T-${(o.table as { table_number?: string }).table_number}`
                  : (o.table_id || "Counter");

                const itemsList = Array.isArray(o.items)
                  ? o.items.map((i: { item_name_snapshot?: string; quantity?: number; special_instructions?: string }) => ({
                      name: i.item_name_snapshot || "Item",
                      quantity: Number(i.quantity || 1),
                      notes: i.special_instructions || undefined,
                    }))
                  : [];

                return {
                  id: o.id,
                  orderNumber: o.order_number,
                  tableNumber: tableText,
                  status: mappedStatus,
                  items: itemsList,
                  elapsedMinutes: elapsed,
                };
              });

              setTickets(mapped);
            }

            // Realtime updates
            channel = supabase
              .channel(`kds_realtime_${member.restaurant_id}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "orders",
                  filter: `restaurant_id=eq.${member.restaurant_id}`,
                },
                () => {
                  loadKitchenOrders();
                }
              )
              .subscribe();
          }
        }
      } catch (err) {
        console.warn("Could not load KDS tickets:", err);
      }
    }

    loadKitchenOrders();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isConfigured]);

  // Timer increment
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => ({ ...t, elapsedMinutes: t.elapsedMinutes + 1 }))
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvanceStatus = async (id: string, current: KitchenTicket["status"]) => {
    playKdsBell();
    const nextStatusMap: Record<KitchenTicket["status"], KitchenTicket["status"] | "dispatched"> = {
      new: "accepted",
      accepted: "preparing",
      preparing: "ready",
      ready: "dispatched",
    };

    const next = nextStatusMap[current];
    if (next === "dispatched") {
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (isConfigured) {
        try {
          const supabase = createClient();
          await supabase.from("orders").update({ order_status: "served" }).eq("id", id);
        } catch {
          // Non-critical update
        }
      }
    } else {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: next } : t))
      );
      if (isConfigured) {
        try {
          const supabase = createClient();
          await supabase.from("orders").update({ order_status: next }).eq("id", id);
        } catch {
          // Non-critical update
        }
      }
    }
  };

  const columns: { key: KitchenTicket["status"]; title: string; badgeColor: string }[] = [
    { key: "new", title: "New Orders", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    { key: "accepted", title: "Accepted", badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { key: "preparing", title: "Cooking on Line", badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
    { key: "ready", title: "Ready for Floor", badgeColor: "bg-emerald/20 text-emerald-light border-emerald/40" },
  ];

  const getTimerClass = (minutes: number) => {
    if (minutes > 20) return "text-red-400 bg-red-950/40 border-red-800/50 animate-pulse";
    if (minutes > 10) return "text-amber-400 bg-amber-950/40 border-amber-800/50";
    return "text-emerald bg-emerald/10 border-emerald/30";
  };

  return (
    <div className="space-y-6">
      {/* 1. KDS Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Flame className="h-7 w-7 text-emerald" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Real-time digital ticket dispatch for line chefs, prep timers and expediting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="text-xs border-charcoal-border text-cream gap-1.5"
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="h-4 w-4 text-red-400" />
                Muted
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-emerald" />
                Sound Alerts Active
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Four Column Kitchen Flow Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className="rounded-2xl border border-charcoal-border bg-charcoal/40 p-3 space-y-3 min-h-[450px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-charcoal-border">
                <span className="font-extrabold text-xs uppercase tracking-wider text-cream">
                  {col.title}
                </span>
                <Badge className={`text-xs px-2 py-0.5 ${col.badgeColor}`}>
                  {colTickets.length}
                </Badge>
              </div>

              {/* Tickets list */}
              <div className="space-y-3">
                {colTickets.length === 0 ? (
                  <div className="h-36 rounded-xl border border-dashed border-charcoal-border/50 flex items-center justify-center text-xs text-charcoal-muted text-center p-3">
                    No tickets in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="border-2 border-charcoal-border bg-charcoal-card flex flex-col justify-between shadow-lg hover:border-charcoal-muted transition-all"
                    >
                      <CardHeader className="p-3.5 pb-2 border-b border-charcoal-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-cream font-mono">
                            {ticket.tableNumber}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald">
                            {ticket.orderNumber}
                          </span>
                        </div>

                        {/* Prep Elapsed Timer */}
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold ${getTimerClass(
                              ticket.elapsedMinutes
                            )}`}
                          >
                            <Clock className="h-3 w-3" />
                            {ticket.elapsedMinutes} mins ago
                          </span>

                          <span className="text-[10px] text-charcoal-muted uppercase">
                            {ticket.items.length} items
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 space-y-2.5 flex-1">
                        <ul className="space-y-2 text-xs">
                          {ticket.items.map((it, i) => (
                            <li key={i} className="border-b border-charcoal-border/40 pb-2 last:border-0">
                              <div className="flex items-baseline justify-between">
                                <span className="font-bold text-cream text-sm">
                                  <strong className="text-emerald">{it.quantity}x</strong> {it.name}
                                </span>
                              </div>
                              {it.variant && (
                                <span className="text-[11px] text-charcoal-muted block">
                                  Size: {it.variant}
                                </span>
                              )}
                              {it.notes && (
                                <p className="text-[11px] text-amber-300 italic font-medium mt-0.5">
                                  Note: {it.notes}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      {/* Ticket Action Button */}
                      <div className="p-3 pt-0 border-t border-charcoal-border/50">
                        <Button
                          onClick={() => handleAdvanceStatus(ticket.id, ticket.status)}
                          className={`w-full h-9 text-xs font-bold transition-all ${
                            ticket.status === "new"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : ticket.status === "accepted"
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : ticket.status === "preparing"
                              ? "bg-emerald hover:bg-emerald/90 text-cream"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          }`}
                        >
                          {ticket.status === "new" && "Accept Order →"}
                          {ticket.status === "accepted" && "Start Cooking →"}
                          {ticket.status === "preparing" && "Mark Ready →"}
                          {ticket.status === "ready" && "Clear & Dispatch to Floor ✓"}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
