import { z } from "zod";

export const restaurantOnboardingSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Please enter a valid email address"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().optional().or(z.literal("")),
  time_zone: z.string().min(1, "Timezone is required"),
  cuisine_type: z.string().min(2, "Please specify a cuisine type (e.g. Indian, Italian, Multi-cuisine)"),
  opening_time: z.string().min(1, "Opening time is required"),
  closing_time: z.string().min(1, "Closing time is required"),
  currency: z.string().min(1, "Currency is required"),
  tax_percentage: z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%"),
  logo_url: z.string().optional().or(z.literal("")),
  cover_url: z.string().optional().or(z.literal("")),
});

export type RestaurantOnboardingInput = z.infer<typeof restaurantOnboardingSchema>;
