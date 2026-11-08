"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Utensils,
  Store,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Search,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Lock,
} from "lucide-react";

type LoginMode = "customer" | "shop";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom");
  const queryError = searchParams.get("error");
  const initialMode = searchParams.get("mode") === "customer" ? "customer" : "shop";

  const [mode, setMode] = useState<LoginMode>(initialMode);

  // Customer Mode States
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [orderTrackingToken, setOrderTrackingToken] = useState("");
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Shop / Staff Mode States
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    queryError === "account_suspended"
      ? "This restaurant account has been suspended by the platform administrator."
      : queryError
      ? decodeURIComponent(queryError)
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingRole, setVerifyingRole] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle Customer Browse Menu Submit
  const handleBrowseMenu = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    const cleanSlug = restaurantSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!cleanSlug) {
      setCustomerError("Please enter a restaurant name or code.");
      return;
    }
    router.push(`/menu/${cleanSlug}`);
  };

  // Handle Customer Order Tracking Submit
  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    const cleanToken = orderTrackingToken.trim();
    if (!cleanToken) {
      setCustomerError("Please enter your order tracking token or number.");
      return;
    }
    router.push(`/order-status/${cleanToken}`);
  };

  // Handle Shop / Staff Supabase Authentication Submit
  const onShopSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        // Fallback demo redirect
        router.push(redirectedFrom || "/dashboard");
        return;
      }

      const supabase = createClient();
      const { data: authResult, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setAuthError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (!authResult.user) {
        setAuthError("Failed to authenticate session. Please try again.");
        setIsLoading(false);
        return;
      }

      // 2. Query Server-Verified Role Endpoint
      setVerifyingRole(true);
      const roleResponse = await fetch("/api/auth/role", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (roleResponse.status === 403) {
        const suspendedData = await roleResponse.json();
        await supabase.auth.signOut();
        setAuthError(
          suspendedData.message ||
            "Your restaurant account is suspended. Please contact platform administration."
        );
        setIsLoading(false);
        setVerifyingRole(false);
        return;
      }

      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        // Server-verified target routing (mandatory password change takes precedence)
        const targetUrl = roleData.mustChangePassword
          ? "/reset-password?mustChange=true"
          : redirectedFrom || roleData.redirectUrl || "/dashboard";
        router.push(targetUrl);
        router.refresh();
      } else {
        // Fallback to dashboard
        router.push(redirectedFrom || "/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred during authentication";
      setAuthError(message);
      setIsLoading(false);
      setVerifyingRole(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Unified Tab Switcher: Option A (User) vs Option B (Shop) */}
      <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-charcoal-card border border-charcoal-border shadow-xl">
        <button
          type="button"
          onClick={() => {
            setMode("customer");
            setAuthError(null);
            setCustomerError(null);
          }}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            mode === "customer"
              ? "bg-emerald text-white shadow-md shadow-emerald/20"
              : "text-charcoal-muted hover:text-cream hover:bg-charcoal-surface"
          }`}
        >
          <Utensils className="h-4 w-4 shrink-0" />
          <div className="text-left">
            <p className="leading-tight">Dine-in Customer</p>
            <span
              className={`text-[10px] hidden sm:block ${
                mode === "customer" ? "text-emerald-light" : "text-charcoal-muted"
              }`}
            >
              Menus & Order Tracking
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("shop");
            setAuthError(null);
            setCustomerError(null);
          }}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            mode === "shop"
              ? "bg-emerald text-white shadow-md shadow-emerald/20"
              : "text-charcoal-muted hover:text-cream hover:bg-charcoal-surface"
          }`}
        >
          <Store className="h-4 w-4 shrink-0" />
          <div className="text-left">
            <p className="leading-tight">Restaurant & Staff</p>
            <span
              className={`text-[10px] hidden sm:block ${
                mode === "shop" ? "text-emerald-light" : "text-charcoal-muted"
              }`}
            >
              Owner, Staff & Super Admin
            </span>
          </div>
        </button>
      </div>

      {/* Main Unified Content Container */}
      <Card className="border-charcoal-border bg-charcoal-card shadow-2xl overflow-hidden">
        {mode === "customer" ? (
          /* OPTION A: CUSTOMER HUB */
          <div>
            <CardHeader className="space-y-1 text-center pb-4 border-b border-charcoal-border/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-emerald mb-2">
                <Utensils className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-black text-cream tracking-tight">
                Customer Dining Hub
              </CardTitle>
              <CardDescription className="text-charcoal-muted text-xs sm:text-sm">
                Explore restaurant digital menus, scan table QR codes, or track active food orders
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {customerError && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{customerError}</span>
                </div>
              )}

              {/* 1. Browse Restaurant Menu */}
              <div className="space-y-2.5 rounded-xl bg-charcoal-surface border border-charcoal-border p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-cream uppercase tracking-wider">
                  <Search className="h-3.5 w-3.5 text-emerald" />
                  <span>Browse Digital Restaurant Menu</span>
                </div>
                <form onSubmit={handleBrowseMenu} className="flex gap-2">
                  <Input
                    placeholder="Enter restaurant slug (e.g. demo-restaurant)"
                    value={restaurantSlug}
                    onChange={(e) => setRestaurantSlug(e.target.value)}
                    className="text-xs bg-charcoal border-charcoal-border focus-visible:ring-emerald"
                  />
                  <Button type="submit" size="sm" className="bg-emerald text-white hover:bg-emerald-light shrink-0">
                    Open Menu
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </form>

                {/* Popular sample restaurants */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-charcoal-muted">Quick Demos:</span>
                  <button
                    type="button"
                    onClick={() => router.push("/menu/demo-restaurant")}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-charcoal border border-charcoal-border text-emerald hover:border-emerald"
                  >
                    Bistro Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/menu/demo-restaurant?table_token=demo_token_t2_f4e3d2c1b0a9f8e7d")}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-charcoal border border-charcoal-border text-charcoal-muted hover:text-cream"
                  >
                    Table T-02 (Seated)
                  </button>
                </div>
              </div>

              {/* 2. Track Live Order */}
              <div className="space-y-2.5 rounded-xl bg-charcoal-surface border border-charcoal-border p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-cream uppercase tracking-wider">
                  <Clock className="h-3.5 w-3.5 text-emerald" />
                  <span>Track Live Order Status</span>
                </div>
                <p className="text-[11px] text-charcoal-muted">
                  Check kitchen preparation, table serving status, and split bill payments.
                </p>
                <form onSubmit={handleTrackOrder} className="flex gap-2">
                  <Input
                    placeholder="Enter 8-digit tracking token (e.g. track_demo_101)"
                    value={orderTrackingToken}
                    onChange={(e) => setOrderTrackingToken(e.target.value)}
                    className="text-xs bg-charcoal border-charcoal-border focus-visible:ring-emerald"
                  />
                  <Button type="submit" size="sm" variant="outline" className="shrink-0 border-emerald/40 text-emerald hover:bg-emerald/10">
                    Track
                    <Clock className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </form>
              </div>

              {/* 3. Table QR / NFC Notice */}
              <div className="rounded-xl border border-dashed border-emerald/30 bg-emerald/5 p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-cream">Seated at a Restaurant Table?</p>
                  <p className="text-charcoal-muted text-[11px] leading-relaxed">
                    Point your mobile phone camera at the tabletop QR code or tap the NFC tag. You will instantly be directed to your table&apos;s digital menu with live ordering enabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        ) : (
          /* OPTION B: SHOP & STAFF AUTHENTICATION */
          <div>
            <CardHeader className="space-y-1 text-center pb-4 border-b border-charcoal-border/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-emerald mb-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-black text-cream tracking-tight">
                Restaurant & Staff Portal
              </CardTitle>
              <CardDescription className="text-charcoal-muted text-xs sm:text-sm">
                Owner, Kitchen Staff, Cashier, Waiter, and Platform Super Admin Login
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              {authError && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-3.5 text-xs text-red-300 space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onShopSubmit)} className="space-y-4">
                {/* Email / Login ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">
                    Email Address / Login ID
                  </label>
                  <Input
                    type="email"
                    placeholder="owner@restaurant.com or staff@dineflow.com"
                    {...register("email")}
                    disabled={isLoading}
                    className={`bg-charcoal-surface border-charcoal-border text-cream text-xs ${
                      errors.email ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-emerald"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Password with Show/Hide */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-cream">Password</label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-emerald hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={isLoading}
                      className={`bg-charcoal-surface border-charcoal-border text-cream text-xs pr-10 ${
                        errors.password ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-emerald"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-cream"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald text-white hover:bg-emerald-light font-bold text-sm h-10 mt-2 shadow-lg shadow-emerald/20"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {verifyingRole ? "Verifying Permissions..." : "Signing In..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Sign In to Authorized Portal
                    </span>
                  )}
                </Button>
              </form>

              {/* Role Routing Information Badge */}
              <div className="pt-2 border-t border-charcoal-border/50 text-center space-y-2">
                <p className="text-[11px] text-charcoal-muted">
                  New restaurant brand?{" "}
                  <Link href="/signup" className="font-semibold text-emerald hover:underline">
                    Create Restaurant Account
                  </Link>
                </p>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-charcoal-muted">
                  <ShieldCheck className="h-3 w-3 text-emerald" />
                  <span>Automatic server-side role routing: Owner, Manager, Kitchen, Cashier, Admin</span>
                </div>
              </div>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
}
