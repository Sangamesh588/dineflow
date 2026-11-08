"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Smartphone,
  Flame,
  Receipt,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Utensils,
} from "lucide-react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does QR & NFC ordering work for customers?",
      a: "Guests simply point their camera or tap their phone against the NFC disc on their table. DineFlow instantly opens the restaurant's live, interactive menu in their mobile browser—no mobile app download or registration required.",
    },
    {
      q: "Can we manage menu item availability in real-time during rush hours?",
      a: "Yes. From your DineFlow admin panel or kitchen screen, you can toggle any item or variant to 'Out of stock' with a single tap, updating customer menus immediately across all tables.",
    },
    {
      q: "Does DineFlow support multi-tenant security and staff roles?",
      a: "Absolutely. DineFlow uses strict PostgreSQL Row-Level Security (RLS). Restaurant owners, managers, chefs, and waitstaff have scoped access, preventing cross-tenant access and unauthorized role changes.",
    },
    {
      q: "How does billing and tax work?",
      a: "DineFlow calculates GST/taxes and optional service charges based on your restaurant's exact regional settings in INR. It prepares clear subtotal breakdowns and integrates seamlessly with Razorpay.",
    },
    {
      q: "Do I need special hardware to run DineFlow?",
      a: "No special hardware required. DineFlow runs on any iPad, Android tablet, POS terminal, or laptop browser. Printed QR table cards or NFC tags are all your tables need.",
    },
  ];

  const features = [
    {
      icon: QrCode,
      title: "Contactless QR & NFC Ordering",
      description:
        "Fast scan-and-order technology. Guests order instantly from their table with zero friction, boosting table turnaround by up to 28%.",
      tag: "Customer Favorite",
    },
    {
      icon: Utensils,
      title: "Dynamic Digital Menus",
      description:
        "Visually striking digital menus with high-res food images, dietary badges, variant modifiers, add-on toppings, and real-time out-of-stock toggles.",
      tag: "Phase 4 Ready",
    },
    {
      icon: Flame,
      title: "Live Kitchen Display (KDS)",
      description:
        "Direct kitchen ticket dispatch grouped by table. Kitchen teams see item prep timers, special cooking notes, and order priorities instantly.",
      tag: "Real-Time",
    },
    {
      icon: Receipt,
      title: "Smart Billing & Tax Breakdown",
      description:
        "Transparent GST, VAT, and service charge computations. Clean split-bill previews, automated receipts, and Razorpay-ready settlement flows.",
      tag: "INR Compliant",
    },
    {
      icon: TrendingUp,
      title: "Actionable Sales Analytics",
      description:
        "Track hourly sales spikes, most profitable food items, table occupancy duration, and customer reorder rates through intuitive analytics.",
      tag: "Data Driven",
    },
    {
      icon: ShieldCheck,
      title: "Multi-Tenant Enterprise Security",
      description:
        "Powered by Supabase PostgreSQL with strict Row Level Security (RLS). Full tenant isolation, staff role hierarchy, and encrypted credentials.",
      tag: "Protected",
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Quick Onboarding",
      description:
        "Register your brand, configure cuisine details, opening hours, GST rates, and generate your dedicated restaurant slug in seconds.",
    },
    {
      step: "02",
      title: "Build Your Digital Menu",
      description:
        "Create categories, upload dish photos, define size variants and delicious add-ons, and toggle availability on the fly.",
    },
    {
      step: "03",
      title: "Deploy QR Tables",
      description:
        "Place smart QR code displays on every dining table. DineFlow generates table-specific URLs with built-in fraud prevention.",
    },
    {
      step: "04",
      title: "Automate Orders & Kitchen",
      description:
        "Orders flow directly to kitchen display screens and billing stations. Track live fulfillment, accept payments, and delight guests.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter Bistro",
      price: "₹1,499",
      period: "per month",
      description: "Ideal for cafes, food trucks, and small dining establishments looking to modernize ordering.",
      features: [
        "Up to 15 Smart QR Tables",
        "Unlimited Digital Menu Items & Categories",
        "Real-Time Item Availability Toggles",
        "Standard Kitchen Display Screen",
        "Email & Community Support",
      ],
      popular: false,
      cta: "Start 14-Day Free Trial",
    },
    {
      name: "Pro Restaurant",
      price: "₹3,499",
      period: "per month",
      description: "Engineered for high-volume restaurants, casual dining, and multi-station kitchens.",
      features: [
        "Unlimited Smart QR & NFC Tables",
        "Variants, Add-ons & Prep Time Engine",
        "Multi-station Kitchen Display (KDS)",
        "Staff Roles & Member Access Controls",
        "Advanced Hourly Sales & Food Analytics",
        "Razorpay INR Gateway Integration Ready",
        "Priority 24/7 WhatsApp & Phone Support",
      ],
      popular: true,
      cta: "Get Started with Pro",
    },
    {
      name: "Multi-Outlet Enterprise",
      price: "₹7,999",
      period: "per month",
      description: "Tailored for restaurant chains, hospitality franchises, and fine dining groups.",
      features: [
        "Multiple Branch & Outlet Central Dashboard",
        "Centralized Master Menu Synchronization",
        "Custom Domain & White-Label Branding",
        "Dedicated Account & POS Onboarding Manager",
        "Custom ERP & Inventory Webhooks",
        "SLA Guarantee with 99.9% Uptime",
      ],
      popular: false,
      cta: "Talk to Enterprise Sales",
    },
  ];

  return (
    <div className="space-y-24 py-10 sm:py-16">
      {/* 1. HERO SECTION */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-light mb-8">
          <Sparkles className="h-4 w-4 text-emerald" />
          <span>Next-Generation Restaurant OS for Modern Hospitality</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-cream leading-[1.1] mb-6">
          Every Table. <br />
          <span className="text-emerald">One Smart Ordering</span> Experience.
        </h1>

        <p className="text-lg sm:text-xl text-charcoal-muted max-w-3xl mx-auto leading-relaxed mb-10">
          Eliminate order delays, empower diners with instant QR & NFC ordering, and run kitchen operations and billing with flawless precision. Designed specifically for ambitious restaurants.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto gap-2 px-8 py-6 text-base shadow-lg shadow-emerald/20">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/menu/demo-restaurant">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2 px-8 py-6 text-base border-charcoal-border hover:border-emerald/40">
              <Smartphone className="h-5 w-5 text-emerald" />
              Live Customer Menu Demo
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-8 py-6 text-base">
              Explore Dashboard
            </Button>
          </Link>
        </div>

        {/* Product Dashboard Preview Showcase */}
        <div className="mt-16 rounded-2xl border border-charcoal-border bg-charcoal-card p-3 sm:p-5 shadow-2xl relative overflow-hidden group">
          <div className="rounded-xl border border-charcoal-border/70 bg-charcoal-surface/80 p-4 sm:p-6 text-left">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 border-b border-charcoal-border mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald/80" />
                <span className="text-xs text-charcoal-muted font-mono ml-2">dineflow.app/dashboard</span>
              </div>
              <Badge variant="success" className="text-[11px]">
                Live Kitchen Connected
              </Badge>
            </div>

            {/* Dashboard metrics teaser */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl bg-charcoal p-4 border border-charcoal-border">
                <p className="text-xs text-charcoal-muted font-medium">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-cream mt-1">₹48,250</p>
                <span className="text-[11px] text-emerald font-semibold">+18.4% vs yesterday</span>
              </div>
              <div className="rounded-xl bg-charcoal p-4 border border-charcoal-border">
                <p className="text-xs text-charcoal-muted font-medium">Orders Placed</p>
                <p className="text-2xl font-bold text-cream mt-1">142</p>
                <span className="text-[11px] text-emerald font-semibold">96% digital QR</span>
              </div>
              <div className="rounded-xl bg-charcoal p-4 border border-charcoal-border">
                <p className="text-xs text-charcoal-muted font-medium">Active Tables</p>
                <p className="text-2xl font-bold text-cream mt-1">18 / 24</p>
                <span className="text-[11px] text-charcoal-muted">75% capacity</span>
              </div>
              <div className="rounded-xl bg-charcoal p-4 border border-charcoal-border">
                <p className="text-xs text-charcoal-muted font-medium">Average Order Value</p>
                <p className="text-2xl font-bold text-cream mt-1">₹680</p>
                <span className="text-[11px] text-emerald font-semibold">+₹95 with add-ons</span>
              </div>
            </div>

            {/* Recent Live Ticket Preview */}
            <div className="rounded-xl bg-charcoal p-4 border border-charcoal-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald/20 text-emerald flex items-center justify-center font-bold">
                  T-04
                </div>
                <div>
                  <p className="text-sm font-bold text-cream">Table 04 • 2 Guests</p>
                  <p className="text-xs text-charcoal-muted">2x Truffle Butter Naan, 1x Paneer Tikka Masala (Spicy)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-emerald/40 text-emerald">
                  Cooking (6 mins remaining)
                </Badge>
                <Link href="/dashboard">
                  <Button size="sm" variant="secondary" className="text-xs">
                    View Full KDS
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="border-emerald/40 text-emerald uppercase tracking-wider mb-3">
            Core Modules
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream">
            Engineered for High-Speed Service & Higher Profits
          </h2>
          <p className="text-charcoal-muted mt-4 text-base sm:text-lg">
            Every feature has been meticulously crafted to remove friction between your guests and kitchen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="border-charcoal-border bg-charcoal-card hover:border-emerald/50 transition-all hover:translate-y-[-2px]">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-12 w-12 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      {f.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-cream">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-charcoal-muted leading-relaxed">
                    {f.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-charcoal-card/40 rounded-3xl border border-charcoal-border/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="border-emerald/40 text-emerald uppercase tracking-wider mb-3">
            Simple 4-Step Flow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream">
            From Sign-up to Table 1 in under 15 Minutes
          </h2>
          <p className="text-charcoal-muted mt-4 text-base sm:text-lg">
            No expensive on-premise hardware. No complex training required for your staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item, idx) => (
            <div key={idx} className="relative p-6 rounded-2xl bg-charcoal border border-charcoal-border space-y-4">
              <span className="text-4xl font-black text-emerald/30 font-mono">
                {item.step}
              </span>
              <h3 className="text-lg font-bold text-cream">{item.title}</h3>
              <p className="text-sm text-charcoal-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. RESTAURANT BENEFITS SECTION */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-emerald/40 text-emerald uppercase tracking-wider">
              Measurable Business Impact
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-cream leading-tight">
              Why Premier Restaurateurs Trust DineFlow
            </h2>
            <p className="text-charcoal-muted leading-relaxed text-base">
              Traditional paper menus slow down ordering, limit upsells, and make price updates expensive. DineFlow replaces paper with an interactive dining experience that increases basket sizes and delights customers.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-cream text-sm">22% Higher Average Order Value (AOV)</h4>
                  <p className="text-xs text-charcoal-muted mt-0.5">High-res photos and automatic add-on / topping prompts encourage spontaneous orders.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-cream text-sm">Zero Ordering Bottlenecks during Rush Hours</h4>
                  <p className="text-xs text-charcoal-muted mt-0.5">Guests don&apos;t have to wave down servers just to see the menu or place repeat drink orders.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-cream text-sm">Real-time Stock Control</h4>
                  <p className="text-xs text-charcoal-muted mt-0.5">Never apologize for out-of-stock specials again. Update item status immediately from your phone.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/signup">
                <Button className="gap-2">
                  Launch Your Restaurant Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Side card highlight */}
          <div className="rounded-2xl border border-charcoal-border bg-charcoal-card p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-bold text-cream">Experience it From a Diner&apos;s Perspective</h3>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              Test our simulated customer-facing menu. Add items to your cart, customize spice levels and add-ons, and see GST calculations live in INR.
            </p>
            <div className="p-4 rounded-xl bg-charcoal border border-charcoal-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-muted">Demo Venue</span>
                <span className="font-semibold text-cream">DineFlow Bistro & Lounge</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-muted">Active Table</span>
                <span className="font-semibold text-emerald">Table T-02 (Simulated)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-muted">Currency</span>
                <span className="font-semibold text-cream">Indian Rupee (INR ₹)</span>
              </div>
            </div>
            <Link href="/menu/demo-restaurant" className="block w-full">
              <Button variant="secondary" className="w-full gap-2 border-emerald/30 text-emerald hover:bg-emerald/10">
                Launch Live Customer Demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="border-emerald/40 text-emerald uppercase tracking-wider mb-3">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream">
            Predictable Plans for Growing Restaurants
          </h2>
          <p className="text-charcoal-muted mt-4 text-base sm:text-lg">
            No hidden setup fees. No percentage commission on your hard-earned food sales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, idx) => (
            <Card
              key={idx}
              className={`relative flex flex-col justify-between border ${
                plan.popular
                  ? "border-emerald bg-charcoal-card shadow-xl shadow-emerald/10 scale-[1.02]"
                  : "border-charcoal-border bg-charcoal-card/80"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="bg-emerald text-cream px-3 py-1 font-semibold text-xs uppercase tracking-wider">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl text-cream">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-cream">{plan.price}</span>
                  <span className="text-xs text-charcoal-muted">{plan.period}</span>
                </div>
                <CardDescription className="text-xs leading-relaxed text-charcoal-muted">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-px bg-charcoal-border" />
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-cream/90">
                      <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Link href="/signup" className="block w-full">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-emerald/40 text-emerald uppercase tracking-wider mb-3">
            Got Questions?
          </Badge>
          <h2 className="text-3xl font-extrabold text-cream">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-charcoal-border bg-charcoal-card transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-medium text-cream hover:text-emerald transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-charcoal-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-charcoal-muted leading-relaxed border-t border-charcoal-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald/30 bg-charcoal-card p-8 sm:p-14 text-center max-w-4xl mx-auto space-y-6 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald/20 text-emerald">
            <Utensils className="h-8 w-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream">
            Ready to Transform Your Dining Room?
          </h2>
          <p className="text-charcoal-muted max-w-xl mx-auto text-sm sm:text-base">
            Join hundreds of forward-thinking restaurants delivering faster table service and driving larger orders with DineFlow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto px-8 gap-2">
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/menu/demo-restaurant">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                View Customer Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
