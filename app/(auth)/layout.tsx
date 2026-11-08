import React from "react";
import Link from "next/link";
import { DineFlowLogo } from "@/components/layout/DineFlowLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-charcoal px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <DineFlowLogo size="lg" />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <div className="mt-8 text-center text-xs text-charcoal-muted">
        <Link href="/" className="hover:text-cream transition-colors">
          ← Back to DineFlow Home
        </Link>
      </div>
    </div>
  );
}
