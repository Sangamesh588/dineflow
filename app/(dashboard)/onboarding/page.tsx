"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { restaurantOnboardingSchema, type RestaurantOnboardingInput } from "@/lib/validations/restaurant";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DineFlowLogo } from "@/components/layout/DineFlowLogo";
import {
  Store,
  Clock,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  UploadCloud,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RestaurantOnboardingInput>({
    resolver: zodResolver(restaurantOnboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      time_zone: "Asia/Kolkata",
      cuisine_type: "",
      opening_time: "09:00",
      closing_time: "22:00",
      currency: "INR",
      tax_percentage: 5.0,
      logo_url: "",
      cover_url: "",
    },
  });

  const restaurantName = watch("name");

  // Automatically suggest a slug as the user types the name
  useEffect(() => {
    if (restaurantName) {
      setValue("slug", slugify(restaurantName), { shouldValidate: true });
    }
  }, [restaurantName, setValue]);

  // Check if user already has an active restaurant
  useEffect(() => {
    async function checkExistingRestaurant() {
      if (!isConfigured) return;
      try {
        const supabase = createClient();
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
            router.replace("/dashboard");
          }
        }
      } catch (err) {
        console.warn("Error checking existing restaurant membership:", err);
      }
    }
    checkExistingRestaurant();
  }, [isConfigured, router]);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isConfigured) {
      // Mock upload for local preview
      const previewUrl = URL.createObjectURL(file);
      setValue("logo_url", previewUrl);
      return;
    }

    try {
      setLogoUploading(true);
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-assets")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("restaurant-assets")
        .getPublicUrl(filePath);

      setValue("logo_url", publicUrlData.publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload logo image";
      setServerError(`Logo upload failed: ${message}`);
    } finally {
      setLogoUploading(false);
    }
  };

  const onSubmit = async (data: RestaurantOnboardingInput) => {
    setIsLoading(true);
    setServerError(null);

    try {
      if (!isConfigured) {
        // Save to demo state and proceed
        if (typeof window !== "undefined") {
          localStorage.setItem("dineflow_restaurant", JSON.stringify(data));
        }
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Call the dedicated server onboarding API route (bypasses browser RLS conflicts atomically)
      const res = await fetch("/api/restaurant/onboard", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          resData?.error ||
          "Failed to complete restaurant setup. Please check your inputs and try again.";
        setServerError(errorMsg);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to complete restaurant setup";
      setServerError(message);
      setIsLoading(false);
    }
  };

  const logoUrl = watch("logo_url");

  return (
    <div className="min-h-screen bg-charcoal text-cream py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <DineFlowLogo size="lg" className="justify-center" />
          <h1 className="text-3xl font-extrabold text-cream tracking-tight mt-4">
            Welcome! Set Up Your Restaurant
          </h1>
          <p className="text-sm text-charcoal-muted">
            Configure your brand, digital menu URL, and billing preferences
          </p>
        </div>

        <Card className="border-charcoal-border bg-charcoal-card shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-cream flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald" />
              Restaurant Profile & Details
            </CardTitle>
            <CardDescription className="text-charcoal-muted text-xs">
              All details can be edited anytime from your restaurant dashboard settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {serverError && (
              <div className="rounded-lg bg-red-950/40 border border-red-800/50 p-4 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {isSuccess && (
              <div className="rounded-lg bg-emerald/20 border border-emerald/50 p-4 text-xs text-emerald-light flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald" />
                <span>Restaurant created successfully! Taking you to your dashboard...</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Restaurant Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Restaurant Name *</label>
                <Input
                  placeholder="e.g. The Coastal Spice Kitchen"
                  {...register("name")}
                  disabled={isLoading}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
              </div>

              {/* URL Slug */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-cream">
                    Public Menu URL Slug *
                  </label>
                  <span className="text-[11px] text-charcoal-muted">Must be lowercase & unique</span>
                </div>
                <div className="flex items-center rounded-lg border border-charcoal-border bg-charcoal-surface overflow-hidden">
                  <span className="px-3 text-xs text-charcoal-muted select-none">
                    dineflow.app/menu/
                  </span>
                  <input
                    type="text"
                    {...register("slug")}
                    disabled={isLoading}
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-emerald font-semibold focus:outline-none"
                    placeholder="my-restaurant"
                  />
                </div>
                {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">About / Tagline</label>
                <Textarea
                  placeholder="Authentic coastal curries, stone-baked flatbreads and craft mocktails."
                  rows={2}
                  {...register("description")}
                  disabled={isLoading}
                />
              </div>

              {/* Cuisine & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Cuisine Type *</label>
                  <Input
                    placeholder="e.g. North Indian & Mughlai"
                    {...register("cuisine_type")}
                    disabled={isLoading}
                    className={errors.cuisine_type ? "border-red-500" : ""}
                  />
                  {errors.cuisine_type && (
                    <p className="text-xs text-red-400">{errors.cuisine_type.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Restaurant Phone *</label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    {...register("phone")}
                    disabled={isLoading}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                </div>
              </div>

              {/* Email & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Orders / Support Email *</label>
                  <Input
                    type="email"
                    placeholder="contact@coastalspice.com"
                    {...register("email")}
                    disabled={isLoading}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Physical Address *</label>
                  <Input
                    placeholder="Shop 14, High Street Mall"
                    {...register("address")}
                    disabled={isLoading}
                    className={errors.address ? "border-red-500" : ""}
                  />
                  {errors.address && (
                    <p className="text-xs text-red-400">{errors.address.message}</p>
                  )}
                </div>
              </div>

              {/* City & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">City / Location</label>
                  <Input
                    placeholder="e.g. Mumbai, Bengaluru, Delhi"
                    {...register("city")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Time Zone</label>
                  <select
                    {...register("time_zone")}
                    disabled={isLoading}
                    className="w-full h-10 px-3 py-2 text-sm bg-charcoal-surface border border-charcoal-border rounded-md text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
                  >
                    <option value="Asia/Kolkata">India (IST - UTC+05:30)</option>
                    <option value="Asia/Dubai">Dubai / Gulf (GST - UTC+04:00)</option>
                    <option value="Asia/Singapore">Singapore (SGT - UTC+08:00)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="America/New_York">US Eastern (EST/EDT)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </div>
              </div>

              {/* Operating Hours & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald" />
                    Opening Time
                  </label>
                  <Input type="time" {...register("opening_time")} disabled={isLoading} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald" />
                    Closing Time
                  </label>
                  <Input type="time" {...register("closing_time")} disabled={isLoading} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-emerald" />
                    GST / Tax %
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    {...register("tax_percentage", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Logo Upload / URL */}
              <div className="space-y-2 pt-2 border-t border-charcoal-border">
                <label className="text-xs font-semibold text-cream">
                  Restaurant Brand Logo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="h-16 w-16 rounded-xl border border-charcoal-border overflow-hidden bg-charcoal-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border border-dashed border-charcoal-border flex items-center justify-center text-charcoal-muted bg-charcoal-surface">
                      <Store className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-charcoal-border bg-charcoal-surface hover:bg-charcoal-surface/80 text-xs font-medium text-cream cursor-pointer transition-colors">
                      <UploadCloud className="h-4 w-4 text-emerald" />
                      <span>{logoUploading ? "Uploading..." : "Upload Logo Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={logoUploading || isLoading}
                      />
                    </label>
                    <p className="text-[11px] text-charcoal-muted">PNG, JPG, or SVG up to 2MB</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading || logoUploading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Initializing Your Restaurant...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Complete Setup & Open Dashboard <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
