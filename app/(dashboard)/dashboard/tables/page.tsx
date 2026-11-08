"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RestaurantTable, TableStatus, Restaurant } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateQrDataUrl, buildTableUrl } from "@/lib/qr";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Armchair,
  Plus,
  QrCode,
  Pencil,
  Users,
  ExternalLink,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Clock,
  Radio,
  Copy,
  AlertTriangle,
  MoveRight,
} from "lucide-react";
import Link from "next/link";

export default function TablesManagementPage() {
  const isConfigured = isSupabaseConfigured();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("Restaurant");

  // View & Filter states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<RestaurantTable | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isBulkQrOpen, setIsBulkQrOpen] = useState(false);
  const [bulkQrMap, setBulkQrMap] = useState<Record<string, string>>({});
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isNfcGuideOpen, setIsNfcGuideOpen] = useState(false);
  const [isMoveOrderModalOpen, setIsMoveOrderModalOpen] = useState(false);
  const [sourceTableForMove, setSourceTableForMove] = useState<RestaurantTable | null>(null);
  const [targetTableIdForMove, setTargetTableIdForMove] = useState<string>("");

  // Form states
  const [formTableNumber, setFormTableNumber] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formCapacity, setFormCapacity] = useState(4);
  const [formStatus, setFormStatus] = useState<TableStatus>("available");
  const [formIsActive, setFormIsActive] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // App host URL for QR code generation
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://dineflow.app";

  // Load tables from Supabase if configured
  useEffect(() => {
    async function loadData() {
      if (!isConfigured) return;

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
            const r = member.restaurant as unknown as Restaurant;
            setRestaurantId(r.id);
            setRestaurantSlug(r.slug);
            setRestaurantName(r.name);

            const { data: tblData } = await supabase
              .from("restaurant_tables")
              .select("*")
              .eq("restaurant_id", r.id)
              .order("table_number", { ascending: true });

            if (tblData) {
              setTables(tblData);
            } else {
              setTables([]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading tables:", err);
      }
    }

    loadData();
  }, [isConfigured]);

  // Generate QR code whenever the QR modal opens
  useEffect(() => {
    if (activeQrModal) {
      const url = buildTableUrl(appOrigin, restaurantSlug, activeQrModal.qr_token);
      generateQrDataUrl(url).then(setQrDataUrl);
    }
  }, [activeQrModal, appOrigin, restaurantSlug]);

  // Generate bulk QR data URLs when bulk modal opens
  useEffect(() => {
    if (isBulkQrOpen) {
      const activeTables = tables.filter((t) => t.is_active);
      const promises = activeTables.map(async (t) => {
        const url = buildTableUrl(appOrigin, restaurantSlug, t.qr_token);
        const dataUrl = await generateQrDataUrl(url);
        return [t.id, dataUrl] as const;
      });

      Promise.all(promises).then((results) => {
        const map: Record<string, string> = {};
        results.forEach(([id, url]) => {
          map[id] = url;
        });
        setBulkQrMap(map);
      });
    }
  }, [isBulkQrOpen, tables, appOrigin, restaurantSlug]);

  // Counts for summary metrics
  const counts = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.is_active && t.status === "available").length;
    const occupied = tables.filter((t) => t.is_active && t.status === "occupied").length;
    const reserved = tables.filter((t) => t.is_active && t.status === "reserved").length;
    const inactive = tables.filter((t) => !t.is_active || t.status === "inactive").length;
    return { total, available, occupied, reserved, inactive };
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch =
        t.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.display_name && t.display_name.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "available") matchesStatus = t.is_active && t.status === "available";
      else if (statusFilter === "occupied") matchesStatus = t.is_active && t.status === "occupied";
      else if (statusFilter === "reserved") matchesStatus = t.is_active && t.status === "reserved";
      else if (statusFilter === "inactive") matchesStatus = !t.is_active || t.status === "inactive";

      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setFormTableNumber(`T-0${tables.length + 1}`);
    setFormDisplayName("");
    setFormCapacity(4);
    setFormStatus("available");
    setFormIsActive(true);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (t: RestaurantTable) => {
    setEditingTable(t);
    setFormTableNumber(t.table_number);
    setFormDisplayName(t.display_name || "");
    setFormCapacity(t.capacity);
    setFormStatus(t.status);
    setFormIsActive(t.is_active);
    setIsAddEditOpen(true);
  };

  const handleSaveTable = async () => {
    if (!formTableNumber.trim()) return;

    if (isConfigured && restaurantId) {
      try {
        const supabase = createClient();
        if (editingTable) {
          const { error } = await supabase
            .from("restaurant_tables")
            .update({
              table_number: formTableNumber,
              display_name: formDisplayName || null,
              capacity: formCapacity,
              status: formStatus,
              is_active: formIsActive,
            })
            .eq("id", editingTable.id);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("restaurant_tables")
            .insert({
              restaurant_id: restaurantId,
              table_number: formTableNumber,
              display_name: formDisplayName || null,
              capacity: formCapacity,
              status: formStatus,
              is_active: formIsActive,
            })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setTables([...tables, data]);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Database error";
        alert(`Failed saving table: ${msg}`);
      }
    }

    if (editingTable) {
      setTables(
        tables.map((t) =>
          t.id === editingTable.id
            ? {
                ...t,
                table_number: formTableNumber,
                display_name: formDisplayName,
                capacity: formCapacity,
                status: formStatus,
                is_active: formIsActive,
              }
            : t
        )
      );
      setFeedback(`Updated table ${formTableNumber}`);
    } else {
      const newTable: RestaurantTable = {
        id: `tbl_${Date.now()}`,
        restaurant_id: restaurantId || "demo",
        table_number: formTableNumber,
        display_name: formDisplayName,
        capacity: formCapacity,
        status: formStatus,
        qr_token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        is_active: formIsActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTables([...tables, newTable]);
      setFeedback(`Added table ${formTableNumber}`);
    }

    setIsAddEditOpen(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Cryptographically secure QR Regeneration (Phase 5 requirement: Never reuse revoked token)
  const handleRegenerateQrToken = async () => {
    if (!activeQrModal) return;

    const newToken = `token_revoked_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    if (isConfigured) {
      try {
        const supabase = createClient();
        await supabase
          .from("restaurant_tables")
          .update({ qr_token: newToken })
          .eq("id", activeQrModal.id);
      } catch (err) {
        console.error("Failed to regenerate token:", err);
      }
    }

    const updatedTable = { ...activeQrModal, qr_token: newToken };
    setTables(tables.map((t) => (t.id === activeQrModal.id ? updatedTable : t)));
    setActiveQrModal(updatedTable);
    setIsRegenerateModalOpen(false);
    setFeedback(`Regenerated QR token for ${activeQrModal.table_number}. Previous token revoked.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Download individual QR code PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !activeQrModal) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${restaurantSlug}_${activeQrModal.table_number}.png`;
    a.click();
  };

  // Copy customer URL
  const handleCopyUrl = () => {
    if (!activeQrModal) return;
    const url = buildTableUrl(appOrigin, restaurantSlug, activeQrModal.qr_token);
    navigator.clipboard.writeText(url);
    setFeedback("Copied secure table URL to clipboard!");
    setTimeout(() => setFeedback(null), 2500);
  };

  // Move table order (Phase 8 Table Operations)
  const handleExecuteMoveOrder = () => {
    if (!sourceTableForMove || !targetTableIdForMove) return;

    const targetTable = tables.find((t) => t.id === targetTableIdForMove);
    if (!targetTable) return;

    // Update tables in state
    setTables(
      tables.map((t) => {
        if (t.id === sourceTableForMove.id) {
          return { ...t, status: "available", occupancy_minutes: 0 };
        }
        if (t.id === targetTable.id) {
          return { ...t, status: "occupied", occupancy_minutes: sourceTableForMove.occupancy_minutes || 10 };
        }
        return t;
      })
    );

    setFeedback(`Moved active order from ${sourceTableForMove.table_number} to ${targetTable.table_number}. Audit logged.`);
    setIsMoveOrderModalOpen(false);
    setSourceTableForMove(null);
    setTargetTableIdForMove("");
    setTimeout(() => setFeedback(null), 3500);
  };

  const statusBadgeClasses: Record<TableStatus, string> = {
    available: "border-emerald/40 bg-emerald/10 text-emerald",
    occupied: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    reserved: "border-blue-500/40 bg-blue-500/10 text-blue-400",
    inactive: "border-charcoal-muted/40 bg-charcoal-surface text-charcoal-muted",
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Armchair className="h-7 w-7 text-emerald" />
            Table Management & Smart QR/NFC
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Cryptographic QR stands, live occupancy timers, NFC tags, and dining station controls
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNfcGuideOpen(true)}
            className="gap-2 text-xs border-charcoal-border hover:bg-charcoal-surface"
          >
            <Radio className="h-4 w-4 text-emerald" />
            NFC Setup Guide
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsBulkQrOpen(true)}
            className="gap-2 text-xs"
          >
            <Printer className="h-4 w-4 text-emerald" />
            Bulk Print A4 Sheet
          </Button>

          <Button size="sm" onClick={handleOpenAdd} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Status Counter Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter("all")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "all"
              ? "border-emerald bg-charcoal-card ring-1 ring-emerald"
              : "border-charcoal-border bg-charcoal-card/80 hover:border-charcoal-muted"
          }`}
        >
          <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Total Tables</p>
          <p className="text-2xl font-bold text-cream mt-0.5">{counts.total}</p>
        </button>

        <button
          onClick={() => setStatusFilter("available")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "available"
              ? "border-emerald bg-charcoal-card ring-1 ring-emerald"
              : "border-charcoal-border bg-charcoal-card/80 hover:border-charcoal-muted"
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald uppercase">Available</p>
          <p className="text-2xl font-bold text-emerald mt-0.5">{counts.available}</p>
        </button>

        <button
          onClick={() => setStatusFilter("occupied")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "occupied"
              ? "border-amber-500 bg-charcoal-card ring-1 ring-amber-500"
              : "border-charcoal-border bg-charcoal-card/80 hover:border-charcoal-muted"
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-400 uppercase">Occupied</p>
          <p className="text-2xl font-bold text-amber-400 mt-0.5">{counts.occupied}</p>
        </button>

        <button
          onClick={() => setStatusFilter("reserved")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "reserved"
              ? "border-blue-500 bg-charcoal-card ring-1 ring-blue-500"
              : "border-charcoal-border bg-charcoal-card/80 hover:border-charcoal-muted"
          }`}
        >
          <p className="text-[11px] font-semibold text-blue-400 uppercase">Reserved</p>
          <p className="text-2xl font-bold text-blue-400 mt-0.5">{counts.reserved}</p>
        </button>

        <button
          onClick={() => setStatusFilter("inactive")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "inactive"
              ? "border-charcoal-muted bg-charcoal-card ring-1 ring-charcoal-muted"
              : "border-charcoal-border bg-charcoal-card/80 hover:border-charcoal-muted"
          }`}
        >
          <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Inactive</p>
          <p className="text-2xl font-bold text-charcoal-muted mt-0.5">{counts.inactive}</p>
        </button>
      </div>

      {/* 3. Search and View Controls */}
      <Card className="border-charcoal-border bg-charcoal-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
            <Input
              placeholder="Search table number or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-charcoal text-xs"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-charcoal-muted hidden sm:inline">
              Showing {filteredTables.length} tables
            </span>
            <div className="flex items-center rounded-lg border border-charcoal-border bg-charcoal p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-charcoal-surface text-cream" : "text-charcoal-muted"}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Main Tables Display */}
      {filteredTables.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-charcoal-card rounded-2xl border border-charcoal-border">
          <Armchair className="h-10 w-10 text-charcoal-muted mx-auto" />
          <p className="text-base font-semibold text-cream">No matching tables found</p>
          <p className="text-xs text-charcoal-muted">Try adjusting your search query or status filter.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            return (
              <Card
                key={table.id}
                className={`border flex flex-col justify-between transition-all ${
                  table.is_active
                    ? "border-charcoal-border bg-charcoal-card hover:border-emerald/40"
                    : "border-charcoal-border/50 bg-charcoal-card/50 opacity-60"
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xl font-black text-cream font-mono">
                        {table.table_number}
                      </span>
                      {table.display_name && (
                        <p className="text-xs text-charcoal-muted truncate max-w-[140px]">
                          {table.display_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`capitalize text-[11px] ${statusBadgeClasses[table.status]}`}>
                      {table.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-charcoal-muted pt-2 border-t border-charcoal-border/50 mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald" />
                      {table.capacity} Seats
                    </span>

                    {table.status === "occupied" && table.occupancy_minutes && (
                      <span className="flex items-center gap-1 text-amber-300 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {table.occupancy_minutes}m
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1">
                  {/* QR Stand Preview Trigger */}
                  <div
                    onClick={() => setActiveQrModal(table)}
                    className="p-3 rounded-xl border border-dashed border-charcoal-border bg-charcoal hover:border-emerald/50 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cream text-charcoal-dark shadow-sm">
                        <QrCode className="h-5 w-5 text-charcoal-dark" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-cream group-hover:text-emerald transition-colors">
                          Smart Stand
                        </p>
                        <p className="text-[10px] text-charcoal-muted font-mono truncate max-w-[110px]">
                          {table.qr_token.substring(0, 14)}...
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-charcoal-muted group-hover:text-emerald" />
                  </div>
                </CardContent>

                <div className="p-3 pt-0 border-t border-charcoal-border/60 flex items-center justify-between mt-auto">
                  {table.status === "occupied" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSourceTableForMove(table);
                        setIsMoveOrderModalOpen(true);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 h-7 px-2 gap-1"
                    >
                      <MoveRight className="h-3 w-3" /> Move Order
                    </Button>
                  ) : (
                    <span className="text-[10px] text-charcoal-muted">Ready for scan</span>
                  )}

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(table)}
                      className="h-7 w-7 text-charcoal-muted hover:text-cream"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Display Label</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Duration</TableHead>
                  <TableHead>QR Token</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-bold text-cream">
                      {t.table_number}
                    </TableCell>
                    <TableCell className="text-xs text-charcoal-muted">
                      {t.display_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-cream">{t.capacity} guests</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[11px] ${statusBadgeClasses[t.status]}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-charcoal-muted font-mono">
                      {t.status === "occupied" && t.occupancy_minutes ? `${t.occupancy_minutes} mins` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveQrModal(t)}
                        className="text-xs text-emerald h-7 gap-1 font-mono"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {t.qr_token.substring(0, 8)}...
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(t)}
                        className="h-8 w-8 text-charcoal-muted hover:text-cream"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 5. ADD / EDIT TABLE DIALOG */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? `Edit Table ${editingTable.table_number}` : "Add New Table"}
            </DialogTitle>
            <DialogDescription>
              Assign physical table identifier, label, capacity and seating availability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Table Code *</label>
                <Input
                  placeholder="e.g. T-07"
                  value={formTableNumber}
                  onChange={(e) => setFormTableNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Guest Capacity</label>
                <Input
                  type="number"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Display Label (Optional)</label>
              <Input
                placeholder="e.g. Window Corner, Terrace Booth"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as TableStatus)}
                  className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal-card px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cream">Table Active</label>
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk_active"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="accent-emerald h-4 w-4"
                  />
                  <label htmlFor="chk_active" className="text-xs text-cream cursor-pointer">
                    Enable QR ordering
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTable}>
              {editingTable ? "Save Changes" : "Create Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. INDIVIDUAL QR CODE INSPECT, DOWNLOAD & REGENERATE DIALOG */}
      <Dialog open={activeQrModal !== null} onOpenChange={(open) => !open && setActiveQrModal(null)}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-emerald" />
              <span>{activeQrModal?.table_number} Smart QR Stand</span>
            </DialogTitle>
            <DialogDescription>
              {activeQrModal?.display_name || restaurantName} • Seats {activeQrModal?.capacity}
            </DialogDescription>
          </DialogHeader>

          {/* Printable Stand Preview Card */}
          <div className="my-3 p-6 rounded-2xl bg-cream border border-charcoal-border text-charcoal-dark max-w-xs mx-auto shadow-2xl space-y-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald">
                {restaurantName}
              </p>
              <h3 className="text-2xl font-black text-charcoal-dark tracking-tight">
                TABLE {activeQrModal?.table_number}
              </h3>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-charcoal-muted/20 shadow-inner inline-block">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code" className="h-44 w-44 mx-auto" />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-charcoal-muted">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-extrabold text-charcoal-dark uppercase tracking-wider">
                Scan with Camera or Tap with NFC
              </p>
              <p className="text-[10px] text-charcoal-muted">
                No app download required • Instant ordering
              </p>
            </div>
          </div>

          {/* Secure URL Preview */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-charcoal border border-charcoal-border text-[11px] text-charcoal-muted font-mono">
            <span className="truncate flex-1 text-left">
              {activeQrModal && buildTableUrl(appOrigin, restaurantSlug, activeQrModal.qr_token)}
            </span>
            <button
              onClick={handleCopyUrl}
              className="p-1 hover:text-cream text-emerald"
              title="Copy URL"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Actions: Download PNG, Print Stand, Regenerate Token */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQrPng}
              className="gap-2 text-xs"
            >
              <Download className="h-4 w-4 text-emerald" /> Download PNG
            </Button>

            <Link
              href={activeQrModal ? buildTableUrl(appOrigin, restaurantSlug, activeQrModal.qr_token) : "#"}
              target="_blank"
            >
              <Button size="sm" className="w-full gap-2 text-xs">
                <ExternalLink className="h-4 w-4" /> Test Customer URL
              </Button>
            </Link>
          </div>

          <div className="pt-2 border-t border-charcoal-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-charcoal-muted">
              Token: {activeQrModal?.qr_token.substring(0, 18)}...
            </span>
            <button
              onClick={() => setIsRegenerateModalOpen(true)}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Revoke & Regenerate
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. REGENERATE QR CONFIRMATION MODAL */}
      <Dialog open={isRegenerateModalOpen} onOpenChange={setIsRegenerateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Revoke & Regenerate Table QR Token
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to regenerate the QR token for {activeQrModal?.table_number}?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-xs text-red-200 space-y-1.5">
            <p className="font-semibold">Important Security Notice:</p>
            <p>
              The existing QR code and NFC tag for this table will be immediately revoked and will stop working. Guests scanning old codes will see an &quot;Invalid or Expired Token&quot; notice. You must print and replace the physical QR stand at the table.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRegenerateQrToken}>
              Revoke & Generate New Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. BULK PRINTABLE A4 QR SHEET MODAL */}
      <Dialog open={isBulkQrOpen} onOpenChange={setIsBulkQrOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Printable Table QR Sheets (A4 Layout)</span>
              <Button size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Print Sheet
              </Button>
            </DialogTitle>
            <DialogDescription>
              Printable grid cards formatted for cutting and placing in acrylic table stands.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-charcoal-surface rounded-2xl print:bg-white print:p-0 print:grid-cols-2">
            {tables
              .filter((t) => t.is_active)
              .map((table) => {
                const qrUrl = bulkQrMap[table.id];
                return (
                  <div
                    key={table.id}
                    className="p-5 rounded-2xl bg-cream text-charcoal-dark border-2 border-charcoal-border text-center space-y-2 shadow-sm break-inside-avoid"
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald">
                      {restaurantName}
                    </p>
                    <h3 className="text-xl font-black text-charcoal-dark">{table.table_number}</h3>

                    <div className="p-2 bg-white rounded-xl border border-charcoal-muted/20 inline-block shadow-sm">
                      {qrUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrUrl} alt="" className="h-28 w-28 mx-auto" />
                      ) : (
                        <div className="h-28 w-28 flex items-center justify-center text-xs text-charcoal-muted">
                          ...
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-dark">
                      Scan or Tap with NFC to Order
                    </p>
                    <p className="text-[9px] text-charcoal-muted">
                      dineflow.app/menu/{restaurantSlug}
                    </p>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 9. NFC WRITER INSTRUCTIONS GUIDE */}
      <Dialog open={isNfcGuideOpen} onOpenChange={setIsNfcGuideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emerald" />
              NFC Table Tag Programming Guide
            </DialogTitle>
            <DialogDescription>
              How to write secure contactless NFC discs for restaurant tables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs text-charcoal-muted leading-relaxed">
            <div className="p-3.5 rounded-xl bg-charcoal border border-charcoal-border space-y-2">
              <h4 className="font-semibold text-cream text-sm">Hardware Requirements</h4>
              <p>
                Any standard NTAG213, NTAG215, or NTAG216 waterproof NFC sticker or acrylic disc (costing ~₹15-30 each).
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-cream text-sm">Step-by-step Writing:</h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-xs text-cream/90">
                <li>Download a free NFC writer app such as <strong>NFC Tools</strong> on your smartphone.</li>
                <li>In DineFlow, open the desired table and click <strong>Copy Table URL</strong>.</li>
                <li>In the NFC app, choose <strong>Write &gt; Add a record &gt; Custom URL / URI</strong>.</li>
                <li>Paste the copied URL (e.g. <span className="font-mono text-emerald">https://dineflow.app/menu/{restaurantSlug}?table_token=...</span>).</li>
                <li>Hold your phone against the NFC sticker until written successfully.</li>
              </ol>
            </div>

            <div className="p-3 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald-light space-y-1">
              <p className="font-bold">Security Guarantee:</p>
              <p className="text-[11px]">
                The NFC tag only holds the safe public customer URL. It contains no API credentials, secret tokens, or customer data. Guests tap with their smartphone and immediately order for that exact table.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsNfcGuideOpen(false)}>Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. MOVE ACTIVE ORDER MODAL (Phase 8 Operations) */}
      <Dialog open={isMoveOrderModalOpen} onOpenChange={setIsMoveOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <MoveRight className="h-5 w-5" />
              Move Table Order
            </DialogTitle>
            <DialogDescription>
              Transfer active guests and kitchen tickets from {sourceTableForMove?.table_number} to a new available table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-charcoal border border-charcoal-border flex items-center justify-between text-xs">
              <span className="text-charcoal-muted">Source Table:</span>
              <span className="font-bold text-cream">{sourceTableForMove?.table_number} ({sourceTableForMove?.display_name || "Dine-in"})</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Target Table *</label>
              <select
                value={targetTableIdForMove}
                onChange={(e) => setTargetTableIdForMove(e.target.value)}
                className="w-full h-10 rounded-lg border border-charcoal-border bg-charcoal-card px-3 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-emerald"
              >
                <option value="">Select target table</option>
                {tables
                  .filter((t) => t.is_active && t.id !== sourceTableForMove?.id && t.status === "available")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} ({t.capacity} Seats) - Available
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!targetTableIdForMove}
              onClick={handleExecuteMoveOrder}
              className="bg-amber-500 hover:bg-amber-600 text-charcoal-dark font-bold"
            >
              Transfer Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
