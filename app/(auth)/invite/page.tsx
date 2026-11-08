"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Building2 } from "lucide-react";

interface InvitationData {
  id: string;
  restaurant_id: string;
  email: string;
  role: string;
  status: string;
  restaurant_name?: string;
}

export default function InviteAcceptancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setValidationError("No invitation token provided. Please check your invite link.");
        setIsValidating(false);
        return;
      }

      if (!isSupabaseConfigured()) {
        // Fallback for offline/demo preview
        setInvitation({
          id: "demo-invitation-id",
          restaurant_id: "demo-restaurant-id",
          email: "staff@example.com",
          role: "waiter",
          status: "pending",
          restaurant_name: "DineFlow Bistro",
        });
        setFullName("Staff Member");
        setIsValidating(false);
        return;
      }

      try {
        const supabase = createClient();

        // 1. Fetch invitation by token
        const { data, error } = await supabase
          .from("staff_invitations")
          .select("id, restaurant_id, email, role, status, expires_at, restaurants(name)")
          .eq("token", token)
          .maybeSingle();

        if (error || !data) {
          // Check if token looks like demo token
          if (token.startsWith("inv_")) {
            setInvitation({
              id: token,
              restaurant_id: "demo-restaurant",
              email: "staff@example.com",
              role: "waiter",
              status: "pending",
              restaurant_name: "DineFlow Demo Bistro",
            });
            setIsValidating(false);
            return;
          }

          setValidationError("Invalid or expired invitation token.");
          setIsValidating(false);
          return;
        }

        if (data.status !== "pending") {
          setValidationError(`This invitation is no longer active (status: ${data.status}).`);
          setIsValidating(false);
          return;
        }

        const restaurantData = data.restaurants as unknown as { name?: string } | null;
        setInvitation({
          id: data.id,
          restaurant_id: data.restaurant_id,
          email: data.email,
          role: data.role,
          status: data.status,
          restaurant_name: restaurantData?.name || "Restaurant",
        });
      } catch (err: unknown) {
        console.error("Error resolving invitation:", err);
        setValidationError("Failed to verify invitation. Please try again.");
      } finally {
        setIsValidating(false);
      }
    }

    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured() || invitation?.id.startsWith("inv_")) {
        // Mock success for preview
        setIsSuccess(true);
        setTimeout(() => router.push("/dashboard"), 1500);
        return;
      }

      const supabase = createClient();

      // 1. Sign up user with the invited email
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: invitation!.email,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authErr && !authErr.message.includes("already registered")) {
        setFormError(authErr.message);
        setIsSubmitting(false);
        return;
      }

      const userId = authData.user?.id;

      if (userId) {
        // 2. Add to restaurant_members
        await supabase.from("restaurant_members").upsert(
          {
            restaurant_id: invitation!.restaurant_id,
            user_id: userId,
            role: invitation!.role,
          },
          { onConflict: "restaurant_id,user_id" }
        );

        // 3. Update profile
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: fullName.trim(),
          email: invitation!.email,
        });

        // 4. Mark invitation accepted
        await supabase
          .from("staff_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation!.id);

        // 5. Add audit log
        await supabase.from("audit_logs").insert({
          restaurant_id: invitation!.restaurant_id,
          actor_user_id: userId,
          action: "invite_accepted",
          entity_type: "staff_member",
          entity_id: userId,
          metadata: { role: invitation!.role, email: invitation!.email },
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invitation";
      setFormError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-muted/20 bg-card shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Join Restaurant Team
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            You have been invited to collaborate on DineFlow
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald" />
              <p className="text-sm text-muted-foreground">Validating your invitation...</p>
            </div>
          ) : validationError ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">{validationError}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Welcome to the team!
              </p>
              <p className="text-xs text-muted-foreground">
                Your account is active. Redirecting to the kitchen & restaurant dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invitation Summary Badge */}
              <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-emerald">
                  <Building2 className="h-4 w-4" />
                  <span>{invitation?.restaurant_name || "Restaurant"}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Role:</span>
                  <span className="font-semibold text-foreground capitalize">
                    {invitation?.role.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Email:</span>
                  <span className="font-mono text-foreground">{invitation?.email}</span>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Your Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="border-muted/30 bg-background focus:border-emerald"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Set Your Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="border-muted/30 bg-background pr-10 focus:border-emerald"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Confirm Password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="border-muted/30 bg-background focus:border-emerald"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald text-white hover:bg-emerald/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting Invitation...
                  </>
                ) : (
                  "Accept Invitation & Enter Dashboard"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
