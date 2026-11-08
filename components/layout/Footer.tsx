import React from "react";
import Link from "next/link";
import { DineFlowLogo } from "./DineFlowLogo";

export function Footer() {
  return (
    <footer className="border-t border-charcoal-border bg-charcoal-dark py-14 text-charcoal-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-4">
            <DineFlowLogo />
            <p className="text-sm max-w-sm leading-relaxed text-charcoal-muted">
              Production-ready multi-tenant restaurant SaaS for QR/NFC digital ordering, kitchen workflows, billing, and intelligent table operations.
            </p>
            <div className="text-xs text-charcoal-muted">
              Built with Next.js, Supabase & Tailwind CSS. Designed for Indian & global hospitality leaders.
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-cream mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#features" className="hover:text-cream transition-colors">
                  QR & NFC Ordering
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-cream transition-colors">
                  Digital Menu Management
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-cream transition-colors">
                  Live Kitchen Display
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-cream transition-colors">
                  Smart Table Billing
                </Link>
              </li>
              <li>
                <Link href="/menu/demo-restaurant" className="hover:text-emerald text-emerald transition-colors font-medium">
                  Live Demo Menu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-cream mb-4">
              Management
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-cream transition-colors">
                  Owner Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/menu" className="hover:text-cream transition-colors">
                  Menu Editor & Variants
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tables" className="hover:text-cream transition-colors">
                  Table Layout & QR
                </Link>
              </li>
              <li>
                <Link href="/dashboard/analytics" className="hover:text-cream transition-colors">
                  Sales Analytics
                </Link>
              </li>
              <li>
                <Link href="/dashboard/staff" className="hover:text-cream transition-colors">
                  Staff Access Control
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-cream mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="hover:text-cream transition-colors">
                  Merchant Portal
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-cream transition-colors">
                  Create Restaurant
                </Link>
              </li>
              <li>
                <span className="text-charcoal-muted/70">Razorpay Ready (INR)</span>
              </li>
              <li>
                <span className="text-charcoal-muted/70">Multi-tenant RLS</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-border flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
          <p>© {new Date().getFullYear()} DineFlow Technologies. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="hover:text-cream cursor-pointer">Privacy Policy</span>
            <span className="hover:text-cream cursor-pointer">Terms of Service</span>
            <span className="hover:text-cream cursor-pointer">Security Overview</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
