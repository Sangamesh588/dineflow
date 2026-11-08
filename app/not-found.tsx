import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal text-cream p-6">
      <div className="max-w-md w-full bg-charcoal-card border border-charcoal-border rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/10 border border-emerald/30 text-emerald">
          <UtensilsCrossed className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <p className="text-4xl font-black text-emerald tracking-tight">404</p>
          <h2 className="text-xl font-bold text-cream">Page or Restaurant Not Found</h2>
          <p className="text-sm text-charcoal-muted leading-relaxed">
            The page, digital menu, or dashboard section you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to DineFlow Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
