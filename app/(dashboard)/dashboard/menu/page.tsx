"use client";

import React, { useState, useEffect } from "react";
import { MenuItem, MenuCategory, MenuItemVariant, MenuItemAddon, Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  Utensils,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  UploadCloud,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function MenuManagementPage() {
  const isConfigured = isSupabaseConfigured();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "nonveg">("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form input states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState<number | string>(250);
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formPrepTime, setFormPrepTime] = useState<number>(15);
  const [formVariants, setFormVariants] = useState<MenuItemVariant[]>([]);
  const [formAddons, setFormAddons] = useState<MenuItemAddon[]>([]);

  // Fetch live Supabase items if connected
  useEffect(() => {
    async function loadData() {
      if (!isConfigured) return;
      setIsLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: member } = await supabase
            .from("restaurant_members")
            .select("restaurant:restaurants(*)")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (member?.restaurant) {
            const rest = member.restaurant as unknown as Restaurant;
            setRestaurantId(rest.id);
            setRestaurantSlug(rest.slug);

            // Fetch categories
            const { data: catData } = await supabase
              .from("menu_categories")
              .select("*")
              .eq("restaurant_id", rest.id)
              .order("sort_order", { ascending: true });

            if (catData) {
              setCategories(catData);
            }

            // Fetch menu items with variants and addons
            const { data: itemData, error: itemErr } = await supabase
              .from("menu_items")
              .select("*, variants:menu_item_variants(*), addons:menu_item_addons(*)")
              .eq("restaurant_id", rest.id)
              .order("sort_order", { ascending: true });

            if (!itemErr && itemData) {
              setItems(itemData);
            } else if (!itemErr) {
              setItems([]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading menu:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isConfigured]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategory(categories[0]?.id || "");
    setFormPrice(250);
    setFormDesc("");
    setFormImage("");
    setFormIsVeg(true);
    setFormIsAvailable(true);
    setFormPrepTime(15);
    setFormVariants([]);
    setFormAddons([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category_id || categories[0]?.id || "");
    setFormPrice(item.price);
    setFormDesc(item.description || "");
    setFormImage(item.image_url || "");
    setFormIsVeg(item.is_vegetarian);
    setFormIsAvailable(item.is_available);
    setFormPrepTime(item.preparation_time_minutes || 15);
    setFormVariants(item.variants || []);
    setFormAddons(item.addons || []);
    setIsFormOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isConfigured) {
      setFormImage(URL.createObjectURL(file));
      return;
    }

    try {
      setUploadingImage(true);
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `food-${Date.now()}.${ext}`;
      const path = `dishes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-assets")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("restaurant-assets")
        .getPublicUrl(path);

      setFormImage(data.publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      alert(`Image upload error: ${msg}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Variant / Add-on helpers
  const handleAddVariantRow = () => {
    const newVariant: MenuItemVariant = {
      id: `v_${Date.now()}`,
      restaurant_id: restaurantId || "demo",
      menu_item_id: editingItem?.id || "",
      name: "",
      price_adjustment: 50,
      is_available: true,
    };
    setFormVariants([...formVariants, newVariant]);
  };

  const handleAddAddonRow = () => {
    const newAddon: MenuItemAddon = {
      id: `a_${Date.now()}`,
      restaurant_id: restaurantId || "demo",
      menu_item_id: editingItem?.id || "",
      name: "",
      additional_price: 30,
      is_available: true,
    };
    setFormAddons([...formAddons, newAddon]);
  };

  const handleSaveItem = async () => {
    if (!formName.trim() || !formPrice) return;

    const priceNum = Number(formPrice);

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();

        if (editingItem) {
          // Update item
          const { error } = await supabase
            .from("menu_items")
            .update({
              category_id: formCategory || null,
              name: formName,
              description: formDesc || null,
              image_url: formImage || null,
              price: priceNum,
              is_vegetarian: formIsVeg,
              is_available: formIsAvailable,
              preparation_time_minutes: Number(formPrepTime),
            })
            .eq("id", editingItem.id);

          if (error) throw error;
        } else {
          // Insert item
          const { data: newItem, error } = await supabase
            .from("menu_items")
            .insert({
              restaurant_id: restaurantId,
              category_id: formCategory || null,
              name: formName,
              description: formDesc || null,
              image_url: formImage || null,
              price: priceNum,
              is_vegetarian: formIsVeg,
              is_available: formIsAvailable,
              preparation_time_minutes: Number(formPrepTime),
              sort_order: items.length + 1,
            })
            .select()
            .single();

          if (error) throw error;
          if (newItem) {
            setItems([...items, { ...newItem, variants: formVariants, addons: formAddons }]);
          }
        }
      } catch (err) {
        console.error("Failed saving to Supabase:", err);
      }
    }

    // Local state sync
    if (editingItem) {
      setItems(
        items.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                name: formName,
                category_id: formCategory,
                price: priceNum,
                description: formDesc,
                image_url: formImage,
                is_vegetarian: formIsVeg,
                is_available: formIsAvailable,
                preparation_time_minutes: Number(formPrepTime),
                variants: formVariants,
                addons: formAddons,
              }
            : it
        )
      );
      setFeedback(`Updated "${formName}"`);
    } else {
      const newItem: MenuItem = {
        id: `item_${Date.now()}`,
        restaurant_id: restaurantId || "demo",
        category_id: formCategory,
        name: formName,
        description: formDesc,
        image_url: formImage || null,
        price: priceNum,
        is_vegetarian: formIsVeg,
        is_available: formIsAvailable,
        preparation_time_minutes: Number(formPrepTime),
        sort_order: items.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: formVariants,
        addons: formAddons,
      };
      setItems([...items, newItem]);
      setFeedback(`Added "${formName}" to menu`);
    }

    setIsFormOpen(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const nextVal = !item.is_available;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        await supabase
          .from("menu_items")
          .update({ is_available: nextVal })
          .eq("id", item.id);
      } catch (e) {
        console.error("Failed toggle in Supabase:", e);
      }
    }

    setItems(
      items.map((it) => (it.id === item.id ? { ...it, is_available: nextVal } : it))
    );
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        await supabase.from("menu_items").delete().eq("id", deletingItem.id);
      } catch (e) {
        console.error("Failed deletion in Supabase:", e);
      }
    }

    setItems(items.filter((it) => it.id !== deletingItem.id));
    setFeedback(`Removed "${deletingItem.name}" from menu`);
    setDeletingItem(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || item.category_id === selectedCategory;

    const matchesAvailability =
      availabilityFilter === "all"
        ? true
        : availabilityFilter === "available"
        ? item.is_available
        : !item.is_available;

    const matchesDiet =
      dietFilter === "all"
        ? true
        : dietFilter === "veg"
        ? item.is_vegetarian
        : !item.is_vegetarian;

    return matchesSearch && matchesCategory && matchesAvailability && matchesDiet;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Utensils className="h-7 w-7 text-emerald" />
            Menu Management
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Create and edit food items, prices in INR, variant sizes, and real-time availability
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href={`/menu/${restaurantSlug}`} target="_blank">
            <Button variant="secondary" size="sm" className="gap-2 text-emerald">
              <ExternalLink className="h-4 w-4" />
              Customer View
            </Button>
          </Link>
          <Button size="sm" onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Food Item
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-charcoal-border bg-charcoal-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
            <Input
              placeholder="Search by dish name or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-charcoal"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-52">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="w-full md:w-44">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as "all" | "available" | "unavailable")}
              className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
            >
              <option value="all">All Status</option>
              <option value="available">In Stock Only</option>
              <option value="unavailable">Out of Stock</option>
            </select>
          </div>

          {/* Diet Filter */}
          <div className="w-full md:w-36">
            <select
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value as "all" | "veg" | "nonveg")}
              className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
            >
              <option value="all">Diet: All</option>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-Veg</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-charcoal-border bg-charcoal p-1 self-start">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md ${viewMode === "table" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Items Display */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center text-charcoal-muted gap-2 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald" />
          Loading menu items...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-charcoal-card rounded-2xl border border-charcoal-border">
          <Utensils className="h-10 w-10 text-charcoal-muted mx-auto" />
          <p className="text-base font-semibold text-cream">No dishes found</p>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Try adjusting your search query or category filters, or add a new food item.
          </p>
          <Button size="sm" onClick={handleOpenAdd}>
            Add First Dish
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const cat = categories.find((c) => c.id === item.category_id);
            return (
              <Card
                key={item.id}
                className={`overflow-hidden border transition-all flex flex-col justify-between ${
                  item.is_available
                    ? "border-charcoal-border bg-charcoal-card hover:border-emerald/40"
                    : "border-charcoal-border/50 bg-charcoal-card/60 opacity-80"
                }`}
              >
                {/* Food Image */}
                <div className="relative h-44 w-full bg-charcoal-surface overflow-hidden">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-charcoal-muted">
                      <Utensils className="h-8 w-8 opacity-40" />
                    </div>
                  )}

                  {/* Dietary badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border backdrop-blur-md ${
                        item.is_vegetarian
                          ? "bg-green-950/80 text-green-400 border-green-600/50"
                          : "bg-red-950/80 text-red-400 border-red-600/50"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.is_vegetarian ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      {item.is_vegetarian ? "VEG" : "NON-VEG"}
                    </span>
                  </div>

                  {/* Prep time badge */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/70 text-cream backdrop-blur-md">
                      <Clock className="h-3 w-3 text-emerald" />
                      {item.preparation_time_minutes} mins
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <CardHeader className="p-4 pb-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-cream font-bold leading-snug">
                      {item.name}
                    </CardTitle>
                    <span className="text-base font-extrabold text-emerald whitespace-nowrap">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  {cat && (
                    <span className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                      {cat.name}
                    </span>
                  )}
                  <p className="text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                    {item.description || "No description provided."}
                  </p>
                </CardHeader>

                {/* Variants & Addons info */}
                <div className="px-4 py-2 flex items-center gap-2 text-[11px] text-charcoal-muted">
                  {item.variants && item.variants.length > 0 && (
                    <span className="rounded bg-charcoal px-1.5 py-0.5 border border-charcoal-border">
                      {item.variants.length} Variants
                    </span>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <span className="rounded bg-charcoal px-1.5 py-0.5 border border-charcoal-border">
                      {item.addons.length} Add-ons
                    </span>
                  )}
                </div>

                {/* Footer with Availability Toggle & Action buttons */}
                <div className="p-4 pt-2 border-t border-charcoal-border flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={() => handleToggleAvailability(item)}
                    />
                    <span className="text-xs text-charcoal-muted font-medium">
                      {item.is_available ? "In Stock" : "Out of stock"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 w-8 text-charcoal-muted hover:text-cream"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingItem(item)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Diet</TableHead>
                  <TableHead>Price (INR)</TableHead>
                  <TableHead>Prep Time</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-charcoal-surface border border-charcoal-border">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-charcoal-muted text-[10px]">
                              N/A
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-cream">
                        <div>{item.name}</div>
                        <div className="text-[11px] text-charcoal-muted truncate max-w-xs">
                          {item.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-charcoal-muted">
                        {cat?.name || "Uncategorized"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold ${
                            item.is_vegetarian ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {item.is_vegetarian ? "Veg" : "Non-Veg"}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-emerald">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-xs text-charcoal-muted">
                        {item.preparation_time_minutes} min
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => handleToggleAvailability(item)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 text-charcoal-muted hover:text-cream"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Food Item Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit "${editingItem.name}"` : "Add New Food Item"}
            </DialogTitle>
            <DialogDescription>
              Configure dish information, pricing in INR, preparation time, variants and add-on options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Dish Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Item Name *</label>
                <Input
                  placeholder="e.g. Paneer Butter Masala"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal-card px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price & Prep Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Base Price (INR ₹) *</label>
                <Input
                  type="number"
                  placeholder="250"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Est. Prep Time (Minutes)</label>
                <Input
                  type="number"
                  placeholder="15"
                  value={formPrepTime}
                  onChange={(e) => setFormPrepTime(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Description & Ingredients</label>
              <Textarea
                rows={2}
                placeholder="Fresh ingredients, cooking style, allergy advice..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            {/* Image upload / URL */}
            <div className="space-y-2 border-t border-charcoal-border pt-3">
              <label className="text-xs font-semibold text-cream">Dish Photo</label>
              <div className="flex items-center gap-4">
                {formImage ? (
                  <div className="h-16 w-16 rounded-xl overflow-hidden border border-charcoal-border bg-charcoal-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formImage} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl border border-dashed border-charcoal-border flex items-center justify-center text-charcoal-muted bg-charcoal-surface">
                    <Utensils className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-charcoal-border bg-charcoal-surface hover:bg-charcoal-surface/80 text-xs font-medium text-cream cursor-pointer">
                    <UploadCloud className="h-4 w-4 text-emerald" />
                    <span>{uploadingImage ? "Uploading to Supabase..." : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  <Input
                    placeholder="Or paste external image URL"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Veg/Non-Veg & Availability Toggles */}
            <div className="grid grid-cols-2 gap-4 border-t border-charcoal-border pt-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal border border-charcoal-border">
                <div>
                  <p className="text-xs font-semibold text-cream">Vegetarian Dish</p>
                  <p className="text-[11px] text-charcoal-muted">Show green/red indicator</p>
                </div>
                <Switch checked={formIsVeg} onCheckedChange={setFormIsVeg} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal border border-charcoal-border">
                <div>
                  <p className="text-xs font-semibold text-cream">In Stock</p>
                  <p className="text-[11px] text-charcoal-muted">Visible for orders</p>
                </div>
                <Switch checked={formIsAvailable} onCheckedChange={setFormIsAvailable} />
              </div>
            </div>

            {/* Optional Item Variants Section */}
            <div className="space-y-3 border-t border-charcoal-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-cream uppercase tracking-wider">
                    Portion Variants (Optional)
                  </h4>
                  <p className="text-[11px] text-charcoal-muted">
                    e.g. Regular (+₹0), Large (+₹120)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariantRow}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Variant
                </Button>
              </div>

              {formVariants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Variant Name (e.g. Full Platter)"
                    value={v.name}
                    onChange={(e) => {
                      const updated = [...formVariants];
                      updated[i].name = e.target.value;
                      setFormVariants(updated);
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-xs text-charcoal-muted">+₹</span>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={v.price_adjustment}
                      onChange={(e) => {
                        const updated = [...formVariants];
                        updated[i].price_adjustment = Number(e.target.value);
                        setFormVariants(updated);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormVariants(formVariants.filter((_, idx) => idx !== i))}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Optional Add-ons Section */}
            <div className="space-y-3 border-t border-charcoal-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-cream uppercase tracking-wider">
                    Add-on Toppings & Extras (Optional)
                  </h4>
                  <p className="text-[11px] text-charcoal-muted">
                    e.g. Extra Cheese (+₹40), Butter (+₹25)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAddonRow}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Add-on
                </Button>
              </div>

              {formAddons.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Add-on Name (e.g. Extra Chutney)"
                    value={a.name}
                    onChange={(e) => {
                      const updated = [...formAddons];
                      updated[i].name = e.target.value;
                      setFormAddons(updated);
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-xs text-charcoal-muted">+₹</span>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={a.additional_price}
                      onChange={(e) => {
                        const updated = [...formAddons];
                        updated[i].additional_price = Number(e.target.value);
                        setFormAddons(updated);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormAddons(formAddons.filter((_, idx) => idx !== i))}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? "Save Changes" : "Add to Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Food Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove &quot;{deletingItem?.name}&quot; from your menu?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete Dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
