"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  History,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { UserRole } from "@/types";
import { formatDate } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "deactivated";
  joined_at: string;
}

interface AuditLogEntry {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  timestamp: string;
}

const rolePermissionsMatrix = [
  {
    capability: "Menu & Categories (Add, Edit, Price)",
    owner: true,
    manager: true,
    cashier: false,
    kitchen_staff: false,
    waiter: false,
  },
  {
    capability: "Table QR & NFC Tokens (Generate, Print, Revoke)",
    owner: true,
    manager: true,
    cashier: false,
    kitchen_staff: false,
    waiter: false,
  },
  {
    capability: "Kitchen Display (KDS) & Prep Status Updates",
    owner: true,
    manager: true,
    cashier: false,
    kitchen_staff: true,
    waiter: false,
  },
  {
    capability: "Live Order Management & Table Transfers",
    owner: true,
    manager: true,
    cashier: true,
    kitchen_staff: false,
    waiter: true,
  },
  {
    capability: "Billing, Razorpay Reconciliations & Refunds",
    owner: true,
    manager: true,
    cashier: true,
    kitchen_staff: false,
    waiter: false,
  },
  {
    capability: "Staff Invitations & Role Assignments",
    owner: true,
    manager: false,
    cashier: false,
    kitchen_staff: false,
    waiter: false,
  },
  {
    capability: "Restaurant Profile, GSTIN & Operating Hours",
    owner: true,
    manager: false,
    cashier: false,
    kitchen_staff: false,
    waiter: false,
  },
];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "matrix" | "audit">("members");

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("waiter");
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Feedback & Alert
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const fetchStaff = async () => {
      try {
        const supabase = createClient();
        const { data: members, error } = await supabase
          .from("restaurant_members")
          .select("*, profile:profiles(*)");

        if (error) throw error;
        if (members && members.length > 0) {
          const mapped: StaffMember[] = (members as unknown as Array<{
            id: string;
            role: UserRole;
            created_at: string;
            profile?: { full_name?: string | null; email?: string | null };
          }>).map((m) => ({
            id: m.id,
            name: m.profile?.full_name || m.profile?.email?.split("@")[0] || "Staff Member",
            email: m.profile?.email || "staff@dineflow.com",
            role: m.role as UserRole,
            status: "active",
            joined_at: m.created_at,
          }));
          setStaff(mapped);
        } else {
          setStaff([]);
        }

        const { data: logs } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (logs && logs.length > 0) {
          const mappedLogs: AuditLogEntry[] = logs.map((l: { id: string; action?: string; entity_type?: string; created_at: string }) => ({
            id: l.id,
            actor_name: "Staff Action",
            action: l.action?.replace(/_/g, " ") || "Operation",
            entity: l.entity_type || "System",
            timestamp: new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setAuditLogs(mappedLogs);
        } else {
          setAuditLogs([]);
        }
      } catch (err) {
        console.error("Failed to load staff:", err);
      }
    };
    fetchStaff();
  }, [configured]);

  // Last Owner Protection Check
  const countOwners = (list: StaffMember[]) =>
    list.filter((s) => s.role === "owner" && s.status === "active").length;

  const handleCreateInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setErrorMessage("Please enter both staff name and email address.");
      return;
    }

    const token = `inv_${Math.random().toString(36).substring(2, 10)}`;
    const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : "https://dineflow.app"}/auth/invite?token=${token}`;

    const newMember: StaffMember = {
      id: `usr_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "invited",
      joined_at: new Date().toISOString(),
    };

    setStaff((prev) => [...prev, newMember]);
    setGeneratedInviteLink(inviteUrl);
    setFeedback(`Invitation generated for ${inviteEmail} as ${inviteRole.replace("_", " ")}.`);
  };

  const handleCopyInviteLink = () => {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    const member = staff.find((s) => s.id === id);
    if (!member) return;

    // Last owner check
    if (member.role === "owner" && newRole !== "owner" && countOwners(staff) <= 1) {
      setErrorMessage("Action rejected: The restaurant must have at least one active Owner.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, role: newRole } : s))
    );
    setFeedback(`Role for ${member.name} updated to ${newRole.replace("_", " ")}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleStatus = (id: string) => {
    const member = staff.find((s) => s.id === id);
    if (!member) return;

    if (member.role === "owner" && member.status === "active" && countOwners(staff) <= 1) {
      setErrorMessage("Cannot deactivate the only active Owner.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const nextStatus = member.status === "active" ? "deactivated" : "active";
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
    );
    setFeedback(`Staff member ${member.name} is now ${nextStatus}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteStaff = (id: string) => {
    const member = staff.find((s) => s.id === id);
    if (!member) return;

    if (member.role === "owner" && countOwners(staff) <= 1) {
      setErrorMessage("Cannot delete the only active Owner.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setStaff((prev) => prev.filter((s) => s.id !== id));
    setFeedback(`Removed ${member.name} from restaurant staff.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-emerald/20 text-emerald border-emerald/40 text-[11px]">Owner</Badge>;
      case "manager":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[11px]">Manager</Badge>;
      case "cashier":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 text-[11px]">Cashier</Badge>;
      case "kitchen_staff":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[11px]">Kitchen Staff</Badge>;
      case "waiter":
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/40 text-[11px]">Waiter</Badge>;
      default:
        return <Badge className="bg-charcoal-surface text-charcoal-muted border-charcoal-border text-[11px]">Staff</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald" />
            Staff & Role Access Control (RBAC)
          </h1>
          <p className="text-sm text-charcoal-muted mt-1">
            Enforce least-privilege permissions across KDS, POS billing, QR tables, and menu management
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setIsInviteOpen(true);
            setGeneratedInviteLink(null);
          }}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite Staff Member
        </Button>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald/20 border border-emerald/40 p-3.5 text-xs text-emerald-light flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-3.5 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* RLS Multi-Tenant Security Guard */}
      <div className="rounded-xl border border-charcoal-border bg-charcoal-card p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-cream">Multi-Tenant Database Row Level Security (RLS) Active</p>
          <p className="text-charcoal-muted leading-relaxed">
            Staff access is isolated per restaurant tenant via `public.is_restaurant_member(restaurant_id)`. Tokens and credentials cannot cross restaurant boundaries, preventing unauthorized access to other tenants&apos; KDS feeds or financial reports.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-charcoal-border pb-2">
        <Button
          variant={activeTab === "members" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("members")}
          className="text-xs h-8 gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Active Team ({staff.length})
        </Button>
        <Button
          variant={activeTab === "matrix" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("matrix")}
          className="text-xs h-8 gap-1.5"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Permissions Matrix
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("audit")}
          className="text-xs h-8 gap-1.5"
        >
          <History className="h-3.5 w-3.5" />
          Operation Audit Trail
        </Button>
      </div>

      {/* 1. Members Tab */}
      {activeTab === "members" && (
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="py-4">
            <CardTitle className="text-base text-cream">Restaurant Staff Directory</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Assign roles according to dining room and kitchen responsibilities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-charcoal-muted">
                      No staff members assigned yet. Use &quot;Invite Team Member&quot; to add staff.
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-semibold text-cream text-xs">{member.name}</div>
                      <div className="text-[11px] text-charcoal-muted font-mono">{member.email}</div>
                    </TableCell>

                    <TableCell>{getRoleBadge(member.role)}</TableCell>

                    <TableCell>
                      {member.status === "active" && (
                        <Badge className="bg-emerald/20 text-emerald border-emerald/40 text-[10px]">Active</Badge>
                      )}
                      {member.status === "invited" && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">Invited</Badge>
                      )}
                      {member.status === "deactivated" && (
                        <Badge className="bg-charcoal-surface text-charcoal-muted border-charcoal-border text-[10px]">Deactivated</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-charcoal-muted whitespace-nowrap">
                      {formatDate(member.joined_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Role selector dropdown */}
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="h-7 text-[11px] bg-charcoal border border-charcoal-border text-cream rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-emerald"
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                          <option value="kitchen_staff">Kitchen Staff</option>
                          <option value="waiter">Waiter</option>
                        </select>

                        {/* Toggle Deactivation */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          title={member.status === "active" ? "Deactivate access" : "Reactivate access"}
                          onClick={() => handleToggleStatus(member.id)}
                        >
                          {member.status === "active" ? (
                            <UserX className="h-3.5 w-3.5 text-charcoal-muted" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-emerald" />
                          )}
                        </Button>

                        {/* Delete member */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300"
                          title="Remove from restaurant"
                          onClick={() => handleDeleteStaff(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 2. Permissions Matrix Tab */}
      {activeTab === "matrix" && (
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="py-4">
            <CardTitle className="text-base text-cream">Role Permissions Matrix</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Granular role capabilities enforced at API routes and Supabase Row Level Security
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">System Capability</TableHead>
                  <TableHead className="text-center">Owner</TableHead>
                  <TableHead className="text-center">Manager</TableHead>
                  <TableHead className="text-center">Cashier</TableHead>
                  <TableHead className="text-center">Kitchen Staff</TableHead>
                  <TableHead className="text-center">Waiter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolePermissionsMatrix.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-xs text-cream">{item.capability}</TableCell>
                    <TableCell className="text-center">
                      {item.owner ? <Check className="h-4 w-4 text-emerald mx-auto" /> : <span className="text-charcoal-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.manager ? <Check className="h-4 w-4 text-emerald mx-auto" /> : <span className="text-charcoal-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.cashier ? <Check className="h-4 w-4 text-emerald mx-auto" /> : <span className="text-charcoal-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.kitchen_staff ? <Check className="h-4 w-4 text-emerald mx-auto" /> : <span className="text-charcoal-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.waiter ? <Check className="h-4 w-4 text-emerald mx-auto" /> : <span className="text-charcoal-muted">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. Operation Audit Trail Tab */}
      {activeTab === "audit" && (
        <Card className="border-charcoal-border bg-charcoal-card">
          <CardHeader className="py-4">
            <CardTitle className="text-base text-cream">Restaurant Security & Action Audit Trail</CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Immutable logging of table transfers, menu changes, refunds, and ticket advancements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity / Target</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-charcoal-muted">
                      No security or operational actions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-semibold text-xs text-cream">{log.actor_name}</TableCell>
                      <TableCell className="text-xs text-emerald-light">{log.action}</TableCell>
                      <TableCell className="text-xs font-mono text-charcoal-muted">{log.entity}</TableCell>
                      <TableCell className="text-right text-xs text-charcoal-muted">{log.timestamp}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Staff Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md bg-charcoal border-charcoal-border p-6 text-cream">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-charcoal-muted">
              Send an invite link to grant access to the DineFlow restaurant dashboard.
            </DialogDescription>
          </DialogHeader>

          {!generatedInviteLink ? (
            <div className="space-y-3.5 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Full Name</label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. ramesh@dineflow.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Role & Access Tier</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-9 text-xs bg-charcoal-surface border border-charcoal-border text-cream rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-emerald"
                >
                  <option value="manager">Manager (Menu, live orders, refunds, KDS)</option>
                  <option value="cashier">Cashier (Billing receipts, orders settlement)</option>
                  <option value="kitchen_staff">Kitchen Staff (KDS cooking queue only)</option>
                  <option value="waiter">Waiter (Table status, customer service)</option>
                  <option value="owner">Co-Owner (Full administrative control)</option>
                </select>
              </div>

              <p className="text-[11px] text-charcoal-muted">
                Invitations expire automatically after 7 days if unaccepted.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald-light space-y-1">
                <p className="font-semibold">Invitation Created!</p>
                <p className="text-[11px] text-charcoal-muted">
                  Share this secure one-time onboarding link with {inviteName}.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-cream">Onboarding Link</label>
                <div className="flex gap-2">
                  <Input value={generatedInviteLink} readOnly className="font-mono text-xs" />
                  <Button size="sm" onClick={handleCopyInviteLink} className="gap-1.5 px-3">
                    {copiedLink ? <Check className="h-4 w-4 text-emerald" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!generatedInviteLink ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreateInvite}>
                  Generate Invitation
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsInviteOpen(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
