"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        setAuthError(
          "Supabase environment variables are missing or placeholders. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable live Supabase Auth."
        );
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone || "",
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required or session exists
      if (authData.user) {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during signup";
      setAuthError(message);
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-charcoal-border bg-charcoal-card shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-cream">Create Restaurant Account</CardTitle>
        <CardDescription className="text-charcoal-muted text-sm">
          Start your 14-day free trial. Setup your restaurant in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {authError && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/50 p-3.5 text-xs text-red-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Full Name</label>
            <Input
              type="text"
              placeholder="Chef Rajesh Sharma"
              {...register("fullName")}
              disabled={isLoading}
              className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-red-400">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Business Email Address</label>
            <Input
              type="email"
              placeholder="rajesh@spicekitchen.com"
              {...register("email")}
              disabled={isLoading}
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Phone Number (Optional)</label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              {...register("phone")}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Password (Min. 8 characters)</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
                className={errors.password ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-cream focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Confirm Password</label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={isLoading}
              className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Continue to Restaurant Setup"
            )}
          </Button>
        </form>

        <div className="text-center text-xs text-charcoal-muted">
          Already have a DineFlow account?{" "}
          <Link href="/login" className="text-emerald hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
