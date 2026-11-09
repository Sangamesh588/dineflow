"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MenuItem,
  MenuCategory,
  MenuItemVariant,
  MenuItemAddon,
  CartItem,
  Restaurant,
  RestaurantSettings,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Utensils,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Armchair,
  MapPin,
  ShieldCheck,
  ChevronRight,
  QrCode,
  Loader2,
  Search,
  X,
} from "lucide-react";

interface ResolvedTableData {
  isValid: boolean;
  tableId?: string;
  tableNumber?: string;
  displayName?: string | null;
  capacity?: number;
  status?: string;
  error?: string;
}

interface CustomerMenuClientProps {
  restaurant: Restaurant;
  settings: RestaurantSettings;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  resolvedTable?: ResolvedTableData;
  tableTokenParam?: string | null;
}

export function CustomerMenuClient({
  restaurant,
  settings,
  categories,
  menuItems,
  resolvedTable,
  tableTokenParam,
}: CustomerMenuClientProps) {
  const router = useRouter();

  // Table state
  const isTableVerified = resolvedTable?.isValid ?? false;
  const tableDisplay = resolvedTable?.tableNumber || "Unassigned Table";

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non-veg">("all");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  // Customer details for order
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [orderInstructions, setOrderInstructions] = useState("");

  // Modal for customizing / inspecting an item
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [specialNotes, setSpecialNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Open item modal
  const handleOpenItem = (item: MenuItem) => {
    if (!item.is_available) return;
    setActiveItem(item);
    setSelectedVariant(item.variants && item.variants.length > 0 ? item.variants[0] : null);
    setSelectedAddons([]);
    setSpecialNotes("");
    setQuantity(1);
  };

  // Calculate price of the item currently in modal
  const currentModalUnitPrice = useMemo(() => {
    if (!activeItem) return 0;
    let price = Number(activeItem.price);
    if (selectedVariant) {
      price += Number(selectedVariant.price_adjustment);
    }
    selectedAddons.forEach((addon) => {
      price += Number(addon.additional_price);
    });
    return price;
  }, [activeItem, selectedVariant, selectedAddons]);

  // Add customized item to cart
  const handleAddToCart = () => {
    if (!activeItem) return;

    const addonIds = selectedAddons.map((a) => a.id).sort().join("-");
    const variantId = selectedVariant?.id || "none";
    const cartItemId = `${activeItem.id}_${variantId}_${addonIds}`;

    const existingIndex = cart.findIndex((c) => c.cartItemId === cartItemId);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * currentModalUnitPrice;
      setCart(updated);
    } else {
      const newCartItem: CartItem = {
        cartItemId,
        menuItem: activeItem,
        variant: selectedVariant,
        selectedAddons: [...selectedAddons],
        quantity,
        specialInstructions: specialNotes,
        unitPrice: currentModalUnitPrice,
        totalPrice: currentModalUnitPrice * quantity,
      };
      setCart([...cart, newCartItem]);
    }

    setActiveItem(null);
  };

  // Modify quantity in cart
  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  // Cart financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const taxRate = settings.tax_percentage || 5.0;
  const taxAmount = (subtotal * taxRate) / 100;
  const serviceChargeRate = settings.service_charge || 0.0;
  const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;
  const grandTotal = subtotal + taxAmount + serviceChargeAmount;

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Group items by category
  const activeCategories = categories.filter((c) => c.is_active);

  // Filtered menu items based on dietary preferences and search query
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (dietaryFilter === "veg" && !item.is_vegetarian) return false;
      if (dietaryFilter === "non-veg" && item.is_vegetarian) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [menuItems, dietaryFilter, searchQuery]);

  // Submit Order (Phase 6 Order Creation API)
  const handlePlaceOrder = async () => {
    if (!isTableVerified) {
      setIsTableModalOpen(true);
      return;
    }

    setIsPlacingOrder(true);

    try {
      const payload = {
        restaurantSlug: restaurant.slug,
        tableToken: tableTokenParam || "demo_token_t2_f4e3d2c1b0a9f8e7d",
        customerName: guestName || "Table Guest",
        customerPhone: guestPhone || null,
        specialInstructions: orderInstructions || null,
        idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          variantId: c.variant?.id || null,
          addonIds: c.selectedAddons.map((a) => a.id),
          quantity: c.quantity,
          specialInstructions: c.specialInstructions,
          unitPrice: c.unitPrice,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Order placement failed");
        setIsPlacingOrder(false);
        return;
      }

      // Empty cart and redirect to live tracking page
      setCart([]);
      setIsCartOpen(false);
      router.push(`/order-status/${data.trackingToken}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error placing order";
      alert(msg);
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-cream pb-32">
      {/* 1. RESTAURANT HERO BANNER */}
      <div className="relative w-full bg-charcoal-card border-b border-charcoal-border">
        {restaurant.cover_url && (
          <div className="h-44 sm:h-64 w-full overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.cover_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-card via-charcoal-card/60 to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4 py-6 max-w-4xl relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-emerald/40 object-cover bg-charcoal shadow-xl"
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-emerald/40 flex items-center justify-center bg-charcoal text-emerald font-black text-2xl shadow-xl">
                  {restaurant.name.charAt(0)}
                </div>
              )}

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
                  {restaurant.cuisine_type} • {restaurant.opening_time} - {restaurant.closing_time}
                </p>
                {restaurant.address && (
                  <p className="text-[11px] text-charcoal-muted flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-emerald shrink-0" />
                    <span>{restaurant.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Active Table indicator */}
            <div className="flex flex-col gap-1 self-start sm:self-center">
              {isTableVerified ? (
                <div className="rounded-xl border border-emerald/40 bg-emerald/10 px-3.5 py-2 flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-emerald" />
                  <div>
                    <p className="text-[10px] text-emerald uppercase tracking-wider font-bold">
                      Verified Station
                    </p>
                    <p className="text-sm font-black text-cream font-mono">{tableDisplay}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsTableModalOpen(true)}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 flex items-center gap-2 text-left hover:bg-amber-500/20 transition-colors"
                >
                  <QrCode className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                      No Table Assigned
                    </p>
                    <p className="text-xs text-cream font-medium">Tap to verify table →</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Table not assigned alert */}
          {!isTableVerified && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-2 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Browsing menu preview. Scan your table QR or tap with NFC to enable table ordering.</span>
              </div>
              <button
                onClick={() => {
                  router.push(`/menu/${restaurant.slug}?table_token=demo_token_t2_f4e3d2c1b0a9f8e7d`);
                }}
                className="underline font-bold text-cream shrink-0 hover:text-emerald"
              >
                Simulate Table T-02
              </button>
            </div>
          )}

          {/* Restaurant closed warning */}
          {!settings.accepting_orders && (
            <div className="mt-4 rounded-xl bg-red-950/40 border border-red-800/50 p-3 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>The kitchen is currently pausing digital orders. You can browse the menu.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEARCH & STICKY CATEGORY / DIETARY NAVIGATION */}
      <div className="sticky top-0 z-20 bg-charcoal/95 backdrop-blur-md border-b border-charcoal-border py-3 space-y-2.5 shadow-md">
        <div className="container mx-auto px-4 max-w-4xl space-y-2.5">
          {/* Quick Search & Dietary Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
              <input
                type="text"
                placeholder="Search dishes, starters, biryanis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-charcoal-surface border border-charcoal-border rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-cream placeholder:text-charcoal-muted/70 focus:outline-none focus:border-emerald transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-cream p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dietary Toggle Pills */}
            <div className="flex items-center gap-1.5 shrink-0 bg-charcoal-surface p-1 rounded-xl border border-charcoal-border self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setDietaryFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  dietaryFilter === "all"
                    ? "bg-charcoal-card text-cream shadow-sm"
                    : "text-charcoal-muted hover:text-cream"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter("veg")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  dietaryFilter === "veg"
                    ? "bg-green-950/80 border border-green-700/60 text-green-300 shadow-sm"
                    : "text-charcoal-muted hover:text-green-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <span>Veg Only</span>
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter("non-veg")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  dietaryFilter === "non-veg"
                    ? "bg-red-950/80 border border-red-700/60 text-red-300 shadow-sm"
                    : "text-charcoal-muted hover:text-red-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Category Horizontal Scroll Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategoryId === "all"
                  ? "bg-emerald text-white shadow-sm shadow-emerald/30 scale-[1.02]"
                  : "bg-charcoal-surface border border-charcoal-border/70 text-charcoal-muted hover:text-cream hover:border-charcoal-border"
              }`}
            >
              All Items
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategoryId === cat.id
                    ? "bg-emerald text-white shadow-sm shadow-emerald/30 scale-[1.02]"
                    : "bg-charcoal-surface border border-charcoal-border/70 text-charcoal-muted hover:text-cream hover:border-charcoal-border"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MENU ITEMS FEED */}
      <main className="container mx-auto px-4 max-w-4xl mt-6 space-y-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-charcoal-border bg-charcoal-card/60 backdrop-blur-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-charcoal-surface border border-charcoal-border mx-auto flex items-center justify-center text-charcoal-muted">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-cream">No matching dishes found</h3>
            <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
              We couldn&apos;t find any items matching your search or dietary filter. Try clearing filters or searching for something else.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setDietaryFilter("all");
                setSelectedCategoryId("all");
              }}
              className="mt-2 text-xs"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          activeCategories
            .filter((cat) => selectedCategoryId === "all" || cat.id === selectedCategoryId)
            .map((cat) => {
              const catItems = filteredItems.filter((i) => i.category_id === cat.id);
              if (catItems.length === 0) return null;

              return (
                <section key={cat.id} className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-charcoal-border/60 pb-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-cream tracking-tight flex items-center gap-2">
                      <span>{cat.name}</span>
                      <span className="text-xs font-semibold text-emerald bg-emerald/10 px-2 py-0.5 rounded-full border border-emerald/20">
                        {catItems.length}
                      </span>
                    </h2>
                    {cat.description && (
                      <p className="text-xs text-charcoal-muted hidden sm:block">{cat.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className={`rounded-2xl border p-3.5 sm:p-4 flex gap-3.5 transition-all select-none relative overflow-hidden ${
                          item.is_available
                            ? "border-charcoal-border bg-charcoal-card hover:border-emerald/40 cursor-pointer shadow-sm active:scale-[0.99] hover:shadow-md"
                            : "border-charcoal-border/50 bg-charcoal-card/40 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {/* Left: Dish Information */}
                        <div className="flex-1 flex flex-col justify-between space-y-1.5 min-w-0">
                          <div>
                            {/* Veg / Non-Veg Indicator */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center p-0.5 ${
                                  item.is_vegetarian
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-red-500 bg-red-500/10"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.is_vegetarian ? "bg-green-500" : "bg-red-500"
                                  }`}
                                />
                              </span>
                              <span className="text-[10px] uppercase font-bold text-charcoal-muted tracking-wider">
                                {item.is_vegetarian ? "Veg" : "Non-Veg"}
                              </span>
                              {item.variants && item.variants.length > 0 && (
                                <span className="text-[10px] text-emerald bg-emerald/10 px-1.5 py-0.5 rounded font-semibold border border-emerald/20">
                                  Customizable
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-cream leading-snug line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-charcoal-muted line-clamp-2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-base font-black text-emerald">
                              {formatCurrency(item.price)}
                            </span>

                            <div className="text-[11px] text-charcoal-muted flex items-center gap-1">
                              <Clock className="h-3 w-3 text-charcoal-muted" />
                              <span>{item.preparation_time_minutes} min</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Dish Thumbnail & Quick Add Button */}
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl overflow-hidden bg-charcoal-surface border border-charcoal-border/80">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-charcoal-muted">
                              <Utensils className="h-7 w-7 opacity-25" />
                            </div>
                          )}

                          {/* Quick Action Button overlay */}
                          <div className="absolute bottom-1.5 right-1.5">
                            {item.is_available ? (
                              <button
                                type="button"
                                className="rounded-lg bg-charcoal/95 border border-emerald text-emerald hover:bg-emerald hover:text-white px-2.5 py-1 text-xs font-black shadow-lg shadow-black/40 transition-all active:scale-90 flex items-center gap-0.5"
                              >
                                <span>+</span>
                                <span>ADD</span>
                              </button>
                            ) : (
                              <span className="rounded-lg bg-red-950/95 border border-red-700/60 px-2 py-0.5 text-[10px] font-bold text-red-300 shadow">
                                SOLD OUT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
        )}
      </main>

      {/* 4. ITEM DETAILS & CUSTOMIZATION DIALOG */}
      <Dialog open={activeItem !== null} onOpenChange={(open) => !open && setActiveItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-charcoal-card border-charcoal-border">
          {activeItem && (
            <div>
              {/* Top Dish Image */}
              {activeItem.image_url && (
                <div className="relative h-48 w-full bg-charcoal-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeItem.image_url}
                    alt={activeItem.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-card to-transparent" />
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-sm border flex items-center justify-center p-0.5 ${
                        activeItem.is_vegetarian ? "border-green-500" : "border-red-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          activeItem.is_vegetarian ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    </span>
                    <span className="text-xs font-bold text-charcoal-muted uppercase">
                      {activeItem.is_vegetarian ? "Pure Vegetarian" : "Non-Vegetarian"}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-cream">{activeItem.name}</h2>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {activeItem.description}
                  </p>
                </div>

                {/* Variants Selection (if any) */}
                {activeItem.variants && activeItem.variants.length > 0 && (
                  <div className="space-y-2 border-t border-charcoal-border pt-3">
                    <label className="text-xs font-bold text-cream uppercase tracking-wider">
                      Choose Portion / Size
                    </label>
                    <div className="space-y-1.5">
                      {activeItem.variants.map((variant) => (
                        <label
                          key={variant.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                            selectedVariant?.id === variant.id
                              ? "border-emerald bg-emerald/10 text-cream font-semibold"
                              : "border-charcoal-border bg-charcoal text-charcoal-muted hover:text-cream"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="variant"
                              checked={selectedVariant?.id === variant.id}
                              onChange={() => setSelectedVariant(variant)}
                              className="accent-emerald"
                            />
                            <span>{variant.name}</span>
                          </div>
                          <span>
                            {variant.price_adjustment > 0
                              ? `+${formatCurrency(variant.price_adjustment)}`
                              : "Included"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add-ons Selection (if any) */}
                {activeItem.addons && activeItem.addons.length > 0 && (
                  <div className="space-y-2 border-t border-charcoal-border pt-3">
                    <label className="text-xs font-bold text-cream uppercase tracking-wider">
                      Select Add-ons & Extras
                    </label>
                    <div className="space-y-1.5">
                      {activeItem.addons.map((addon) => {
                        const isChecked = selectedAddons.some((a) => a.id === addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                              isChecked
                                ? "border-emerald bg-emerald/10 text-cream font-semibold"
                              : "border-charcoal-border bg-charcoal text-charcoal-muted hover:text-cream"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAddons([...selectedAddons, addon]);
                                  } else {
                                    setSelectedAddons(
                                      selectedAddons.filter((a) => a.id !== addon.id)
                                    );
                                  }
                                }}
                                className="accent-emerald"
                              />
                              <span>{addon.name}</span>
                            </div>
                            <span>+{formatCurrency(addon.additional_price)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cooking Instructions */}
                <div className="space-y-1.5 border-t border-charcoal-border pt-3">
                  <label className="text-xs font-semibold text-cream">
                    Special Cooking Instructions
                  </label>
                  <Input
                    placeholder="e.g. Extra spicy, no onions, gluten sensitive..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Quantity and Add Button */}
                <div className="flex items-center justify-between border-t border-charcoal-border pt-4">
                  <div className="flex items-center gap-3 bg-charcoal p-1 rounded-xl border border-charcoal-border">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-1.5 rounded-lg text-cream hover:bg-charcoal-surface disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-sm text-cream w-4 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-1.5 rounded-lg text-cream hover:bg-charcoal-surface"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="gap-2 px-6 font-bold text-sm shadow-lg shadow-emerald/20"
                  >
                    <span>Add to Cart</span>
                    <span>•</span>
                    <span>{formatCurrency(currentModalUnitPrice * quantity)}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. FLOATING BOTTOM BAR (CART TRIGGER) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="container mx-auto max-w-lg pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-emerald hover:bg-emerald-hover text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-black/60 flex items-center justify-between transition-all active:scale-[0.98] border border-emerald-light/40 ring-2 ring-emerald/30 animate-in fade-in slide-in-from-bottom-3 duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white text-emerald-dark flex items-center justify-center font-black text-sm shadow">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-light font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-light inline-block animate-pulse" />
                    <span>{tableDisplay}</span>
                  </p>
                  <p className="text-sm sm:text-base font-extrabold text-white">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-black/25 px-3.5 py-2 rounded-xl">
                <span>View Order</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 6. FULL CART & CHECKOUT DRAWER */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Your Dining Order</span>
              <span className="text-sm font-normal text-charcoal-muted">
                {totalCartCount} {totalCartCount === 1 ? "Item" : "Items"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {tableDisplay} • Verified digital order dispatch
            </DialogDescription>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShoppingBag className="h-10 w-10 text-charcoal-muted mx-auto" />
              <p className="text-sm font-semibold text-cream">Your cart is currently empty</p>
              <p className="text-xs text-charcoal-muted">
                Explore our menu and add items to begin ordering.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Table status badge in drawer */}
              <div className="p-3 rounded-xl bg-charcoal border border-charcoal-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-emerald" />
                  <span className="font-semibold text-cream">{tableDisplay}</span>
                </div>
                {isTableVerified ? (
                  <span className="text-[11px] text-emerald font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified Station
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Scan Table Stand
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-3 rounded-xl border border-charcoal-border bg-charcoal space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-cream">{item.menuItem.name}</p>
                        {item.variant && (
                          <p className="text-xs text-emerald font-medium">
                            Portion: {item.variant.name}
                          </p>
                        )}
                        {item.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-charcoal-muted">
                            Extras: {item.selectedAddons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[11px] text-amber-300 italic">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-cream">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-charcoal-muted">
                        {formatCurrency(item.unitPrice)} each
                      </span>

                      <div className="flex items-center gap-2 bg-charcoal-surface rounded-lg p-1 border border-charcoal-border">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.cartItemId, -1)}
                          className="p-1 hover:text-red-400"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-cream w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.cartItemId, 1)}
                          className="p-1 hover:text-emerald"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guest details (optional) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  placeholder="Your Name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-xs h-9"
                />
                <Input
                  placeholder="Phone (for updates)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <Input
                placeholder="Special kitchen instructions (e.g. less spicy, extra chutney)"
                value={orderInstructions}
                onChange={(e) => setOrderInstructions(e.target.value)}
                className="text-xs h-9"
              />

              {/* Bill Summary Breakdown */}
              <div className="p-3.5 rounded-xl bg-charcoal border border-charcoal-border space-y-1.5 text-xs">
                <div className="flex justify-between text-charcoal-muted">
                  <span>Subtotal</span>
                  <span className="text-cream font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>GST / Tax ({taxRate}%)</span>
                  <span className="text-cream font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                {serviceChargeRate > 0 && (
                  <div className="flex justify-between text-charcoal-muted">
                    <span>Service Charge ({serviceChargeRate}%)</span>
                    <span className="text-cream font-medium">
                      {formatCurrency(serviceChargeAmount)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-charcoal-border my-1" />
                <div className="flex justify-between text-sm font-black text-cream">
                  <span>Estimated Total (INR)</span>
                  <span className="text-emerald text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!settings.accepting_orders || isPlacingOrder}
                  className="w-full gap-2 py-6 text-sm font-bold shadow-xl shadow-emerald/20"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Order to Kitchen...</span>
                    </>
                  ) : isTableVerified ? (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Send Order to Kitchen ({tableDisplay})</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" />
                      <span>Verify Table to Place Order</span>
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-charcoal-muted text-center mt-2">
                  Live KDS dispatch • Instant kitchen ticket printing
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. TABLE VERIFICATION PROMPT DIALOG */}
      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-amber-400" />
              Table Verification Required
            </DialogTitle>
            <DialogDescription>
              To ensure orders are brought to the right guests, please scan the QR code on your dining table stand.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-charcoal border border-charcoal-border text-xs text-charcoal-muted space-y-3">
            <p>
              If you are testing the platform, click below to simulate scanning Table T-02:
            </p>
            <Button
              className="w-full gap-2 text-xs"
              onClick={() => {
                setIsTableModalOpen(false);
                router.push(`/menu/${restaurant.slug}?table_token=demo_token_t2_f4e3d2c1b0a9f8e7d`);
              }}
            >
              Simulate Scan Table T-02
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
