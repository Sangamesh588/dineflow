import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional().or(z.literal("")),
  sort_order: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
  image_url: z.string().optional().or(z.literal("")),
});

export const menuItemVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  price_adjustment: z.coerce.number().default(0),
  is_available: z.boolean().default(true),
});

export const menuItemAddonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Add-on name is required"),
  additional_price: z.coerce.number().min(0, "Price must be 0 or higher").default(0),
  is_available: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters"),
  description: z.string().max(400, "Description cannot exceed 400 characters").optional().or(z.literal("")),
  category_id: z.string().min(1, "Please select a category"),
  price: z.coerce.number().min(0.01, "Price must be greater than zero"),
  is_vegetarian: z.boolean().default(false),
  is_available: z.boolean().default(true),
  preparation_time_minutes: z.coerce.number().min(1, "Preparation time must be at least 1 minute").default(15),
  sort_order: z.coerce.number().default(0),
  image_url: z.string().optional().or(z.literal("")),
  variants: z.array(menuItemVariantSchema).optional().default([]),
  addons: z.array(menuItemAddonSchema).optional().default([]),
});

export const validateCartOrderSchema = z.object({
  restaurantSlug: z.string(),
  tableNumber: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      variantId: z.string().nullable().optional(),
      addonIds: z.array(z.string()).default([]),
      quantity: z.number().int().min(1),
      specialInstructions: z.string().max(200).optional(),
    })
  ),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuItemVariantInput = z.infer<typeof menuItemVariantSchema>;
export type MenuItemAddonInput = z.infer<typeof menuItemAddonSchema>;
export type ValidateCartOrderInput = z.infer<typeof validateCartOrderSchema>;
