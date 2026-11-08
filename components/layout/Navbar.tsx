"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DineFlowLogo } from "./DineFlowLogo";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-charcoal-border/80 bg-charcoal/90 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <DineFlowLogo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-charcoal-muted">
          <Link href="#features" className="hover:text-cream transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="hover:text-cream transition-colors">
            How It Works
          </Link>
          <Link href="#pricing" className="hover:text-cream transition-colors">
            Pricing
          </Link>
          <Link href="/menu/demo-restaurant" className="hover:text-cream transition-colors flex items-center gap-1.5 text-emerald font-semibold">
            Customer Menu Demo
          </Link>
          <Link href="#faq" className="hover:text-cream transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-cream hover:bg-charcoal-surface rounded-lg"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-charcoal-border bg-charcoal-card px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-base font-medium text-charcoal-muted">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-cream"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-cream"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-cream"
            >
              Pricing
            </Link>
            <Link
              href="/menu/demo-restaurant"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 text-emerald font-semibold"
            >
              Customer Menu Demo
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-cream"
            >
              FAQ
            </Link>
          </nav>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
