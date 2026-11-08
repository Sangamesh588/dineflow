"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Restaurant } from "@/types";
import {
  TrendingUp,
  Receipt,
  Armchair,
  ShoppingBag,
  ExternalLink,
  Plus,
  Sparkles,
} from "lucide-react";

interface RecentOrderItem {
  id: string;
  table: string;
  items: string;
  total: number;
  status: string;
  time: string;
}

interface PopularDishItem {
  name: string;
  orders: number;
  revenue: number;
  category: string;
}

export default function DashboardOverviewPage() {
  const isConfigured = isSupabaseConfigured();
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  
  // Real dashboard metrics
  const [revenue, setRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeTables, setActiveTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  // Dynamic order metrics
  const [recentOrders, setRecentOrders] = useState<RecentOrderItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularDishItem[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    cooking: 0,
    ready: 0,
    served: 0,
    billed: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!isConfigured) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: member } = await supabase
            .from("restaurant_members")
            .select("restaurant:restaurants(*)")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (member && member.restaurant) {
            const rest = member.restaurant as unknown as Restaurant;
            setRestaurantName(rest.name || "Restaurant");
            setRestaurantSlug(rest.slug || "");

            // 1. Fetch real orders for this restaurant
            const { data: ordersData } = await supabase
              .from("orders")
              .select("*, table:restaurant_tables(table_number), items:order_items(item_name_snapshot, quantity, unit_price)")
              .eq("restaurant_id", rest.id)
              .order("created_at", { ascending: false });

            // 2. Fetch real tables for this restaurant
            const { data: tablesData } = await supabase
              .from("restaurant_tables")
              .select("id, status")
              .eq("restaurant_id", rest.id);

            const tables = tablesData || [];
            setTotalTables(tables.length);
            setActiveTables(tables.filter((t) => t.status === "occupied").length);

            const orders = ordersData || [];
            setTotalOrders(orders.length);

            const totalRev = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
            setRevenue(totalRev);
            setAvgOrderValue(orders.length > 0 ? Math.round(totalRev / orders.length) : 0);

            // Tally status counts
            const counts = { cooking: 0, ready: 0, served: 0, billed: 0 };
            orders.forEach((o) => {
              if (o.order_status === "preparing") counts.cooking++;
              else if (o.order_status === "ready") counts.ready++;
              else if (o.order_status === "served") counts.served++;
              else if (o.order_status === "completed" || o.payment_status === "paid") counts.billed++;
            });
            setStatusCounts(counts);

            // Map recent orders
            const mappedOrders: RecentOrderItem[] = orders.slice(0, 5).map((o) => {
              const tableNum = (o.table as { table_number?: string } | null)?.table_number;
              const tableText = tableNum ? `Table ${tableNum}` : (o.table_id || "Counter");
              const itemsList = Array.isArray(o.items) && o.items.length > 0
                ? o.items.map((i: { quantity?: number; item_name_snapshot?: string }) => `${i.quantity || 1}x ${i.item_name_snapshot || "Item"}`).join(", ")
                : "Dining Order";
              
              const d = new Date(o.created_at);
              const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return {
                id: o.id,
                table: tableText,
                items: itemsList,
                total: Number(o.grand_total || 0),
                status: o.order_status,
                time: timeStr,
              };
            });
            setRecentOrders(mappedOrders);

            // Compute popular items
            const dishMap = new Map<string, PopularDishItem>();
            orders.forEach((o) => {
              if (Array.isArray(o.items)) {
                o.items.forEach((item: { item_name_snapshot?: string; quantity?: number; unit_price?: number }) => {
                  const name = item.item_name_snapshot || "Item";
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.unit_price || 0);
                  const existing = dishMap.get(name) || { name, orders: 0, revenue: 0, category: "Menu Item" };
                  existing.orders += qty;
                  existing.revenue += qty * price;
                  dishMap.set(name, existing);
                });
              }
            });
            const topDishes = Array.from(dishMap.values())
              .sort((a, b) => b.orders - a.orders)
              .slice(0, 4);
            setPopularItems(topDishes);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic dashboard metrics:", err);
      }
    }

    loadData();
  }, [isConfigured]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight">
            Restaurant Operations Overview
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Real-time table orders, digital menu performance, and revenue for <span className="text-cream font-semibold">{restaurantName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {restaurantSlug ? (
            <Link href={`/menu/${restaurantSlug}`} target="_blank">
              <Button variant="secondary" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4 text-emerald" />
                Open Customer Menu
              </Button>
            </Link>
          ) : null}
          <Link href="/dashboard/menu">
            <Button size="sm" className="gap-2 bg-emerald text-white hover:bg-emerald/90">
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
              Total Revenue
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-cream">
              {formatCurrency(revenue)}
            </div>
            <p className="text-xs text-charcoal-muted mt-1.5 flex items-center gap-1 font-medium">
              Live settlement revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
              Total Orders
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-cream">
              {totalOrders}
            </div>
            <p className="text-xs text-charcoal-muted mt-1.5">
              {totalOrders === 0 ? "Awaiting customer orders" : `${totalOrders} orders recorded`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
              Active Tables
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
              <Armchair className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-cream">
              {activeTables} <span className="text-sm font-normal text-charcoal-muted">/ {totalTables}</span>
            </div>
            <p className="text-xs text-charcoal-muted mt-1.5 font-medium">
              {totalTables === 0 ? "No tables configured" : `${activeTables} tables currently occupied`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
              Avg. Order Value
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-cream">
              {formatCurrency(avgOrderValue)}
            </div>
            <p className="text-xs text-charcoal-muted mt-1.5 font-medium">
              Per dining order average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Orders Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-charcoal-border bg-charcoal-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-cream">Dining Service Highlights</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Digital QR ordering and table turn-around metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-charcoal border border-charcoal-border space-y-1">
                <span className="text-xs text-charcoal-muted uppercase font-semibold">Configured Tables</span>
                <p className="text-xl font-bold text-cream">{totalTables} Tables</p>
                <p className="text-[11px] text-charcoal-muted">Ready for QR / NFC scanning</p>
              </div>
              <div className="p-4 rounded-lg bg-charcoal border border-charcoal-border space-y-1">
                <span className="text-xs text-charcoal-muted uppercase font-semibold">Active Kitchen Load</span>
                <p className="text-xl font-bold text-amber-400">{statusCounts.cooking} Cooking</p>
                <p className="text-[11px] text-charcoal-muted">Dishes in preparation</p>
              </div>
            </div>
            {totalOrders === 0 && (
              <div className="p-4 rounded-lg border border-emerald/20 bg-emerald/5 text-xs text-emerald space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Your Restaurant is Live
                </p>
                <p className="text-charcoal-muted">
                  Generate table QR codes from <Link href="/dashboard/tables" className="text-emerald underline font-medium">Tables Management</Link> to start taking instant digital orders from dining guests.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Summary */}
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader>
            <CardTitle className="text-lg text-cream">Live Orders Pipeline</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Current kitchen and floor fulfillment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal border border-charcoal-border">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-cream">Kitchen Cooking</span>
              </div>
              <span className="text-xs font-bold text-amber-400">{statusCounts.cooking} Orders</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal border border-charcoal-border">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald" />
                <span className="text-xs font-medium text-cream">Ready to Serve</span>
              </div>
              <span className="text-xs font-bold text-emerald">{statusCounts.ready} Orders</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal border border-charcoal-border">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-xs font-medium text-cream">Served at Table</span>
              </div>
              <span className="text-xs font-bold text-blue-400">{statusCounts.served} Orders</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal border border-charcoal-border">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-charcoal-muted" />
                <span className="text-xs font-medium text-cream">Completed / Paid</span>
              </div>
              <span className="text-xs font-bold text-charcoal-muted">{statusCounts.billed} Orders</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Orders Table & Top Menu Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2 border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-cream">Recent Dining Table Orders</CardTitle>
              <CardDescription className="text-xs text-charcoal-muted">
                Live stream of guest orders via QR codes
              </CardDescription>
            </div>
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm" className="text-xs text-emerald hover:text-emerald-light">
                View All Orders →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-charcoal-muted space-y-1">
                <p className="font-semibold text-cream">No dining orders placed yet</p>
                <p>When guests scan your table QR codes and order, tickets will stream here in real time.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Items Ordered</TableHead>
                    <TableHead>Total (INR)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold text-emerald text-xs">
                        {order.table}
                      </TableCell>
                      <TableCell className="text-xs text-charcoal-muted max-w-xs truncate">
                        {order.items}
                      </TableCell>
                      <TableCell className="font-medium text-cream text-xs">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "preparing"
                              ? "outline"
                              : order.status === "ready"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-charcoal-muted">
                        {order.time}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Popular Food Items */}
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-cream">Popular Dishes</CardTitle>
              <CardDescription className="text-xs text-charcoal-muted">
                Top sellers by order count
              </CardDescription>
            </div>
            <Link href="/dashboard/menu">
              <Button variant="ghost" size="sm" className="text-xs text-emerald">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {popularItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-charcoal-muted space-y-1">
                <p className="font-semibold text-cream">No dishes ordered yet</p>
                <p>Dish popularity rankings will update as diners place orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {popularItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal/60 border border-charcoal-border"
                  >
                    <div className="truncate mr-2">
                      <p className="text-xs font-semibold text-cream truncate">{item.name}</p>
                      <p className="text-[11px] text-charcoal-muted">{item.category} • {item.orders} orders</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-cream">{formatCurrency(item.revenue)}</p>
                      <span className="text-[9px] text-emerald font-semibold">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
