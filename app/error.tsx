"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DineFlow Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal text-cream p-6">
      <div className="max-w-md w-full bg-charcoal-card border border-charcoal-border rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-cream">Something Went Wrong</h2>
          <p className="text-sm text-charcoal-muted leading-relaxed">
            {error.message || "An unexpected error occurred while processing your request. Please try again or return to home."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => reset()} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full gap-2">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
