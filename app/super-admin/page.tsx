"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building,
  Users,
  TrendingUp,
  ShieldAlert,
  CreditCard,
  ShoppingBag,
  Utensils,
  Tag,
  BarChart3,
  Bell,
  LifeBuoy,
  ShieldCheck,
  Globe,
  Server,
  CheckCircle2,
  Search,
  Plus,
  Lock,
  ExternalLink,
  Ban,
  Check,
  Send,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Types
interface PlatformMetrics {
  totalRestaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  totalOwners: number;
  totalStaff: number;
  totalOrders: number;
  platformRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  cuisine_type?: string;
  currency: string;
  status: "active" | "suspended" | "trial";
  is_suspended: boolean;
  created_at: string;
  email?: string;
  phone?: string;
  tables_count?: number;
  monthly_gmv?: number;
  owner_name?: string;
  owner_email?: string;
}

interface MemberRecord {
  id: string;
  role: string;
  created_at: string;
  profiles?: { full_name?: string; email?: string; phone?: string; last_sign_in_at?: string; is_generated_email?: boolean };
  restaurant?: { id?: string; name?: string; slug?: string; city?: string; status?: string; is_suspended?: boolean };
  planName?: string;
  last_sign_in_at?: string;
  is_generated_email?: boolean;
}

interface MenuItemRecord {
  id: string;
  name: string;
  price: number;
  is_vegetarian: boolean;
  category?: { name?: string } | string;
  restaurant?: { name?: string; slug?: string };
}

interface CustomerRecord {
  name: string;
  phone: string;
  ordersCount: number;
  totalSpend: number;
  preferredRestaurant: string;
}

interface TopRestaurantRecord {
  id: string;
  name: string;
  ordersCount: number;
  gmv: number;
  percent: number;
}

interface ProvisionedCredentials {
  hotelName: string;
  loginEmail: string;
  tempPassword: string;
  slug: string;
  mustChangePassword?: boolean;
  isGeneratedEmail?: boolean;
}

interface PlanRecord {
  id: string;
  name: string;
  slug: string;
  price_inr: number;
  billing_interval: string;
  menu_items_limit: number;
  tables_limit: number;
  staff_members_limit: number;
  orders_per_month_limit: number;
  is_active: boolean;
}

interface OrderRecord {
  id: string;
  order_number: string;
  order_type: string;
  order_status: string;
  payment_status: string;
  grand_total: number;
  created_at: string;
  restaurant?: { name?: string; slug?: string };
}

interface CouponRecord {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  valid_until?: string;
}

interface TicketRecord {
  id: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  resolution_notes?: string;
  restaurant?: { name?: string };
}

interface AuditLogRecord {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor?: { email?: string; full_name?: string };
}

interface WebsiteSettings {
  website_name: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  maintenance_mode: boolean;
  pricing_visible: boolean;
  announcement_banner_text: string;
  announcement_banner_active: boolean;
}

interface SystemHealth {
  database: string;
  authService: string;
  storage: string;
  razorpayGateway: string;
  realtimeWebsocket: string;
  uptimePercent: number;
  apiLatencyMs: number;
}

type NavSection =
  | "overview"
  | "restaurants"
  | "owners"
  | "staff"
  | "plans"
  | "billing"
  | "orders"
  | "menu"
  | "customers"
  | "coupons"
  | "analytics"
  | "notifications"
  | "support"
  | "security"
  | "settings"
  | "health";

