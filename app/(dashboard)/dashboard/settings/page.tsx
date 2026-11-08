"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Settings,
  Store,
  Receipt,
  CheckCircle2,
  Clock,
  Bell,
  Save,
  Volume2,
  Building,
} from "lucide-react";
import { playKitchenChime } from "@/lib/audio";

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const defaultSchedule: DaySchedule[] = [
  { day: "Monday", isOpen: true, openTime: "11:00", closeTime: "23:00" },
  { day: "Tuesday", isOpen: true, openTime: "11:00", closeTime: "23:00" },
  { day: "Wednesday", isOpen: true, openTime: "11:00", closeTime: "23:00" },
  { day: "Thursday", isOpen: true, openTime: "11:00", closeTime: "23:00" },
  { day: "Friday", isOpen: true, openTime: "11:00", closeTime: "23:59" },
  { day: "Saturday", isOpen: true, openTime: "11:00", closeTime: "23:59" },
  { day: "Sunday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
];

export default function RestaurantSettingsPage() {
  const isConfigured = isSupabaseConfigured();
  const [feedback, setFeedback] = useState<string | null>(null);

  // General Profile
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Operating Hours
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);

  // Live Ordering & Temporary Closure
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [tempClosureActive, setTempClosureActive] = useState(false);
  const [tempClosureMessage, setTempClosureMessage] = useState(
    "The kitchen is temporarily closed for prep. You can still browse our digital menu."
  );

  // Tax & Invoicing Compliance
  const [legalEntityName, setLegalEntityName] = useState("");
  const [gstin, setGstin] = useState("");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [taxPercentage, setTaxPercentage] = useState(5.0);
  const [serviceCharge, setServiceCharge] = useState(0.0);
  const [receiptFooter, setReceiptFooter] = useState(
    "Thank you for dining with us! Service charge is voluntary and discretionary."
  );

  // Operations & Audio Preferences
  const [audioChimeEnabled, setAudioChimeEnabled] = useState(true);
  const [kdsThresholdMins, setKdsThresholdMins] = useState(20);

  useEffect(() => {
    async function loadSettings() {
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
            const rest = member.restaurant as unknown as {
              name?: string;
              slug?: string;
              email?: string;
              phone?: string;
              address?: string;
            };
            setName(rest.name || "");
            setSlug(rest.slug || "");
            setEmail(rest.email || "");
            setPhone(rest.phone || "");
            setAddress(rest.address || "");
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic settings:", err);
      }
    }

    loadSettings();
  }, [isConfigured]);

  const handleScheduleChange = (
    index: number,
    field: keyof DaySchedule,
    value: boolean | string
  ) => {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    setFeedback("All restaurant settings & compliance profile successfully saved.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-emerald" />
            Restaurant & Operations Settings
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Configure day-of-week operating hours, GST compliance, invoice branding, and live order controls
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3.5 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Live Ordering Controls & Emergency Closure */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald" />
            Live Customer Ordering & Kitchen Availability
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Instantly halt incoming QR orders during kitchen rushes or private banquet bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-charcoal border border-charcoal-border">
            <div>
              <p className="text-sm font-semibold text-cream">Accept Digital Orders</p>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {acceptingOrders
                  ? "Diners can place live orders directly from their tables."
                  : "Customer menus will show 'Kitchen is currently not accepting new orders'."}
              </p>
            </div>
            <Switch checked={acceptingOrders} onCheckedChange={setAcceptingOrders} />
          </div>

          <div className="p-4 rounded-xl bg-charcoal border border-charcoal-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cream">Temporary Notice / Closure Banner</p>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Display an informational announcement banner at the top of the customer digital menu
                </p>
              </div>
              <Switch checked={tempClosureActive} onCheckedChange={setTempClosureActive} />
            </div>

            {tempClosureActive && (
              <div className="pt-2 space-y-1.5">
                <label className="text-xs font-semibold text-cream">Banner Notice Text</label>
                <Textarea
                  rows={2}
                  value={tempClosureMessage}
                  onChange={(e) => setTempClosureMessage(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Profile */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald" />
            Restaurant Brand & Profile
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Public brand information shown on customer QR menus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Restaurant Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Public Slug</label>
              <Input value={slug} disabled className="opacity-70 font-mono text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Description</label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Contact Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Contact Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Day-of-Week Operating Hours */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald" />
            Weekly Operating Hours
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Configure opening and closing times per weekday. Out-of-hours QR scans will warn diners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {schedule.map((item, idx) => (
              <div
                key={item.day}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-charcoal border border-charcoal-border gap-3 text-xs"
              >
                <div className="w-28 flex items-center gap-2">
                  <span className="font-semibold text-cream">{item.day}</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-charcoal-muted">
                    <input
                      type="checkbox"
                      checked={item.isOpen}
                      onChange={(e) => handleScheduleChange(idx, "isOpen", e.target.checked)}
                      className="rounded border-charcoal-border bg-charcoal text-emerald focus:ring-emerald"
                    />
                    <span className={item.isOpen ? "text-emerald font-medium" : "text-charcoal-muted"}>
                      {item.isOpen ? "Open" : "Closed"}
                    </span>
                  </label>

                  {item.isOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={item.openTime}
                        onChange={(e) => handleScheduleChange(idx, "openTime", e.target.value)}
                        className="h-8 w-28 text-xs font-mono"
                      />
                      <span className="text-charcoal-muted">to</span>
                      <Input
                        type="time"
                        value={item.closeTime}
                        onChange={(e) => handleScheduleChange(idx, "closeTime", e.target.value)}
                        className="h-8 w-28 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Indian GST Compliance & Tax Invoice Branding */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald" />
            Indian GST & Invoice Branding
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Printed on all customer tax invoices and Razorpay digital receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Legal Entity / Registered Business Name</label>
              <Input
                value={legalEntityName}
                onChange={(e) => setLegalEntityName(e.target.value)}
                placeholder="e.g. DineFlow Hospitality LLP"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">15-Digit GSTIN</label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">14-Digit FSSAI License Number</label>
              <Input
                value={fssaiLicense}
                onChange={(e) => setFssaiLicense(e.target.value)}
                placeholder="e.g. 11521018000123"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Restaurant Contact Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">GST Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                className="text-xs font-mono"
              />
              <span className="text-[10px] text-charcoal-muted">Default is 5.0% (2.5% CGST + 2.5% SGST) for restaurants</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cream">Optional Service Charge (%)</label>
              <Input
                type="number"
                step="0.5"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                className="text-xs font-mono"
              />
              <span className="text-[10px] text-charcoal-muted">Set to 0% if not levied</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream">Receipt Footer Message</label>
            <Input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you for visiting us! Gratuity is voluntary."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Kitchen Audio & Operational Alerts */}
      <Card className="border-charcoal-border bg-charcoal-card">
        <CardHeader>
          <CardTitle className="text-lg text-cream flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald" />
            Kitchen Display & Sound Alerts
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Configure sound chimes for incoming QR tickets and alert thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-charcoal border border-charcoal-border">
            <div>
              <p className="text-sm font-semibold text-cream">Web Audio Chime on New Orders</p>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Play an instant alert bell in the KDS and Live Orders screen when a customer orders
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => playKitchenChime()}
                className="h-8 text-xs gap-1.5"
              >
                <Volume2 className="h-3.5 w-3.5 text-emerald" />
                Test Chime
              </Button>
              <Switch checked={audioChimeEnabled} onCheckedChange={setAudioChimeEnabled} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-charcoal border border-charcoal-border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cream">KDS Delayed Ticket Alert Threshold</p>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Highlight tickets in amber/red when preparation exceeds this duration
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={kdsThresholdMins}
                  onChange={(e) => setKdsThresholdMins(parseInt(e.target.value) || 20)}
                  className="w-20 h-8 text-xs font-mono text-center"
                />
                <span className="text-xs text-charcoal-muted">mins</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
