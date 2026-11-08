"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DineFlowLogo } from "./DineFlowLogo";
import {
  LayoutDashboard,
  ClipboardList,
  Utensils,
  Layers,
  Armchair,
  Flame,
  Receipt,
  TrendingUp,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", href: "/dashboard/orders", icon: ClipboardList, badge: "3" },
  { title: "Menu", href: "/dashboard/menu", icon: Utensils },
  { title: "Categories", href: "/dashboard/categories", icon: Layers },
  { title: "Tables", href: "/dashboard/tables", icon: Armchair },
  { title: "Kitchen (KDS)", href: "/dashboard/kitchen", icon: Flame },
  { title: "Billing", href: "/dashboard/billing", icon: Receipt },
  { title: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { title: "Staff", href: "/dashboard/staff", icon: Users },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardSidebarProps {
  restaurantSlug?: string;
  restaurantName?: string;
}

export function DashboardSidebar({
  restaurantSlug = "",
  restaurantName = "Restaurant",
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative hidden lg:flex flex-col border-r border-charcoal-border bg-charcoal h-screen sticky top-0 transition-all duration-300 z-30 select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-charcoal-border">
        {!collapsed ? (
          <DineFlowLogo />
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald text-cream font-bold">
            DF
          </div>
        )}
      </div>

      {/* Restaurant quick banner */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-charcoal-card border border-charcoal-border">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs text-charcoal-muted uppercase tracking-wider font-semibold">Active Restaurant</p>
              <p className="text-sm font-semibold text-cream truncate">{restaurantName}</p>
            </div>
            <Link
              href={`/menu/${restaurantSlug}`}
              target="_blank"
              title="Preview Customer Menu"
              className="p-1.5 text-emerald hover:bg-emerald/10 rounded-md transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald text-cream font-semibold shadow-sm"
                  : "text-charcoal-muted hover:bg-charcoal-surface hover:text-cream"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-cream" : "text-charcoal-muted group-hover:text-cream")} />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.title}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        isActive ? "bg-cream text-charcoal-dark" : "bg-emerald/20 text-emerald"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Customer Menu Link for collapsed mode */}
      {collapsed && (
        <div className="p-3 border-t border-charcoal-border flex justify-center">
          <Link
            href={`/menu/${restaurantSlug}`}
            target="_blank"
            title="Preview Customer Menu"
            className="p-2.5 text-emerald hover:bg-emerald/10 rounded-lg transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
          </Link>
        </div>
      )}

      {/* Collapse button */}
      <div className="p-3 border-t border-charcoal-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-charcoal-muted hover:bg-charcoal-surface hover:text-cream transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
