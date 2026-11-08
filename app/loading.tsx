import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal text-cream p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-charcoal-border border-t-emerald animate-spin" />
          <Loader2 className="h-6 w-6 text-emerald absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-medium text-charcoal-muted tracking-wide animate-pulse">
          Loading DineFlow...
        </p>
      </div>
    </div>
  );
}
