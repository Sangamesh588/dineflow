"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Building,
  Sparkles,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  CreditCard,
  ShieldAlert,
} from "lucide-react";

interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: "order" | "kitchen" | "payment" | "table";
  read: boolean;
  timestamp: string;
  href: string;
}

interface DashboardHeaderProps {
  userEmail?: string;
  userName?: string;
  restaurantName?: string;
  restaurantSlug?: string;
}

export function DashboardHeader({
  userEmail = "",
  userName = "Restaurant Staff",
  restaurantName = "Restaurant",
  restaurantSlug = "",
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleSignOut = async () => {
    if (configured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-charcoal-border bg-charcoal/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left side: Mobile Toggle & Page context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-cream hover:bg-charcoal-surface rounded-lg lg:hidden"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald/10 border border-emerald/30 px-2.5 py-1 text-emerald-light font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
            {restaurantName}
          </span>
          {!configured && (
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-amber-300 font-medium text-[11px]">
              <Sparkles className="h-3 w-3" />
              Demo / Dev Mode
            </span>
          )}
        </div>
      </div>

      {/* Right side: Quick menu link, Notifications Popover & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Customer View Button */}
        <Link
          href={`/menu/${restaurantSlug}`}
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald hover:text-emerald-light bg-emerald/10 hover:bg-emerald/20 px-3 py-1.5 rounded-lg border border-emerald/30 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Customer Menu</span>
        </Link>

        {/* Notifications Popover Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 text-charcoal-muted hover:text-cream hover:bg-charcoal-surface rounded-lg transition-colors focus:outline-none"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald"></span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-charcoal border-charcoal-border p-0">
            <div className="flex items-center justify-between p-3 border-b border-charcoal-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cream">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-emerald/20 text-emerald border-emerald/40 text-[10px] px-1.5 py-0">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-emerald hover:text-emerald-light transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-charcoal-border">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-charcoal-muted">
                  No new notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.href}
                    onClick={() => markAsRead(notif.id)}
                    className={`block p-3 hover:bg-charcoal-surface transition-colors ${
                      !notif.read ? "bg-emerald/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 rounded bg-charcoal border border-charcoal-border shrink-0 mt-0.5">
                        {notif.type === "order" && <UtensilsCrossed className="h-3.5 w-3.5 text-emerald" />}
                        {notif.type === "kitchen" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                        {notif.type === "payment" && <CreditCard className="h-3.5 w-3.5 text-emerald-light" />}
                        {notif.type === "table" && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-cream truncate">{notif.title}</p>
                          <span className="text-[10px] text-charcoal-muted ml-2 shrink-0">{notif.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-charcoal-muted line-clamp-1 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-charcoal-surface transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {userName.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-cream leading-none">{userName}</p>
                <p className="text-[10px] text-charcoal-muted mt-0.5 leading-none">{userEmail}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium text-cream">{userName}</p>
              <p className="text-xs text-charcoal-muted truncate font-normal">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Building className="h-4 w-4 text-emerald" />
                <span>Restaurant Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/staff" className="flex items-center gap-2 cursor-pointer">
                <ShieldCheck className="h-4 w-4 text-emerald" />
                <span>Roles & Permissions</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/menu/${restaurantSlug}`} target="_blank" className="flex items-center gap-2 cursor-pointer text-emerald">
                <ExternalLink className="h-4 w-4" />
                <span>Open Digital Menu</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/super-admin" className="flex items-center gap-2 cursor-pointer text-red-400">
                <ShieldAlert className="h-4 w-4" />
                <span>Super Admin Console</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-400 hover:text-red-300 focus:text-red-300">
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-50 bg-charcoal/95 border-b border-charcoal-border p-4 lg:hidden flex flex-col space-y-3 overflow-y-auto">
          <div className="pb-3 border-b border-charcoal-border">
            <p className="text-xs text-charcoal-muted uppercase">Active Restaurant</p>
            <p className="text-sm font-semibold text-cream">{restaurantName}</p>
          </div>
          <nav className="flex flex-col space-y-1 text-sm font-medium">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Live Orders
            </Link>
            <Link
              href="/dashboard/menu"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-emerald font-semibold"
            >
              Menu Management
            </Link>
            <Link
              href="/dashboard/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Categories
            </Link>
            <Link
              href="/dashboard/tables"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Tables & QR
            </Link>
            <Link
              href="/dashboard/kitchen"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Kitchen (KDS)
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Billing
            </Link>
            <Link
              href="/dashboard/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Analytics
            </Link>
            <Link
              href="/dashboard/staff"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Staff
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-cream"
            >
              Settings
            </Link>
            <Link
              href="/super-admin"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg hover:bg-charcoal-surface text-red-400"
            >
              Super Admin
            </Link>
            <Link
              href={`/menu/${restaurantSlug}`}
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-emerald/20 text-emerald font-semibold flex items-center justify-between"
            >
              <span>Preview Customer Menu</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </nav>
          <div className="pt-4 border-t border-charcoal-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
