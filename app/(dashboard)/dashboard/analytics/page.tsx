"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  ArrowUpRight,
  Download,
  UtensilsCrossed,
  CreditCard,
  Clock,
  CheckCircle2,
  Percent,
} from "lucide-react";

type TimeRange = "today" | "yesterday" | "7d" | "30d" | "month" | "all";

interface TopDish {
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
  marginPercent: number;
}

interface HourlySlot {
  hour: string;
  orders: number;
  revenue: number;
}

export default function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Dataset modeled for each timeframe
  const dataByRange: Record<
    TimeRange,
    {
      grossSales: number;
      netCollections: number;
      completedOrders: number;
      aov: number;
      avgDiningMins: number;
      gstCollected: number;
      topDishes: TopDish[];
      hourly: HourlySlot[];
      categoryShare: { name: string; percent: number; amount: number }[];
      paymentBreakdown: { method: string; percent: number; amount: number }[];
    }
  > = {
    today: {
      grossSales: 48920,
      netCollections: 46800,
      completedOrders: 58,
      aov: 843,
      avgDiningMins: 38,
      gstCollected: 2329,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 28, revenue: 12600, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 24, revenue: 9360, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 56, revenue: 5040, marginPercent: 86 },
        { name: "Dal Makhani", category: "Mains", quantitySold: 19, revenue: 6460, marginPercent: 81 },
        { name: "Mango Lassi", category: "Beverages", quantitySold: 32, revenue: 4800, marginPercent: 88 },
      ],
      hourly: [
        { hour: "12 PM", orders: 8, revenue: 6400 },
        { hour: "1 PM", orders: 14, revenue: 11900 },
        { hour: "2 PM", orders: 11, revenue: 8800 },
        { hour: "3 PM", orders: 3, revenue: 2100 },
        { hour: "7 PM", orders: 7, revenue: 6100 },
        { hour: "8 PM", orders: 15, revenue: 13620 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 58, amount: 28373 },
        { name: "Starters & Kebabs", percent: 22, amount: 10762 },
        { name: "Beverages & Cocktails", percent: 12, amount: 5870 },
        { name: "Artisanal Breads & Sides", percent: 8, amount: 3915 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 68, amount: 31824 },
        { method: "Credit / Debit Cards", percent: 24, amount: 11232 },
        { method: "Netbanking", percent: 5, amount: 2340 },
        { method: "Cash / Counter", percent: 3, amount: 1404 },
      ],
    },
    yesterday: {
      grossSales: 62450,
      netCollections: 60200,
      completedOrders: 74,
      aov: 844,
      avgDiningMins: 41,
      gstCollected: 2973,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 36, revenue: 16200, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 31, revenue: 12090, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 72, revenue: 6480, marginPercent: 86 },
        { name: "Tandoori Chicken Tikka", category: "Starters", quantitySold: 22, revenue: 8580, marginPercent: 69 },
        { name: "Gulab Jamun Flambé", category: "Desserts", quantitySold: 25, revenue: 4750, marginPercent: 78 },
      ],
      hourly: [
        { hour: "12 PM", orders: 9, revenue: 7650 },
        { hour: "1 PM", orders: 16, revenue: 13920 },
        { hour: "2 PM", orders: 12, revenue: 10080 },
        { hour: "7 PM", orders: 11, revenue: 9570 },
        { hour: "8 PM", orders: 18, revenue: 15300 },
        { hour: "9 PM", orders: 8, revenue: 5930 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 55, amount: 34347 },
        { name: "Starters & Kebabs", percent: 25, amount: 15612 },
        { name: "Beverages & Cocktails", percent: 11, amount: 6870 },
        { name: "Artisanal Breads & Sides", percent: 9, amount: 5621 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 71, amount: 42742 },
        { method: "Credit / Debit Cards", percent: 22, amount: 13244 },
        { method: "Netbanking", percent: 4, amount: 2408 },
        { method: "Cash / Counter", percent: 3, amount: 1806 },
      ],
    },
    "7d": {
      grossSales: 384500,
      netCollections: 372100,
      completedOrders: 452,
      aov: 851,
      avgDiningMins: 39,
      gstCollected: 18305,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 224, revenue: 100800, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 188, revenue: 73320, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 410, revenue: 36900, marginPercent: 86 },
        { name: "Dal Makhani", category: "Mains", quantitySold: 145, revenue: 49300, marginPercent: 81 },
        { name: "Tandoori Chicken Tikka", category: "Starters", quantitySold: 132, revenue: 51480, marginPercent: 69 },
      ],
      hourly: [
        { hour: "12 PM", orders: 58, revenue: 49350 },
        { hour: "1 PM", orders: 94, revenue: 81780 },
        { hour: "2 PM", orders: 72, revenue: 61200 },
        { hour: "7 PM", orders: 68, revenue: 57800 },
        { hour: "8 PM", orders: 112, revenue: 95200 },
        { hour: "9 PM", orders: 48, revenue: 39170 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 56, amount: 215320 },
        { name: "Starters & Kebabs", percent: 24, amount: 92280 },
        { name: "Beverages & Cocktails", percent: 12, amount: 46140 },
        { name: "Artisanal Breads & Sides", percent: 8, amount: 30760 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 69, amount: 256749 },
        { method: "Credit / Debit Cards", percent: 23, amount: 85583 },
        { method: "Netbanking", percent: 5, amount: 18605 },
        { method: "Cash / Counter", percent: 3, amount: 11163 },
      ],
    },
    "30d": {
      grossSales: 1540000,
      netCollections: 1492000,
      completedOrders: 1810,
      aov: 850,
      avgDiningMins: 40,
      gstCollected: 73333,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 890, revenue: 400500, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 740, revenue: 288600, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 1680, revenue: 151200, marginPercent: 86 },
        { name: "Dal Makhani", category: "Mains", quantitySold: 580, revenue: 197200, marginPercent: 81 },
        { name: "Mango Lassi", category: "Beverages", quantitySold: 510, revenue: 76500, marginPercent: 88 },
      ],
      hourly: [
        { hour: "12 PM", orders: 230, revenue: 195500 },
        { hour: "1 PM", orders: 380, revenue: 323000 },
        { hour: "2 PM", orders: 290, revenue: 246500 },
        { hour: "7 PM", orders: 280, revenue: 238000 },
        { hour: "8 PM", orders: 440, revenue: 374000 },
        { hour: "9 PM", orders: 190, revenue: 163000 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 57, amount: 877800 },
        { name: "Starters & Kebabs", percent: 23, amount: 354200 },
        { name: "Beverages & Cocktails", percent: 12, amount: 184800 },
        { name: "Artisanal Breads & Sides", percent: 8, amount: 123200 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 70, amount: 1044400 },
        { method: "Credit / Debit Cards", percent: 22, amount: 328240 },
        { method: "Netbanking", percent: 5, amount: 74600 },
        { method: "Cash / Counter", percent: 3, amount: 44760 },
      ],
    },
    month: {
      grossSales: 1280000,
      netCollections: 1240000,
      completedOrders: 1505,
      aov: 850,
      avgDiningMins: 40,
      gstCollected: 60952,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 740, revenue: 333000, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 615, revenue: 239850, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 1390, revenue: 125100, marginPercent: 86 },
        { name: "Dal Makhani", category: "Mains", quantitySold: 480, revenue: 163200, marginPercent: 81 },
        { name: "Tandoori Chicken Tikka", category: "Starters", quantitySold: 440, revenue: 171600, marginPercent: 69 },
      ],
      hourly: [
        { hour: "12 PM", orders: 190, revenue: 161500 },
        { hour: "1 PM", orders: 315, revenue: 267750 },
        { hour: "2 PM", orders: 240, revenue: 204000 },
        { hour: "7 PM", orders: 235, revenue: 199750 },
        { hour: "8 PM", orders: 365, revenue: 310250 },
        { hour: "9 PM", orders: 160, revenue: 136750 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 57, amount: 729600 },
        { name: "Starters & Kebabs", percent: 23, amount: 294400 },
        { name: "Beverages & Cocktails", percent: 12, amount: 153600 },
        { name: "Artisanal Breads & Sides", percent: 8, amount: 102400 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 70, amount: 868000 },
        { method: "Credit / Debit Cards", percent: 22, amount: 272800 },
        { method: "Netbanking", percent: 5, amount: 62000 },
        { method: "Cash / Counter", percent: 3, amount: 37200 },
      ],
    },
    all: {
      grossSales: 3840000,
      netCollections: 3720000,
      completedOrders: 4510,
      aov: 851,
      avgDiningMins: 41,
      gstCollected: 182857,
      topDishes: [
        { name: "Butter Chicken", category: "Mains", quantitySold: 2210, revenue: 994500, marginPercent: 74 },
        { name: "Paneer Tikka Masala", category: "Mains", quantitySold: 1840, revenue: 717600, marginPercent: 72 },
        { name: "Garlic Butter Naan", category: "Breads", quantitySold: 4180, revenue: 376200, marginPercent: 86 },
        { name: "Dal Makhani", category: "Mains", quantitySold: 1440, revenue: 489600, marginPercent: 81 },
        { name: "Tandoori Chicken Tikka", category: "Starters", quantitySold: 1310, revenue: 510900, marginPercent: 69 },
      ],
      hourly: [
        { hour: "12 PM", orders: 570, revenue: 484500 },
        { hour: "1 PM", orders: 945, revenue: 803250 },
        { hour: "2 PM", orders: 720, revenue: 612000 },
        { hour: "7 PM", orders: 705, revenue: 599250 },
        { hour: "8 PM", orders: 1095, revenue: 930750 },
        { hour: "9 PM", orders: 475, revenue: 410250 },
      ],
      categoryShare: [
        { name: "Curries & Mains", percent: 57, amount: 2188800 },
        { name: "Starters & Kebabs", percent: 23, amount: 883200 },
        { name: "Beverages & Cocktails", percent: 12, amount: 460800 },
        { name: "Artisanal Breads & Sides", percent: 8, amount: 307200 },
      ],
      paymentBreakdown: [
        { method: "Razorpay UPI", percent: 70, amount: 2604000 },
        { method: "Credit / Debit Cards", percent: 22, amount: 818400 },
        { method: "Netbanking", percent: 5, amount: 186000 },
        { method: "Cash / Counter", percent: 3, amount: 111600 },
      ],
    },
  };

  const current = dataByRange[timeRange];

  // Authentic CSV Export Generator
  const handleExportCSV = (type: "sales" | "dishes") => {
    let csvContent = "";
    const dateStr = new Date().toISOString().split("T")[0];

    if (type === "sales") {
      csvContent = "Category,Share Percentage,Amount (INR)\n";
      current.categoryShare.forEach((c) => {
        csvContent += `"${c.name}",${c.percent}%,${c.amount}\n`;
      });
      csvContent += `\nPayment Method,Share Percentage,Amount (INR)\n`;
      current.paymentBreakdown.forEach((p) => {
        csvContent += `"${p.method}",${p.percent}%,${p.amount}\n`;
      });
      csvContent += `\nGross Sales,Net Collections,GST Collected,Completed Orders,AOV (INR)\n`;
      csvContent += `${current.grossSales},${current.netCollections},${current.gstCollected},${current.completedOrders},${current.aov}\n`;
    } else {
      csvContent = "Dish Name,Category,Quantity Sold,Total Revenue (INR),Gross Margin\n";
      current.topDishes.forEach((d) => {
        csvContent += `"${d.name}","${d.category}",${d.quantitySold},${d.revenue},${d.marginPercent}%\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dineflow_${type}_report_${timeRange}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportFeedback(`Exported ${type === "sales" ? "Sales Summary" : "Top Dishes"} CSV successfully.`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-emerald" />
            Sales & Dining Analytics
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Revenue velocity, menu profitability, table turnover, and Razorpay settlement aggregations
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV("sales")}
            className="text-xs h-8 gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-emerald" />
            Export Sales CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV("dishes")}
            className="text-xs h-8 gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-emerald" />
            Export Dishes CSV
          </Button>
        </div>
      </div>

      {exportFeedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3.5 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Date Range Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "today", label: "Today" },
          { id: "yesterday", label: "Yesterday" },
          { id: "7d", label: "Last 7 Days" },
          { id: "30d", label: "Last 30 Days" },
          { id: "month", label: "This Month" },
          { id: "all", label: "All Time" },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={timeRange === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(tab.id as TimeRange)}
            className="text-xs h-8 whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Top 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Gross Sales
            </span>
            <TrendingUp className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">{formatCurrency(current.grossSales)}</p>
          <span className="text-[11px] text-emerald font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> +21.4% vs prev period
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Net Collections
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">{formatCurrency(current.netCollections)}</p>
          <span className="text-[11px] text-charcoal-muted font-medium mt-1 block">
            GST: {formatCurrency(current.gstCollected)}
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Average Order Value (AOV)
            </span>
            <Percent className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">{formatCurrency(current.aov)}</p>
          <span className="text-[11px] text-emerald font-medium mt-1 block">
            {current.completedOrders} orders fulfilled
          </span>
        </Card>

        <Card className="border-charcoal-border bg-charcoal-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              Avg Dining Duration
            </span>
            <Clock className="h-4 w-4 text-emerald" />
          </div>
          <p className="text-2xl font-black text-cream mt-2">{current.avgDiningMins} mins</p>
          <span className="text-[11px] text-emerald-light font-medium mt-1 block">
            Table turn rate: 1.8x / shift
          </span>
        </Card>
      </div>

      {/* Hourly Sales Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Rush Hours */}
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader>
            <CardTitle className="text-base text-cream flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald" />
              Peak Dining Volume by Hour
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Live service velocity showing order frequency and revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.hourly.map((h) => {
              const maxRev = Math.max(...current.hourly.map((x) => x.revenue));
              const pct = Math.round((h.revenue / maxRev) * 100);
              return (
                <div key={h.hour} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-cream">{h.hour}</span>
                    <span className="text-emerald">
                      {h.orders} orders ({formatCurrency(h.revenue)})
                    </span>
                  </div>
                  <div className="w-full bg-charcoal rounded-full h-2">
                    <div
                      className="bg-emerald h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Category Revenue Distribution */}
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader>
            <CardTitle className="text-base text-cream flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-emerald" />
              Category Revenue Share
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Gross contribution to total kitchen sales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {current.categoryShare.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cream">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-charcoal-muted">{formatCurrency(cat.amount)}</span>
                    <span className="text-emerald font-bold">{cat.percent}%</span>
                  </div>
                </div>
                <div className="w-full bg-charcoal rounded-full h-2">
                  <div
                    className="bg-emerald h-2 rounded-full transition-all duration-500"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Best-Selling Dishes Table */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader className="py-4">
          <CardTitle className="text-base text-cream flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-emerald" />
            Top-Selling Menu Items & Profit Margins
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Ranked by customer orders and net gross contribution
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dish Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Units Sold</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead className="text-right">Estimated Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.topDishes.map((dish) => (
                <TableRow key={dish.name}>
                  <TableCell className="font-semibold text-xs text-cream">{dish.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {dish.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-cream">
                    {dish.quantitySold}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-emerald">
                    {formatCurrency(dish.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald/10 text-emerald">
                      {dish.marginPercent}% margin
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Method Distribution */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader className="py-4">
          <CardTitle className="text-base text-cream flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald" />
            Payment Channel Breakdown
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Settlement method breakdown from customer mobile checkout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {current.paymentBreakdown.map((pm) => (
              <div
                key={pm.method}
                className="p-4 rounded-xl bg-charcoal border border-charcoal-border space-y-1"
              >
                <div className="flex items-center justify-between text-xs text-charcoal-muted">
                  <span>{pm.method}</span>
                  <span className="font-bold text-emerald">{pm.percent}%</span>
                </div>
                <p className="text-lg font-bold text-cream font-mono">
                  {formatCurrency(pm.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
