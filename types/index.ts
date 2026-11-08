export * from "./database";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
}

export interface TableItem {
  id: string;
  tableNumber: string;
  displayName?: string | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "inactive";
  qrToken: string;
  isActive: boolean;
  activeOrderId?: string | null;
  occupancyMinutes?: number;
}
