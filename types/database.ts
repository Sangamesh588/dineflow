export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "manager" | "cashier" | "kitchen_staff" | "waiter" | "staff";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  cuisine_type: string | null;
  opening_time: string | null;
  closing_time: string | null;
  currency: string;
  tax_percentage: number;
  created_at: string;
}

export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface RestaurantSettings {
  id: string;
  restaurant_id: string;
  accepting_orders: boolean;
  currency: string;
  tax_percentage: number;
  service_charge: number;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItemVariant {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
}

export interface MenuItemAddon {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  additional_price: number;
  is_available: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_vegetarian: boolean;
  is_available: boolean;
  preparation_time_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants?: MenuItemVariant[];
  addons?: MenuItemAddon[];
  category?: MenuCategory;
}

export type TableStatus = "available" | "occupied" | "reserved" | "inactive";

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  display_name: string | null;
  capacity: number;
  status: TableStatus;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_order?: Order | null;
  occupancy_minutes?: number;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  item_name_snapshot: string;
  unit_price: number;
  quantity: number;
  variant_snapshot?: MenuItemVariant | null;
  addons_snapshot?: MenuItemAddon[];
  special_instructions?: string | null;
  item_total: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  order_number: string;
  order_type: "dine_in" | "takeaway";
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  grand_total: number;
  customer_name: string | null;
  customer_phone: string | null;
  special_instructions: string | null;
  idempotency_key?: string | null;
  customer_tracking_token: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  table?: RestaurantTable | null;
}

export interface PaymentRecord {
  id: string;
  restaurant_id: string;
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  payment_status: "pending" | "captured" | "failed" | "refunded";
  payment_method: string | null;
  signature_verified: boolean;
  split_type: "full" | "equal" | "custom";
  payer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  restaurant_id: string;
  email: string;
  role: UserRole;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  actor_user_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: "order" | "kitchen" | "payment" | "staff" | "table";
  read: boolean;
  created_at: string;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  variant?: MenuItemVariant | null;
  selectedAddons: MenuItemAddon[];
  quantity: number;
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CartCalculation {
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  serviceChargePercentage: number;
  serviceChargeAmount: number;
  grandTotal: number;
  currency: string;
}
