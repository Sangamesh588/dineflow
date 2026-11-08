"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Lock, ShieldAlert } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMustChange = searchParams.get("mustChange") === "true";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        setAuthError(
          "Supabase environment variables are missing. Please check your configuration."
        );
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          must_change_password: false,
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      // Verify role destination or fallback to dashboard
      try {
        const roleRes = await fetch("/api/auth/role", { cache: "no-store" });
        const roleData = await roleRes.json();
        const destination = roleData.redirectUrl && !roleData.mustChangePassword ? roleData.redirectUrl : "/dashboard";
        setTimeout(() => {
          router.push(destination);
          router.refresh();
        }, 1500);
      } catch {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      setAuthError(message);
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-muted/20 bg-card shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
          {isMustChange ? <ShieldAlert className="h-6 w-6" /> : <Lock className="h-6 w-6 text-emerald" />}
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {isMustChange ? "First Login Password Setup" : "Set New Password"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          {isMustChange
            ? "Your hotel account was provisioned with a one-time temporary password. Set your personal secure password to activate your restaurant dashboard."
            : "Create a strong, new password for your DineFlow account"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Your personal password has been successfully configured!
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to your restaurant dashboard...
            </p>
            <Button
              asChild
              className="w-full bg-emerald text-white hover:bg-emerald/90"
            >
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isMustChange && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Mandatory Security Verification
                </p>
                <p className="text-amber-300/80">
                  You must replace your initial temporary password before accessing restaurant operations.
                </p>
              </div>
            )}

            {authError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Password
              </label>
              <div className="relative">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="border-muted/30 bg-background pr-10 focus:border-emerald text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="border-muted/30 bg-background pr-10 focus:border-emerald text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald text-white hover:bg-emerald/90 text-xs font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Personal Password...
                </>
              ) : isMustChange ? (
                "Save Password & Enter Dashboard"
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Suspense fallback={<div className="text-cream text-xs">Loading password reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