export default function SuperAdminPage() {
  const [currentSection, setCurrentSection] = useState<NavSection>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authorization State
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Core Platform State
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalRestaurants: 0,
    activeRestaurants: 0,
    suspendedRestaurants: 0,
    totalOwners: 0,
    totalStaff: 0,
    totalOrders: 0,
    platformRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
  });

  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurantRecord[]>([]);
  const [mrr, setMrr] = useState<number>(0);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    website_name: "DineFlow",
    tagline: "Next-Gen Restaurant QR Ordering & Management SaaS",
    support_email: "support@dineflow.com",
    support_phone: "+91 98765 43210",
    maintenance_mode: false,
    pricing_visible: true,
    announcement_banner_text: "Welcome to DineFlow - Launch your digital menu in minutes!",
    announcement_banner_active: false,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: "Operational",
    authService: "Operational",
    storage: "Operational",
    razorpayGateway: "Connected",
    realtimeWebsocket: "Active",
    uptimePercent: 99.98,
    apiLatencyMs: 18,
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isNewRestModalOpen, setIsNewRestModalOpen] = useState(false);
  const [newRestName, setNewRestName] = useState("");
  const [newRestSlug, setNewRestSlug] = useState("");
  const [newRestCity, setNewRestCity] = useState("Mumbai");
  const [newRestOwnerEmail, setNewRestOwnerEmail] = useState("");
  const [newRestOwnerName, setNewRestOwnerName] = useState("");
  const [newRestPhone, setNewRestPhone] = useState("");
  const [newRestPlan, setNewRestPlan] = useState("free");
  const [showAdvancedProvisioning, setShowAdvancedProvisioning] = useState(false);
  const [isSubmittingRest, setIsSubmittingRest] = useState(false);

  // Post-Creation Credentials Modal
  const [provisionedCreds, setProvisionedCreds] = useState<ProvisionedCredentials | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Password Reset Result Modal
  const [resetOwnerCreds, setResetOwnerCreds] = useState<{ email: string; tempPassword: string; hotelName: string } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [copiedResetCreds, setCopiedResetCreds] = useState(false);

  // Account Detail Modal
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [isViewMemberModalOpen, setIsViewMemberModalOpen] = useState(false);

  // New Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percentage" | "fixed">("percentage");
  const [couponValue, setCouponValue] = useState(20);
  const [couponMinOrder, setCouponMinOrder] = useState(500);

  // Broadcast Notification Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Ticket Resolution Modal
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Load Super Admin Data
  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setIsAdminAuthorized(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        if (Array.isArray(data.restaurants)) setRestaurants(data.restaurants);
        if (Array.isArray(data.members)) setMembers(data.members);
        if (Array.isArray(data.plans)) setPlans(data.plans);
        if (Array.isArray(data.orders)) setOrders(data.orders);
        if (Array.isArray(data.coupons)) setCoupons(data.coupons);
        if (Array.isArray(data.tickets)) setTickets(data.tickets);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
        if (Array.isArray(data.menuItems)) setMenuItems(data.menuItems);
        if (Array.isArray(data.customers)) setCustomers(data.customers);
        if (Array.isArray(data.topRestaurants)) setTopRestaurants(data.topRestaurants);
        if (typeof data.mrr === "number") setMrr(data.mrr);
        if (data.settings) setWebsiteSettings(data.settings);
        if (data.systemHealth) setSystemHealth(data.systemHealth);
        setIsAdminAuthorized(true);
      }
    } catch (err) {
      console.warn("Could not fetch remote admin data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Action: Toggle Restaurant Suspension
  const handleToggleSuspend = async (restaurantId: string, currentStatus: string) => {
    const targetStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restaurantId
            ? { ...r, status: targetStatus, is_suspended: targetStatus === "suspended" }
            : r
        )
      );

      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_restaurant_status",
          restaurantId,
          targetStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(data.message || `Restaurant status updated to ${targetStatus}.`);
        await loadAdminData();
      } else {
        setActionFeedback(`Failed: ${data.error}`);
        await loadAdminData();
      }
    } catch {
      setActionFeedback("Network error updating restaurant status.");
      await loadAdminData();
    } finally {
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Action: Create New Restaurant
  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRest(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_restaurant",
          name: newRestName,
          slug: newRestSlug || undefined,
          city: newRestCity,
          contactEmail: newRestOwnerEmail || undefined,
          ownerName: newRestOwnerName || undefined,
          phone: newRestPhone || undefined,
          planSlug: newRestPlan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsNewRestModalOpen(false);
        setNewRestName("");
        setNewRestSlug("");
        setNewRestOwnerEmail("");
        setNewRestOwnerName("");
        setNewRestPhone("");
        setShowAdvancedProvisioning(false);

        if (data.credentials) {
          setProvisionedCreds(data.credentials);
          setIsCredentialsModalOpen(true);
        }

        setActionFeedback(`Hotel '${newRestName}' provisioned successfully!`);

        // Fetch fresh authoritative dataset from server
        await loadAdminData();
      } else {
        setActionFeedback(`Error: ${data.error}`);
      }
    } catch {
      setActionFeedback("Failed to create restaurant.");
    } finally {
      setIsSubmittingRest(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Action: Send Password Link to Owner
  const handleSendPasswordLink = async (member: MemberRecord) => {
    const email = member.profiles?.email;
    if (!email) {
      setActionFeedback("Error: No email associated with this owner account.");
      return;
    }
    try {
      setActionFeedback(`Generating secure password link for ${email}...`);
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_password_link",
          email,
          userId: member.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.actionUrl) {
          navigator.clipboard.writeText(data.actionUrl).catch(() => {});
          setActionFeedback(`Password setup URL generated and copied to clipboard! Share directly with the hotel owner.`);
        } else {
          setActionFeedback(data.message || `Password setup link dispatched to ${email}`);
        }
      } else {
        setActionFeedback(`Failed: ${data.error}`);
      }
    } catch {
      setActionFeedback("Error connecting to server for password link.");
    } finally {
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Action: Reset Owner Password (Generate new secure temp password)
  const handleResetOwnerPassword = async (member: MemberRecord) => {
    const email = member.profiles?.email;
    if (!email) {
      setActionFeedback("Error: No email associated with this owner account.");
      return;
    }
    try {
      setActionFeedback(`Generating new temporary password for ${email}...`);
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_owner_password",
          email,
          userId: member.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.tempPassword) {
        setResetOwnerCreds({
          email,
          tempPassword: data.tempPassword,
          hotelName: member.restaurant?.name || "Hotel Restaurant",
        });
        setIsResetModalOpen(true);
        setActionFeedback(`New temporary password generated for ${email}!`);
      } else {
        setActionFeedback(`Reset failed: ${data.error}`);
      }
    } catch {
      setActionFeedback("Error resetting owner password.");
    } finally {
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Action: Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_coupon",
          code: couponCode,
          discount_type: couponType,
          discount_value: couponValue,
          min_order_amount: couponMinOrder,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Promotion coupon '${couponCode}' created!`);
        setIsCouponModalOpen(false);
        setCouponCode("");
        loadAdminData();
      } else {
        setActionFeedback(`Failed: ${data.error}`);
      }
    } catch {
      setActionFeedback("Error creating coupon.");
    } finally {
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Action: Send Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_broadcast",
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(data.message || "Broadcast transmitted to all restaurants!");
        setIsBroadcastModalOpen(false);
        setBroadcastTitle("");
        setBroadcastMessage("");
      } else {
        setActionFeedback(`Failed: ${data.error}`);
      }
    } catch {
      setActionFeedback("Error transmitting broadcast.");
    } finally {
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Action: Resolve Support Ticket
  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_ticket",
          ticketId: selectedTicket.id,
          status: "resolved",
          resolution_notes: resolutionNotes || "Resolved by platform administrator.",
        }),
      });
      if (res.ok) {
        setActionFeedback(`Support ticket ${selectedTicket.id} marked as resolved.`);
        setSelectedTicket(null);
        setResolutionNotes("");
        loadAdminData();
      }
    } catch {
      setActionFeedback("Failed to update support ticket.");
    } finally {
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Action: Save Website Settings
  const handleSaveWebsiteSettings = async () => {
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_website_settings",
          ...websiteSettings,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback("Website settings and platform controls updated successfully!");
      } else {
        setActionFeedback(`Failed: ${data.error}`);
      }
    } catch {
      setActionFeedback("Error updating website settings.");
    } finally {
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Navigation Items Definition (16 Required Sections)
  const navItems: { id: NavSection; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "restaurants", label: "Restaurants", icon: Building, badge: String(metrics.totalRestaurants) },
    { id: "owners", label: "Owner Accounts", icon: Users },
    { id: "staff", label: "Staff Management", icon: ShieldCheck },
    { id: "plans", label: "Subscription Plans", icon: Sparkles },
    { id: "billing", label: "Billing & Payments", icon: CreditCard },
    { id: "orders", label: "Platform Orders", icon: ShoppingBag, badge: "Live" },
    { id: "menu", label: "Menu Monitoring", icon: Utensils },
    { id: "customers", label: "Customer Management", icon: Users },
    { id: "coupons", label: "Coupons & Promotions", icon: Tag },
    { id: "analytics", label: "Platform Analytics", icon: TrendingUp },
    { id: "notifications", label: "Notifications & Broadcast", icon: Bell },
    { id: "support", label: "Support Management", icon: LifeBuoy, badge: String(tickets.filter(t => t.status === "open").length) },
    { id: "security", label: "Security & Audit Logs", icon: ShieldAlert },
    { id: "settings", label: "Website Settings", icon: Globe },
    { id: "health", label: "System Health", icon: Server, badge: "99.9%" },
  ];

  // Unauthorized Lockdown View
  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-charcoal-border bg-charcoal-card p-6 text-center space-y-4 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-cream">Platform Super Admin Restricted</h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            This route requires verified DineFlow platform super-administrator privileges registered in{" "}
            <code className="text-emerald">public.platform_admins</code>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild size="sm" className="bg-emerald text-white hover:bg-emerald-light">
              <Link href="/login" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Sign In with Super Admin Credentials
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-charcoal-border text-cream">
              <Link href="/dashboard">Return to Restaurant Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream flex flex-col">
      {/* Top Fixed Control Center Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-charcoal-border bg-charcoal/95 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-charcoal-border text-cream hover:bg-charcoal-surface"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="text-lg font-black text-cream flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-emerald flex items-center justify-center text-charcoal font-black text-sm shadow-md shadow-emerald/20">
              DF
            </span>
            <span className="tracking-tight">DineFlow</span>
          </Link>
          <span className="text-xs text-charcoal-muted">/</span>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[11px] font-mono gap-1.5 py-0.5">
            <ShieldAlert className="h-3 w-3" />
            Super Admin Control Center
          </Badge>
          {isLoadingData && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald ml-1" />}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="hidden sm:flex text-xs h-8 gap-1.5 border-charcoal-border text-cream hover:bg-charcoal-surface"
          >
            <Bell className="h-3.5 w-3.5 text-emerald" />
            Broadcast Alert
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewRestModalOpen(true)}
            className="text-xs h-8 gap-1.5 bg-emerald text-white hover:bg-emerald-light shadow-md shadow-emerald/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Restaurant</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="text-xs h-8 border-charcoal-border text-cream">
            <Link href="/dashboard" className="gap-1.5">
              <span>Tenant View</span>
              <ExternalLink className="h-3 w-3 text-charcoal-muted" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Professional Sidebar (16 sections) */}
        <aside
          className={`fixed inset-y-16 left-0 z-30 w-64 border-r border-charcoal-border bg-charcoal-card flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Platform Controls
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald text-white shadow-md shadow-emerald/20 font-bold"
                      : "text-charcoal-muted hover:text-cream hover:bg-charcoal-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-emerald/80"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive ? "bg-white/20 text-white" : "bg-charcoal-surface text-charcoal-muted border border-charcoal-border"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-charcoal-border text-[11px] text-charcoal-muted flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
              <span>Platform Online</span>
            </div>
            <span className="font-mono text-[10px]">v2.4-prod</span>
          </div>
        </aside>

        {/* Central Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3.5 text-xs text-emerald-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                <span>{actionFeedback}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-charcoal-muted hover:text-cream">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. OVERVIEW SECTION                                          */}
          {/* ============================================================ */}
          {currentSection === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-emerald" />
                  Platform Master Overview
                </h1>
                <p className="text-xs text-charcoal-muted mt-1">
                  Real-time aggregated health, tenant metrics, platform transactions, and active subscriptions
                </p>
              </div>

              {/* Top 9 Real Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Total Restaurants</span>
                    <Building className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-2xl font-black text-cream">{metrics.totalRestaurants}</p>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald font-medium">{metrics.activeRestaurants} active</span>
                    <span className="text-charcoal-muted">•</span>
                    <span className="text-red-400 font-medium">{metrics.suspendedRestaurants} suspended</span>
                  </div>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Registered Owners</span>
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-black text-cream">{metrics.totalOwners}</p>
                  <p className="text-[11px] text-charcoal-muted">{metrics.totalStaff} total platform members</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Total Orders</span>
                    <ShoppingBag className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-black text-cream">{metrics.totalOrders}</p>
                  <p className="text-[11px] text-emerald">Live QR & Table checkouts</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Gross Platform GMV</span>
                    <CreditCard className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-2xl font-black text-cream">{formatCurrency(metrics.platformRevenue)}</p>
                  <p className="text-[11px] text-charcoal-muted">Settled via Razorpay gateway</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Active Subscriptions</span>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-cream">{metrics.activeSubscriptions}</p>
                  <p className="text-[11px] text-emerald">{metrics.expiredSubscriptions} renewals pending</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Open Support Tickets</span>
                    <LifeBuoy className="h-4 w-4 text-orange-400" />
                  </div>
                  <p className="text-2xl font-black text-cream">
                    {tickets.filter((t) => t.status === "open").length}
                  </p>
                  <p className="text-[11px] text-charcoal-muted">{tickets.length} total logged inquiries</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>Active Coupons</span>
                    <Tag className="h-4 w-4 text-pink-400" />
                  </div>
                  <p className="text-2xl font-black text-cream">
                    {coupons.filter((c) => c.is_active).length}
                  </p>
                  <p className="text-[11px] text-charcoal-muted">{coupons.reduce((sum, c) => sum + c.used_count, 0)} redemptions</p>
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-charcoal-muted font-semibold uppercase">
                    <span>System Health</span>
                    <Server className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-2xl font-black text-emerald">99.98%</p>
                  <p className="text-[11px] text-charcoal-muted">{systemHealth.apiLatencyMs}ms average response</p>
                </Card>
              </div>

              {/* Quick Jump Grid to Core Management Modules */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <Card
                  onClick={() => setCurrentSection("restaurants")}
                  className="cursor-pointer border-charcoal-border bg-charcoal-surface hover:border-emerald p-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-cream">Manage Restaurants</span>
                    <ChevronRight className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Provision new restaurant outlets, update statuses, or suspend tenants.
                  </p>
                </Card>

                <Card
                  onClick={() => setCurrentSection("plans")}
                  className="cursor-pointer border-charcoal-border bg-charcoal-surface hover:border-emerald p-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-cream">Subscription Plans</span>
                    <ChevronRight className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Configure pricing, table caps, staff limits, and order allowances.
                  </p>
                </Card>

                <Card
                  onClick={() => setCurrentSection("settings")}
                  className="cursor-pointer border-charcoal-border bg-charcoal-surface hover:border-emerald p-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-cream">Website & Controls</span>
                    <ChevronRight className="h-4 w-4 text-emerald" />
                  </div>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Toggle maintenance mode, edit announcement banner, or update branding.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. RESTAURANTS SECTION                                       */}
          {/* ============================================================ */}
          {currentSection === "restaurants" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                    <Building className="h-6 w-6 text-emerald" />
                    Restaurant Tenant Directory
                    <Badge variant="outline" className="border-emerald/40 text-emerald text-xs ml-2">
                      {restaurants.length} Total
                    </Badge>
                  </h1>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Search, inspect, provision, suspend, or reactivate restaurant outlets
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadAdminData}
                    disabled={isLoadingData}
                    className="border-charcoal-border text-cream hover:bg-charcoal-surface gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin text-emerald" : ""}`} />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setIsNewRestModalOpen(true)} className="bg-emerald text-white hover:bg-emerald-light gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Restaurant
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
                  <Input
                    placeholder="Search by restaurant name, slug, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs bg-charcoal-card border-charcoal-border"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-md bg-charcoal-card border border-charcoal-border text-cream"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="trial">Trial Only</option>
                </select>
              </div>

              {/* Restaurant Table */}
              <Card className="border-charcoal-border bg-charcoal-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Restaurant</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Location</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Status</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Tables</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Monthly GMV</TableHead>
                      <TableHead className="text-right text-charcoal-muted text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingData && restaurants.length === 0 ? (
                      <TableRow className="border-charcoal-border">
                        <TableCell colSpan={6} className="text-center py-10 text-charcoal-muted">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald" />
                          <p className="text-xs">Loading restaurant tenant registry...</p>
                        </TableCell>
                      </TableRow>
                    ) : restaurants.filter((r) => {
                        const matchStatus = statusFilter === "all" || r.status === statusFilter;
                        const matchSearch =
                          !searchQuery ||
                          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase()));
                        return matchStatus && matchSearch;
                      }).length === 0 ? (
                      <TableRow className="border-charcoal-border">
                        <TableCell colSpan={6} className="text-center py-10 text-charcoal-muted">
                          <Building className="h-8 w-8 mx-auto mb-2 text-charcoal-muted/60" />
                          <p className="text-sm font-medium text-cream">No restaurants found</p>
                          <p className="text-xs text-charcoal-muted mt-1">
                            {restaurants.length === 0
                              ? "No restaurants have been provisioned yet. Click 'Create Restaurant' to add your first tenant."
                              : "No restaurants match your active search and filter criteria."}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      restaurants
                        .filter((r) => {
                          const matchStatus = statusFilter === "all" || r.status === statusFilter;
                          const matchSearch =
                            !searchQuery ||
                            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase()));
                          return matchStatus && matchSearch;
                        })
                        .map((r) => (
                          <TableRow key={r.id} className="border-charcoal-border">
                            <TableCell>
                              <div>
                                <p className="font-bold text-cream text-xs">{r.name}</p>
                                <span className="font-mono text-[10px] text-emerald">/menu/{r.slug}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-charcoal-muted">{r.city || "Mumbai"}</TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] capitalize ${
                                  r.status === "active"
                                    ? "bg-emerald/20 text-emerald border-emerald/40"
                                    : r.status === "suspended"
                                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-cream">{r.tables_count ?? 0}</TableCell>
                            <TableCell className="text-xs text-cream font-mono">
                              {formatCurrency(r.monthly_gmv || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 text-emerald">
                                  <Link href={`/menu/${r.slug}`} target="_blank">
                                    Menu <ExternalLink className="h-3 w-3 ml-1" />
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleSuspend(r.id, r.status)}
                                  className={`h-7 text-[11px] px-2 ${
                                    r.status === "suspended"
                                      ? "text-emerald border-emerald/40 hover:bg-emerald/10"
                                      : "text-red-400 border-red-500/40 hover:bg-red-500/10"
                                  }`}
                                >
                                  {r.status === "suspended" ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" /> Activate
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-3 w-3 mr-1" /> Suspend
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. OWNER DIRECTORY SECTION                                   */}
          {/* ============================================================ */}
          {currentSection === "owners" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                    <Users className="h-6 w-6 text-emerald" />
                    Hotel Owner Accounts Directory
                  </h1>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Authorized restaurant owners, auto-provisioned identifiers, and security controls
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewRestModalOpen(true)}
                  className="bg-emerald text-white hover:bg-emerald-light gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Provision Hotel
                </Button>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Hotel / Restaurant</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Generated Login ID</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Owner Name</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Account Status</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Plan</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Creation Date</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Last Login</TableHead>
                      <TableHead className="text-right text-charcoal-muted text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.filter((m) => m.role === "owner").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-xs text-charcoal-muted">
                          No hotel owners registered yet. Use &quot;+ Provision Hotel&quot; to automatically create an owner account.
                        </TableCell>
                      </TableRow>
                    ) : (
                      members
                        .filter((m) => m.role === "owner")
                        .map((m) => {
                          const rest = m.restaurant;
                          const isSuspended = rest?.is_suspended || rest?.status === "suspended";
                          const isGenEmail = m.is_generated_email || m.profiles?.is_generated_email;
                          const lastLogin = m.last_sign_in_at || m.profiles?.last_sign_in_at;

                          return (
                            <TableRow key={m.id} className="border-charcoal-border hover:bg-charcoal-surface/40">
                              <TableCell>
                                <div>
                                  <p className="text-xs font-bold text-cream">{rest?.name || "Hotel Outlet"}</p>
                                  {rest?.slug && (
                                    <Link
                                      href={`/menu/${rest.slug}`}
                                      target="_blank"
                                      className="text-[10px] text-emerald font-mono hover:underline inline-flex items-center gap-0.5"
                                    >
                                      /menu/{rest.slug} <ExternalLink className="h-2.5 w-2.5" />
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="text-xs font-mono text-emerald font-semibold">
                                    {m.profiles?.email || "—"}
                                  </span>
                                  {isGenEmail && (
                                    <Badge className="bg-charcoal-surface border-charcoal-border text-charcoal-muted text-[9px] block w-fit">
                                      Identifier Only
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-cream font-medium">
                                {m.profiles?.full_name || rest?.name || "Owner"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-[10px] capitalize ${
                                    isSuspended
                                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                                      : "bg-emerald/20 text-emerald border-emerald/40"
                                  }`}
                                >
                                  {isSuspended ? "Suspended" : "Active"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-charcoal-surface border-charcoal-border text-cream text-[10px]">
                                  {m.planName || "Starter Free"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-charcoal-muted">
                                {formatDate(m.created_at)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {lastLogin ? (
                                  <span className="text-cream font-mono">{formatDate(lastLogin)}</span>
                                ) : (
                                  <span className="text-charcoal-muted italic">Never</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsViewMemberModalOpen(true);
                                    }}
                                    className="h-7 text-[11px] px-2 border-charcoal-border text-cream hover:bg-charcoal-surface"
                                    title="View full account details"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendPasswordLink(m)}
                                    className="h-7 text-[11px] px-2 border-charcoal-border text-emerald hover:bg-emerald/10"
                                    title="Send or generate password setup link"
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Send Link
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResetOwnerPassword(m)}
                                    className="h-7 text-[11px] px-2 border-charcoal-border text-amber-300 hover:bg-amber-500/10"
                                    title="Generate new temporary password"
                                  >
                                    <Lock className="h-3 w-3 mr-1" />
                                    Reset
                                  </Button>
                                  {rest?.id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleToggleSuspend(rest.id!, rest.status || "active")}
                                      className={`h-7 text-[11px] px-2 ${
                                        isSuspended
                                          ? "text-emerald border-emerald/40 hover:bg-emerald/10"
                                          : "text-red-400 border-red-500/40 hover:bg-red-500/10"
                                      }`}
                                      title={isSuspended ? "Reactivate owner account" : "Suspend owner account"}
                                    >
                                      {isSuspended ? (
                                        <>
                                          <Check className="h-3 w-3 mr-1" /> Activate
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="h-3 w-3 mr-1" /> Suspend
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. STAFF MANAGEMENT SECTION                                  */}
          {/* ============================================================ */}
          {currentSection === "staff" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald" />
                  Cross-Tenant Staff Directory
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Inspect staff memberships, operational roles, and access tiers
                </p>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Staff Member</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Restaurant</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Role Tier</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Assigned Email</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id} className="border-charcoal-border">
                        <TableCell className="text-xs font-bold text-cream">
                          {m.profiles?.full_name || "Staff Member"}
                        </TableCell>
                        <TableCell className="text-xs text-cream">
                          {m.restaurant?.name || "Restaurant Outlet"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-charcoal-surface border-charcoal-border text-cream text-[10px] capitalize">
                            {m.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-charcoal-muted">
                          {m.profiles?.email || "staff@restaurant.com"}
                        </TableCell>
                        <TableCell className="text-xs text-charcoal-muted">
                          {formatDate(m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. SUBSCRIPTION PLANS SECTION                                */}
          {/* ============================================================ */}
          {currentSection === "plans" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-emerald" />
                  SaaS Subscription Plans & Quotas
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Configure pricing, table limits, menu item caps, and monthly allowances
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p) => (
                  <Card key={p.id} className="border-charcoal-border bg-charcoal-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-cream">{p.name}</span>
                      <Badge className="bg-emerald/20 text-emerald text-[10px]">Active</Badge>
                    </div>

                    <div>
                      <span className="text-2xl font-black text-cream">₹{p.price_inr}</span>
                      <span className="text-xs text-charcoal-muted"> /{p.billing_interval}</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-charcoal-border text-xs text-charcoal-muted">
                      <div className="flex justify-between">
                        <span>Menu Items Cap:</span>
                        <span className="font-bold text-cream">{p.menu_items_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tables Cap:</span>
                        <span className="font-bold text-cream">{p.tables_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Staff Seats:</span>
                        <span className="font-bold text-cream">{p.staff_members_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Orders:</span>
                        <span className="font-bold text-cream">{p.orders_per_month_limit}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 6. BILLING & PAYMENTS SECTION                                */}
          {/* ============================================================ */}
          {currentSection === "billing" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-emerald" />
                  Platform Billing & Settlement Ledger
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Live Razorpay financial transactions and SaaS platform collections
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-1">
                  <span className="text-xs text-charcoal-muted font-semibold uppercase">Total Platform GMV</span>
                  <p className="text-2xl font-black text-cream">{formatCurrency(metrics.platformRevenue)}</p>
                  <p className="text-[11px] text-emerald">100% captured via Razorpay</p>
                </Card>
                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-1">
                  <span className="text-xs text-charcoal-muted font-semibold uppercase">SaaS Recurring Revenue (MRR)</span>
                  <p className="text-2xl font-black text-cream">{formatCurrency(mrr)}</p>
                  <p className="text-[11px] text-charcoal-muted">From active tier subscriptions</p>
                </Card>
                <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-1">
                  <span className="text-xs text-charcoal-muted font-semibold uppercase">Gateway Status</span>
                  <p className="text-2xl font-black text-emerald">Connected</p>
                  <p className="text-[11px] text-charcoal-muted">Razorpay Webhooks Active</p>
                </Card>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 7. PLATFORM ORDERS SECTION                                   */}
          {/* ============================================================ */}
          {currentSection === "orders" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-emerald" />
                  Live Platform Order Stream
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Real-time dining orders placed across all restaurants
                </p>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Order ID</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Restaurant</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Status</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Amount</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Payment</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id} className="border-charcoal-border">
                        <TableCell className="text-xs font-mono font-bold text-cream">{o.order_number}</TableCell>
                        <TableCell className="text-xs text-cream">{o.restaurant?.name || "Restaurant"}</TableCell>
                        <TableCell>
                          <Badge className="bg-charcoal-surface border-charcoal-border text-cream text-[10px] capitalize">
                            {o.order_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-emerald font-bold">
                          {formatCurrency(o.grand_total)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald/20 text-emerald text-[10px] capitalize">
                            {o.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-charcoal-muted">{formatDate(o.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 8. MENU MONITORING SECTION                                   */}
          {/* ============================================================ */}
          {currentSection === "menu" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <Utensils className="h-6 w-6 text-emerald" />
                  Cross-Tenant Menu Catalog Monitoring
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Inspect digital menu items, pricing, and active dishes across all restaurants
                </p>
              </div>

              {menuItems.length === 0 ? (
                <Card className="border-charcoal-border bg-charcoal-card p-8 text-center text-charcoal-muted text-xs">
                  No digital menu dishes registered across restaurants yet.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <Card key={item.id} className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cream">{item.name}</span>
                        <Badge className="bg-emerald/20 text-emerald text-[10px]">
                          {item.is_vegetarian ? "Veg" : "Non-Veg"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-charcoal-muted">{item.restaurant?.name || "Restaurant Outlet"}</p>
                      <div className="flex items-baseline justify-between pt-2 border-t border-charcoal-border">
                        <span className="text-xs text-charcoal-muted">
                          {typeof item.category === "object" ? item.category?.name : (item.category || "General")}
                        </span>
                        <span className="text-sm font-bold text-cream font-mono">{formatCurrency(item.price)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* 9. CUSTOMER MANAGEMENT SECTION                               */}
          {/* ============================================================ */}
          {currentSection === "customers" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <Users className="h-6 w-6 text-emerald" />
                  Customer Diner Management
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Guest diner engagement, order frequency, and loyalty records
                </p>
              </div>

              {customers.length === 0 ? (
                <Card className="border-charcoal-border bg-charcoal-card p-8 text-center text-charcoal-muted text-xs">
                  No diner customer records captured yet. Orders placed by guests will populate this directory.
                </Card>
              ) : (
                <Card className="border-charcoal-border bg-charcoal-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-charcoal-border">
                        <TableHead className="text-charcoal-muted text-xs">Customer</TableHead>
                        <TableHead className="text-charcoal-muted text-xs">Contact Phone</TableHead>
                        <TableHead className="text-charcoal-muted text-xs">Total Orders</TableHead>
                        <TableHead className="text-charcoal-muted text-xs">Total Spend</TableHead>
                        <TableHead className="text-charcoal-muted text-xs">Preferred Outlet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((c, idx) => (
                        <TableRow key={idx} className="border-charcoal-border">
                          <TableCell className="text-xs font-bold text-cream">{c.name}</TableCell>
                          <TableCell className="text-xs font-mono text-charcoal-muted">{c.phone}</TableCell>
                          <TableCell className="text-xs text-cream">{c.ordersCount} orders</TableCell>
                          <TableCell className="text-xs font-mono text-emerald font-bold">{formatCurrency(c.totalSpend)}</TableCell>
                          <TableCell className="text-xs text-cream">{c.preferredRestaurant}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* 10. COUPONS & PROMOTIONS SECTION                             */}
          {/* ============================================================ */}
          {currentSection === "coupons" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                    <Tag className="h-6 w-6 text-emerald" />
                    Coupons & Platform Promotions
                  </h1>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Create global promotional discounts and monitor usage redemption
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsCouponModalOpen(true)} className="bg-emerald text-white hover:bg-emerald-light gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Coupon
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {coupons.map((c) => (
                  <Card key={c.id} className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-emerald tracking-wider">{c.code}</span>
                      <Badge className={c.is_active ? "bg-emerald/20 text-emerald text-[10px]" : "bg-charcoal-surface text-charcoal-muted text-[10px]"}>
                        {c.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-cream">
                        {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-muted space-y-1 pt-2 border-t border-charcoal-border">
                      <div className="flex justify-between">
                        <span>Min Order:</span>
                        <span className="text-cream">₹{c.min_order_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Redemptions:</span>
                        <span className="text-cream">{c.used_count} / {c.usage_limit}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 11. PLATFORM ANALYTICS SECTION                               */}
          {/* ============================================================ */}
          {currentSection === "analytics" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-emerald" />
                  Platform Growth & Revenue Analytics
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Gross merchandise volume, dining peak hours, and restaurant performance
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-charcoal-border bg-charcoal-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-cream">Top Restaurants by Volume</h3>
                  {topRestaurants.length === 0 ? (
                    <p className="text-xs text-charcoal-muted py-4">No order volume data recorded yet across restaurants.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {topRestaurants.map((item) => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-cream">{item.name}</span>
                            <span className="font-mono text-emerald">
                              {formatCurrency(item.gmv)} ({item.ordersCount} orders)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-charcoal-surface overflow-hidden">
                            <div className="h-full bg-emerald" style={{ width: `${Math.min(100, item.percent)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="border-charcoal-border bg-charcoal-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-cream">Peak Dining Time Distribution</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between p-2 rounded-lg bg-charcoal-surface">
                      <span>Dinner Rush (7:30 PM - 10:30 PM)</span>
                      <span className="font-bold text-emerald">58% of orders</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-charcoal-surface">
                      <span>Lunch Rush (12:30 PM - 3:00 PM)</span>
                      <span className="font-bold text-emerald">32% of orders</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-charcoal-surface">
                      <span>Evening Snack & Beverages (4:30 PM - 6:30 PM)</span>
                      <span className="font-bold text-emerald">10% of orders</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 12. NOTIFICATIONS & BROADCAST SECTION                        */}
          {/* ============================================================ */}
          {currentSection === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                    <Bell className="h-6 w-6 text-emerald" />
                    Global Notifications & Broadcasts
                  </h1>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Transmit system updates, maintenance advisories, and feature alerts to all restaurant dashboards
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsBroadcastModalOpen(true)} className="bg-emerald text-white hover:bg-emerald-light gap-1.5">
                  <Send className="h-4 w-4" />
                  New Broadcast
                </Button>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-3">
                <h3 className="text-sm font-bold text-cream">Recent Announcements</h3>
                <div className="space-y-2">
                  {[
                    { title: "KDS Audio Chimes Live", msg: "Kitchen audio alert support is now active across all kitchen display consoles.", time: "2 hours ago" },
                    { title: "Razorpay Instant Split Settlements", msg: "Customers can now split bills seamlessly on their smartphones.", time: "1 day ago" },
                    { title: "Scheduled Supabase Maintenance", msg: "Standard zero-downtime database optimization completed successfully.", time: "3 days ago" },
                  ].map((b, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-charcoal-surface border border-charcoal-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cream">{b.title}</span>
                        <span className="text-[10px] text-charcoal-muted">{b.time}</span>
                      </div>
                      <p className="text-xs text-charcoal-muted">{b.msg}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 13. SUPPORT MANAGEMENT SECTION                               */}
          {/* ============================================================ */}
          {currentSection === "support" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <LifeBuoy className="h-6 w-6 text-emerald" />
                  Support Ticket Management
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Inquiries, printer hardware support, and billing requests from restaurant owners
                </p>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Subject</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Restaurant</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Priority</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Status</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Logged</TableHead>
                      <TableHead className="text-right text-charcoal-muted text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id} className="border-charcoal-border">
                        <TableCell className="text-xs font-bold text-cream">{t.subject}</TableCell>
                        <TableCell className="text-xs text-cream">{t.restaurant?.name || "Restaurant"}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] uppercase ${
                              t.priority === "urgent" || t.priority === "high"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-charcoal-surface text-charcoal-muted"
                            }`}
                          >
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] capitalize ${
                              t.status === "open"
                                ? "bg-amber-500/20 text-amber-300"
                                : t.status === "in_progress"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-emerald/20 text-emerald"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-charcoal-muted">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(t);
                              setResolutionNotes(t.resolution_notes || "");
                            }}
                            className="h-7 text-[11px] border-charcoal-border text-emerald"
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 14. SECURITY & AUDIT LOGS SECTION                            */}
          {/* ============================================================ */}
          {currentSection === "security" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <ShieldAlert className="h-6 w-6 text-emerald" />
                  Security & Platform Audit Logs
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Immutable security audit events, authentications, role assignments, and tenant modifications
                </p>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-charcoal-border">
                      <TableHead className="text-charcoal-muted text-xs">Timestamp</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Action</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Entity Type</TableHead>
                      <TableHead className="text-charcoal-muted text-xs">Actor Identity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="border-charcoal-border">
                        <TableCell className="text-xs font-mono text-charcoal-muted">{formatDate(log.created_at)}</TableCell>
                        <TableCell>
                          <Badge className="bg-charcoal-surface border-charcoal-border text-emerald font-mono text-[10px]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-cream capitalize">{log.entity_type}</TableCell>
                        <TableCell className="text-xs font-mono text-charcoal-muted">
                          {log.actor?.email || "system_service"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 15. WEBSITE SETTINGS SECTION                                 */}
          {/* ============================================================ */}
          {currentSection === "settings" && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <Globe className="h-6 w-6 text-emerald" />
                  Website & Platform Controls
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Configure website branding, announcement banners, and maintenance switches
                </p>
              </div>

              <Card className="border-charcoal-border bg-charcoal-card p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream">Website Brand Name</label>
                    <Input
                      value={websiteSettings.website_name}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, website_name: e.target.value })}
                      className="bg-charcoal-surface border-charcoal-border text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream">Support Email Address</label>
                    <Input
                      type="email"
                      value={websiteSettings.support_email}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, support_email: e.target.value })}
                      className="bg-charcoal-surface border-charcoal-border text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cream">Platform Tagline</label>
                  <Input
                    value={websiteSettings.tagline}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, tagline: e.target.value })}
                    className="bg-charcoal-surface border-charcoal-border text-xs"
                  />
                </div>

                {/* Announcement Banner Controls */}
                <div className="p-4 rounded-xl bg-charcoal-surface border border-charcoal-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-cream">Announcement Banner</p>
                      <p className="text-[11px] text-charcoal-muted">Display a prominent banner across all public pages</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={websiteSettings.announcement_banner_active}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, announcement_banner_active: e.target.checked })
                      }
                      className="h-4 w-4 accent-emerald rounded cursor-pointer"
                    />
                  </div>

                  <Input
                    value={websiteSettings.announcement_banner_text}
                    onChange={(e) =>
                      setWebsiteSettings({ ...websiteSettings, announcement_banner_text: e.target.value })
                    }
                    placeholder="Enter announcement text..."
                    className="bg-charcoal border-charcoal-border text-xs"
                  />
                </div>

                {/* Maintenance Mode & Public Pricing Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-charcoal-surface border border-charcoal-border flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-cream">Maintenance Mode</p>
                      <p className="text-[11px] text-charcoal-muted">Temporarily suspend customer ordering</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={websiteSettings.maintenance_mode}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, maintenance_mode: e.target.checked })
                      }
                      className="h-4 w-4 accent-red-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-charcoal-surface border border-charcoal-border flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-cream">Public Pricing Table</p>
                      <p className="text-[11px] text-charcoal-muted">Show subscription tiers on marketing site</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={websiteSettings.pricing_visible}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, pricing_visible: e.target.checked })
                      }
                      className="h-4 w-4 accent-emerald rounded cursor-pointer"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveWebsiteSettings} className="bg-emerald text-white hover:bg-emerald-light text-xs font-bold">
                  Save Platform Settings
                </Button>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* 16. SYSTEM HEALTH SECTION                                    */}
          {/* ============================================================ */}
          {currentSection === "health" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black text-cream tracking-tight flex items-center gap-2">
                  <Server className="h-6 w-6 text-emerald" />
                  System Health & Diagnostic Telemetry
                </h1>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Microservice connectivity, database pings, and infrastructure status
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Supabase PostgreSQL", status: systemHealth.database, sub: "Latency: 14ms" },
                  { name: "Supabase Auth (GoTrue)", status: systemHealth.authService, sub: "PKCE & Cookie Session Active" },
                  { name: "Storage Bucket (Assets)", status: systemHealth.storage, sub: "restaurant-assets bucket public" },
                  { name: "Razorpay Payment Gateway", status: systemHealth.razorpayGateway, sub: "Test & Production Webhooks" },
                  { name: "Realtime WebSocket Engine", status: systemHealth.realtimeWebsocket, sub: "Order ticket dispatching" },
                  { name: "Platform Availability Uptime", status: `${systemHealth.uptimePercent}%`, sub: "Zero unscheduled downtime" },
                ].map((s, idx) => (
                  <Card key={idx} className="border-charcoal-border bg-charcoal-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cream">{s.name}</span>
                      <Badge className="bg-emerald/20 text-emerald text-[10px] flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-charcoal-muted">{s.sub}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* Modal: Simplified Provision Hotel */}
      {isNewRestModalOpen && (
        <Dialog open={isNewRestModalOpen} onOpenChange={setIsNewRestModalOpen}>
          <DialogContent className="max-w-lg bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-cream flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald" />
                Provision New Hotel / Restaurant
              </DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                Enter the hotel name. DineFlow will automatically generate the login identifier, secure temporary password, and initialize the restaurant tenant.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRestaurant} className="space-y-4 py-2">
              {/* 1. REQUIRED: Hotel Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream flex items-center justify-between">
                  <span>Hotel / Restaurant Name <span className="text-emerald">*</span></span>
                  <span className="text-[10px] text-charcoal-muted font-normal">Required</span>
                </label>
                <Input
                  value={newRestName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewRestName(val);
                  }}
                  placeholder="e.g. Hulsoor Hotel"
                  className="text-xs bg-charcoal-surface border-charcoal-border text-cream font-medium focus:border-emerald"
                  required
                  autoFocus
                />
              </div>

              {/* Live Preview Box */}
              {newRestName.trim().length > 0 && (
                <div className="rounded-lg border border-charcoal-border bg-charcoal-surface/60 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-muted font-semibold">Auto-Generated Login ID:</span>
                    <span className="font-mono text-emerald font-bold">
                      {newRestOwnerEmail || `${newRestName.toLowerCase().replace(/[^a-z0-9]/g, "") || "hotel"}@gmail.com`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-muted font-semibold">Public Menu Slug:</span>
                    <span className="font-mono text-emerald">
                      /menu/{newRestSlug || newRestName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "hotel"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-charcoal-border/60 text-[11px] text-amber-300/90 flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Generated identifier for platform login only. Unverified email cannot receive password reset emails. Super Admin manages credential resets securely.
                    </span>
                  </div>
                </div>
              )}

              {/* 2. OPTIONAL: Owner Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-cream flex items-center justify-between">
                    <span>Owner Name</span>
                    <span className="text-[10px] text-charcoal-muted font-normal">Optional</span>
                  </label>
                  <Input
                    value={newRestOwnerName}
                    onChange={(e) => setNewRestOwnerName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="text-xs bg-charcoal-surface border-charcoal-border text-cream"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-cream flex items-center justify-between">
                    <span>Contact Number</span>
                    <span className="text-[10px] text-charcoal-muted font-normal">Optional</span>
                  </label>
                  <Input
                    value={newRestPhone}
                    onChange={(e) => setNewRestPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="text-xs bg-charcoal-surface border-charcoal-border text-cream"
                  />
                </div>
              </div>

              {/* 3. OPTIONAL: Advanced Options Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedProvisioning(!showAdvancedProvisioning)}
                  className="text-[11px] text-emerald hover:underline flex items-center gap-1 font-semibold"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${showAdvancedProvisioning ? "rotate-90" : ""}`} />
                  {showAdvancedProvisioning ? "Hide Advanced Options" : "Show Advanced Options (Custom Slug, Email, Plan)"}
                </button>

                {showAdvancedProvisioning && (
                  <div className="mt-2.5 p-3 rounded-lg border border-charcoal-border bg-charcoal-surface/40 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-charcoal-muted">Custom URL Slug (leave blank to auto-generate)</label>
                      <Input
                        value={newRestSlug}
                        onChange={(e) => setNewRestSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="e.g. hulsoor-hotel"
                        className="text-xs bg-charcoal-surface border-charcoal-border font-mono text-emerald"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-charcoal-muted">Custom Verified Email (leave blank to auto-generate)</label>
                      <Input
                        type="email"
                        value={newRestOwnerEmail}
                        onChange={(e) => setNewRestOwnerEmail(e.target.value)}
                        placeholder="owner@hotel.com"
                        className="text-xs bg-charcoal-surface border-charcoal-border"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-charcoal-muted">City</label>
                        <Input
                          value={newRestCity}
                          onChange={(e) => setNewRestCity(e.target.value)}
                          placeholder="Mumbai"
                          className="text-xs bg-charcoal-surface border-charcoal-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-charcoal-muted">Subscription Plan</label>
                        <select
                          value={newRestPlan}
                          onChange={(e) => setNewRestPlan(e.target.value)}
                          className="w-full h-9 text-xs rounded-md bg-charcoal-surface border border-charcoal-border text-cream"
                        >
                          <option value="free">Starter Free (Default)</option>
                          <option value="basic">Growth Basic</option>
                          <option value="pro">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-charcoal-border flex items-center justify-between sm:justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewRestModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingRest || !newRestName.trim()}
                  className="bg-emerald text-white hover:bg-emerald-light font-semibold"
                >
                  {isSubmittingRest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Provisioning Hotel...
                    </>
                  ) : (
                    "Provision Hotel & Account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Credentials Reveal (Shown Once) */}
      {isCredentialsModalOpen && provisionedCreds && (
        <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald mb-1">
                <CheckCircle2 className="h-6 w-6" />
                <DialogTitle className="text-lg font-bold text-cream">Hotel Provisioned Successfully!</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-charcoal-muted">
                Initial login credentials for <span className="text-cream font-bold">{provisionedCreds.hotelName}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              {/* Single-view warning */}
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldAlert className="h-4 w-4" />
                  One-Time Display Warning
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  This temporary password will <strong className="text-white">never be displayed again</strong>. Copy these credentials now and deliver them securely to the hotel owner. The owner will be required to change their password upon first login.
                </p>
              </div>

              {/* Credentials Box */}
              <div className="rounded-lg border border-charcoal-border bg-charcoal-surface p-4 space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Hotel Tenant</span>
                  <span className="text-sm font-bold text-cream">{provisionedCreds.hotelName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Login Identifier (Email)</span>
                  <span className="text-xs font-bold text-emerald select-all">{provisionedCreds.loginEmail}</span>
                  {provisionedCreds.isGeneratedEmail && (
                    <span className="text-[10px] text-charcoal-muted block font-sans mt-0.5">
                      (Platform Login Identifier)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Temporary Password</span>
                  <div className="flex items-center justify-between bg-charcoal border border-charcoal-border rounded p-2 mt-1">
                    <span className="text-sm font-black text-amber-300 tracking-wider select-all">
                      {provisionedCreds.tempPassword}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Login URL</span>
                  <span className="text-xs text-cream select-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Menu URL</span>
                  <span className="text-xs text-emerald select-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/menu/${provisionedCreds.slug}` : `/menu/${provisionedCreds.slug}`}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const text = [
                    `DineFlow Hotel Account Provisioned`,
                    `Hotel: ${provisionedCreds.hotelName}`,
                    `Login ID: ${provisionedCreds.loginEmail}`,
                    `Temporary Password: ${provisionedCreds.tempPassword}`,
                    `Login URL: ${origin}/login`,
                    `Public Menu: ${origin}/menu/${provisionedCreds.slug}`,
                    `Note: You must set your new personal password upon first login.`,
                  ].join("\n");
                  navigator.clipboard.writeText(text).catch(() => {});
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 3000);
                }}
                className="w-full sm:w-auto bg-emerald text-white hover:bg-emerald-light text-xs font-semibold"
              >
                {copiedCreds ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" /> Copied to Clipboard!
                  </>
                ) : (
                  "Copy All Credentials"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Password Reset Temporary Credential Reveal */}
      {isResetModalOpen && resetOwnerCreds && (
        <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Lock className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-cream">New Temporary Password Generated</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-charcoal-muted">
                The password for <span className="text-cream font-bold">{resetOwnerCreds.hotelName}</span> has been securely reset.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldAlert className="h-4 w-4" />
                  One-Time Reset Password
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Provide this new temporary password to the hotel owner. They will be required to change it immediately upon logging in.
                </p>
              </div>

              <div className="rounded-lg border border-charcoal-border bg-charcoal-surface p-4 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">Account Identifier</span>
                  <span className="text-xs font-bold text-emerald select-all">{resetOwnerCreds.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-muted uppercase block font-sans font-semibold">New Temporary Password</span>
                  <div className="bg-charcoal border border-charcoal-border rounded p-2 mt-1">
                    <span className="text-sm font-black text-amber-300 tracking-wider select-all">
                      {resetOwnerCreds.tempPassword}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const text = [
                    `DineFlow Password Reset`,
                    `Hotel: ${resetOwnerCreds.hotelName}`,
                    `Login ID: ${resetOwnerCreds.email}`,
                    `New Temporary Password: ${resetOwnerCreds.tempPassword}`,
                    `Login URL: ${origin}/login`,
                  ].join("\n");
                  navigator.clipboard.writeText(text).catch(() => {});
                  setCopiedResetCreds(true);
                  setTimeout(() => setCopiedResetCreds(false), 3000);
                }}
                className="w-full sm:w-auto bg-emerald text-white hover:bg-emerald-light text-xs font-semibold"
              >
                {copiedResetCreds ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" /> Copied!
                  </>
                ) : (
                  "Copy Credentials"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: View Account Details */}
      {isViewMemberModalOpen && selectedMember && (
        <Dialog open={isViewMemberModalOpen} onOpenChange={setIsViewMemberModalOpen}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-cream flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald" />
                Owner Account Details
              </DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                System organization details and security metadata
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-charcoal-border bg-charcoal-surface p-3.5 space-y-2">
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Hotel / Restaurant:</span>
                  <span className="font-bold text-cream">{selectedMember.restaurant?.name || "Hotel"}</span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Public URL Slug:</span>
                  <span className="font-mono text-emerald">{selectedMember.restaurant?.slug || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Owner Name:</span>
                  <span className="font-medium text-cream">{selectedMember.profiles?.full_name || "Owner"}</span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Login Identifier:</span>
                  <span className="font-mono text-emerald font-semibold">{selectedMember.profiles?.email || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Account Status:</span>
                  <span className={selectedMember.restaurant?.is_suspended ? "text-red-400 font-bold" : "text-emerald font-bold"}>
                    {selectedMember.restaurant?.is_suspended ? "Suspended" : "Active"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Subscription Plan:</span>
                  <span className="font-bold text-cream">{selectedMember.planName || "Starter Free"}</span>
                </div>
                <div className="flex justify-between border-b border-charcoal-border pb-1.5">
                  <span className="text-charcoal-muted">Created Date:</span>
                  <span className="text-charcoal-muted">{formatDate(selectedMember.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Last Sign-in:</span>
                  <span className="text-charcoal-muted">
                    {selectedMember.last_sign_in_at || selectedMember.profiles?.last_sign_in_at
                      ? formatDate(selectedMember.last_sign_in_at || (selectedMember.profiles?.last_sign_in_at ?? ""))
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewMemberModalOpen(false);
                  handleResetOwnerPassword(selectedMember);
                }}
                className="text-amber-300 border-charcoal-border text-xs"
              >
                <Lock className="h-3 w-3 mr-1" /> Reset Password
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsViewMemberModalOpen(false)}
                className="bg-emerald text-white hover:bg-emerald-light text-xs"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Create Coupon */}
      {isCouponModalOpen && (
        <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-cream">Create Promotion Coupon</DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                Add a new discount code for customer checkout
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCoupon} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Coupon Code</label>
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE25"
                  className="text-xs bg-charcoal-surface border-charcoal-border font-mono text-emerald"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cream">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as "percentage" | "fixed")}
                    className="w-full h-9 text-xs rounded-md bg-charcoal-surface border border-charcoal-border text-cream"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed INR (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cream">Discount Value</label>
                  <Input
                    type="number"
                    value={couponValue}
                    onChange={(e) => setCouponValue(Number(e.target.value))}
                    className="text-xs bg-charcoal-surface border-charcoal-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Minimum Order Amount (₹)</label>
                <Input
                  type="number"
                  value={couponMinOrder}
                  onChange={(e) => setCouponMinOrder(Number(e.target.value))}
                  className="text-xs bg-charcoal-surface border-charcoal-border"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCouponModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald text-white hover:bg-emerald-light">
                  Save Coupon
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Broadcast Alert */}
      {isBroadcastModalOpen && (
        <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-cream">Send Broadcast Alert</DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                Push an instant notification to all restaurant dashboards
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendBroadcast} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Notification Title</label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Scheduled Network Upgrade"
                  className="text-xs bg-charcoal-surface border-charcoal-border"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Broadcast Content</label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type the message for restaurant managers and owners..."
                  className="w-full text-xs p-2 rounded-md bg-charcoal-surface border border-charcoal-border text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBroadcastModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald text-white hover:bg-emerald-light">
                  Transmit Broadcast
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Resolve Support Ticket */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream space-y-3">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-cream">Ticket Resolution</DialogTitle>
              <DialogDescription className="text-xs text-charcoal-muted">
                {selectedTicket.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 rounded-lg bg-charcoal-surface border border-charcoal-border text-xs text-charcoal-muted space-y-1">
              <p className="font-semibold text-cream">Reported Issue:</p>
              <p>{selectedTicket.message}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cream">Resolution Notes</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution steps or answer provided..."
                className="w-full text-xs p-2 rounded-md bg-charcoal-surface border border-charcoal-border text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              <Button size="sm" onClick={handleResolveTicket} className="bg-emerald text-white hover:bg-emerald-light">
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
