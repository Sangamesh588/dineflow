"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        setAuthError(
          "Supabase environment variables are missing or placeholders. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable live password reset."
        );
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email";
      setAuthError(message);
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-charcoal-border bg-charcoal-card shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-cream">Reset Your Password</CardTitle>
        <CardDescription className="text-charcoal-muted text-sm">
          Enter your registered email to receive password recovery instructions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald/20 text-emerald">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-cream text-base">Check Your Inbox</h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                If an account exists with that email address, we have sent instructions to reset your password.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {authError && (
              <div className="rounded-lg bg-red-950/40 border border-red-800/50 p-3.5 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Registered Email</label>
                <Input
                  type="email"
                  placeholder="owner@restaurant.com"
                  {...register("email")}
                  disabled={isLoading}
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-charcoal-muted">
              Remember your password?{" "}
              <Link href="/login" className="text-emerald hover:underline font-semibold">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
