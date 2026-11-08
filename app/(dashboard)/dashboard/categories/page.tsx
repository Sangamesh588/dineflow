"use client";

import React, { useState, useEffect } from "react";
import { MenuCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MoveUp,
  MoveDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
  const isConfigured = isSupabaseConfigured();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sort_order: 1,
    is_active: true,
  });

  // Load from Supabase if configured
  useEffect(() => {
    async function fetchCategories() {
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
            .select("restaurant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (member?.restaurant_id) {
            setRestaurantId(member.restaurant_id);
            const { data, error } = await supabase
              .from("menu_categories")
              .select("*")
              .eq("restaurant_id", member.restaurant_id)
              .order("sort_order", { ascending: true });

            if (!error && data) {
              setCategories(data);
            } else if (!error) {
              setCategories([]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, [isConfigured]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      description: "",
      sort_order: categories.length + 1,
      is_active: true,
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) return;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        if (editingCategory) {
          // Update
          const { error } = await supabase
            .from("menu_categories")
            .update({
              name: formData.name,
              description: formData.description || null,
              sort_order: Number(formData.sort_order),
              is_active: formData.is_active,
            })
            .eq("id", editingCategory.id);

          if (error) throw error;
        } else {
          // Insert
          const { data, error } = await supabase
            .from("menu_categories")
            .insert({
              restaurant_id: restaurantId,
              name: formData.name,
              description: formData.description || null,
              sort_order: Number(formData.sort_order),
              is_active: formData.is_active,
            })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setCategories([...categories, data]);
          }
        }
      } catch (err) {
        console.error("Failed to save category to Supabase:", err);
      }
    }

    // Update local state
    if (editingCategory) {
      setCategories(
        categories.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: formData.name,
                description: formData.description,
                sort_order: Number(formData.sort_order),
                is_active: formData.is_active,
              }
            : c
        )
      );
      setFeedbackMessage(`Updated category "${formData.name}"`);
    } else {
      const newCat: MenuCategory = {
        id: `cat_${Date.now()}`,
        restaurant_id: restaurantId || "demo_rest_id",
        name: formData.name,
        description: formData.description,
        image_url: null,
        sort_order: Number(formData.sort_order),
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
      };
      setCategories([...categories, newCat]);
      setFeedbackMessage(`Added new category "${formData.name}"`);
    }

    setIsAddOpen(false);
    setEditingCategory(null);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleToggleActive = async (cat: MenuCategory) => {
    const updated = !cat.is_active;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        await supabase
          .from("menu_categories")
          .update({ is_active: updated })
          .eq("id", cat.id);
      } catch (err) {
        console.error("Failed toggle in Supabase:", err);
      }
    }

    setCategories(
      categories.map((c) => (c.id === cat.id ? { ...c, is_active: updated } : c))
    );
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        await supabase
          .from("menu_categories")
          .delete()
          .eq("id", deletingCategory.id);
      } catch (err) {
        console.error("Failed delete in Supabase:", err);
      }
    }

    setCategories(categories.filter((c) => c.id !== deletingCategory.id));
    setFeedbackMessage(`Deleted category "${deletingCategory.name}"`);
    setDeletingCategory(null);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReorder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const [moved] = newCategories.splice(index, 1);
    newCategories.splice(targetIndex, 0, moved);

    // Update sort orders
    const reindexed = newCategories.map((c, i) => ({
      ...c,
      sort_order: i + 1,
    }));

    setCategories(reindexed);
    setFeedbackMessage("Updated category order");
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-emerald" />
            Menu Categories
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Organize dishes into browsing sections for your digital QR menu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/menu">
            <Button variant="outline" size="sm" className="gap-2">
              View Food Items <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="sm" onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream">Configured Categories ({categories.length})</CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Inactive categories will be hidden automatically from public customer menus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-charcoal-muted text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-emerald" />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-charcoal-muted mx-auto" />
              <p className="text-sm font-semibold text-cream">No categories yet</p>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                Create your first category such as &quot;Starters&quot; or &quot;Beverages&quot; to begin building your digital menu.
              </p>
              <Button size="sm" onClick={handleOpenAdd}>
                Create Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-charcoal-muted w-4">
                          {cat.sort_order}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleReorder(index, "up")}
                            className="text-charcoal-muted hover:text-cream disabled:opacity-20"
                            title="Move up"
                          >
                            <MoveUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === categories.length - 1}
                            onClick={() => handleReorder(index, "down")}
                            className="text-charcoal-muted hover:text-cream disabled:opacity-20"
                            title="Move down"
                          >
                            <MoveDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-cream">
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-xs text-charcoal-muted max-w-md truncate hidden md:table-cell">
                      {cat.description || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={() => handleToggleActive(cat)}
                        />
                        <span className="text-[11px] text-charcoal-muted hidden sm:inline">
                          {cat.is_active ? "Active" : "Hidden"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-8 w-8 text-charcoal-muted hover:text-cream"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCategory(cat)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Category Dialog */}
      <Dialog
        open={isAddOpen || editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Menu Category"}
            </DialogTitle>
            <DialogDescription>
              Categories group related items on the customer QR ordering menu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Category Name *</label>
              <Input
                placeholder="e.g. Starters & Chaats"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Description</label>
              <Textarea
                placeholder="Crispy snacks, rolls, and tandoori bites."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Display Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: Number(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Visibility Status</label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                  />
                  <span className="text-xs text-cream">
                    {formData.is_active ? "Active on Menu" : "Hidden"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setEditingCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-charcoal border border-charcoal-border text-xs text-charcoal-muted space-y-1">
            <p>
              Safe handling: Any dishes currently assigned to this category will not be lost. They will be marked as &quot;Uncategorized&quot; and can be reassigned anytime.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
