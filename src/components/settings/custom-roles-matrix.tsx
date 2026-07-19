"use client";

import { useState } from "react";
import { Lock, Plus, Save, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getEntitlements, PlanTier } from "@/lib/entitlements";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";

interface CustomRole {
    id: string;
    name: string;
    permissions: string[];
    workspaceId: string;
}

const PERMISSION_GROUPS = [
    {
        name: "Lead Management",
        permissions: [
            { id: "lead:read:all", label: "View All Leads", desc: "Can view leads owned by anyone" },
            { id: "lead:create", label: "Create Leads", desc: "Can manually add new leads" },
            { id: "lead:edit:all", label: "Edit All Leads", desc: "Can modify any lead in the system" },
            { id: "lead:delete:own", label: "Delete Own Leads", desc: "Can remove leads they created" },
            { id: "lead:delete:all", label: "Delete Any Lead", desc: "Can permanently remove ANY lead" },
            { id: "lead:import", label: "Bulk Import", desc: "Can mass-import leads via CSV" },
            { id: "lead:assign", label: "Reassign Leads", desc: "Can change lead ownership" },
        ]
    },
    {
        name: "Deal Pipeline",
        permissions: [
            { id: "deal:read:all", label: "View All Deals", desc: "Can view deals owned by anyone" },
            { id: "deal:create", label: "Create Deals", desc: "Can create new pipeline opportunities" },
            { id: "deal:edit:all", label: "Edit All Deals", desc: "Can move deals through the pipeline" },
            { id: "deal:delete:all", label: "Delete Deals", desc: "Can permanently remove deals" },
        ]
    },
    {
        name: "Contacts & Organizations",
        permissions: [
            { id: "contact:read:all", label: "View Directory", desc: "Access the entire contact list" },
            { id: "contact:create", label: "Create Profiles", desc: "Can add contacts & orgs" },
            { id: "contact:edit:all", label: "Update Directory", desc: "Can edit all contacts" },
            { id: "contact:delete", label: "Delete Directory", desc: "Can permanently remove profiles" },
        ]
    },
    {
        name: "Financials & Quotations",
        permissions: [
            { id: "finance:revenue:view", label: "View Pipeline Revenue", desc: "Can see monetary value of shared deals" },
            { id: "finance:quotes:create", label: "Generate Quotations", desc: "Can issue formal pricing quotes" },
            { id: "finance:quotes:discount", label: "Apply Discounts", desc: "Authorized to reduce standard pricing" },
        ]
    },
    {
        name: "Communications & Outreach",
        permissions: [
            { id: "comm:email:send", label: "Send Direct Emails", desc: "Can email leads from the CRM directly" },
            { id: "comm:email:bulk", label: "Mass Email Blasts", desc: "Authorized to run bulk email variants" },
            { id: "comm:whatsapp", label: "WhatsApp Messaging", desc: "Can utilize the WhatsApp integration" },
        ]
    },
    {
        name: "Task & Analytics Control",
        permissions: [
            { id: "task:assign:others", label: "Delegate Tasks", desc: "Can assign action items to other reps" },
            { id: "analytics:team:view", label: "Team Performance", desc: "Can view metrics of other employees" },
        ]
    },
    {
        name: "Advanced System Access",
        permissions: [
            { id: "system:export", label: "Data Exports", desc: "Can export CRM data to CSV/Excel" },
            { id: "system:workflows", label: "Workflow Builder", desc: "Can create & modify automations" },
            { id: "system:integrations", label: "Manage Integrations", desc: "Connect external tools & APIs" },
            { id: "system:audit", label: "View Audit Logs", desc: "Can see history of all actions" },
        ]
    }
];

export function CustomRolesMatrix({ activeWorkspace, initialRoles }: { activeWorkspace?: any, initialRoles: CustomRole[] }) {
    const { confirm: confirmDialog } = useConfirm();
    const router = useRouter();
    const planTier = (activeWorkspace?.account?.planTier as PlanTier) || "FREE";
    const entitlements = getEntitlements(planTier);
    
    // State management
    const [roles, setRoles] = useState<CustomRole[]>(initialRoles || []);
    const [editingRole, setEditingRole] = useState<Partial<CustomRole> | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Ensure they have access via Enterprise
    if (!entitlements.canUseCustomRoles) {
        return (
            <div className="relative overflow-hidden min-h-[400px] mt-6 border rounded-xl">
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[4px] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full border-primary/20 shadow-2xl bg-card">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <ShieldAlert className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-bold">Custom Roles Locked</CardTitle>
                            <CardDescription className="text-[15px] pt-2">
                                Your current <strong className="text-foreground">{planTier}</strong> plan does not include Custom Role Builder. Upgrade to <strong>Enterprise</strong> to construct granular data policies.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-4 flex justify-center pb-6">
                            <Button className="font-bold px-8 shadow-sm" onClick={() => router.push("/dashboard/settings?tab=billing")}>
                                View Enterprise Plan
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                
                {/* Background Dummy UI */}
                <div className="p-6 opacity-30 select-none pointer-events-none">
                    <h3 className="text-xl font-bold mb-4">Enterprise Role Builder</h3>
                    <div className="space-y-4">
                        <div className="h-16 bg-muted/50 rounded-lg w-full"></div>
                        <div className="h-16 bg-muted/50 rounded-lg w-full"></div>
                        <div className="h-16 bg-muted/50 rounded-lg w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    const startNewRole = () => setEditingRole({ name: "New Custom Role", permissions: [] });
    const togglePermission = (permId: string) => {
        if (!editingRole) return;
        const perms = editingRole.permissions || [];
        if (perms.includes(permId)) {
            setEditingRole({ ...editingRole, permissions: perms.filter(p => p !== permId) });
        } else {
            setEditingRole({ ...editingRole, permissions: [...perms, permId] });
        }
    };

    const handleSaveRole = async () => {
        if (!editingRole?.name || editingRole.name.trim() === "") return alert("Role name required");
        setIsLoading(true);

        try {
            const res = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspace.id,
                    roleId: editingRole.id,
                    name: editingRole.name,
                    permissions: editingRole.permissions || []
                })
            });

            if (!res.ok) throw new Error(await res.text());
            
            setEditingRole(null);
            router.refresh(); // Sync server state
        } catch (e: any) {
            alert("Error saving role: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        const isConfirmed = await confirmDialog({
            title: "Delete Custom Role",
            description: "Are you sure? Members with this role will fall back to standard Rep routing. This cannot be undone.",
            variant: "destructive",
            confirmText: "Delete Role"
        });
        if (!isConfirmed) return;
        
        try {
            const res = await fetch(`/api/roles?roleId=${roleId}&workspaceId=${activeWorkspace.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            router.refresh();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <Card className="shadow-sm border-border/60 mt-6 bg-card/50">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                        <ShieldAlert className="w-5 h-5 text-primary" /> Enterprise PBAC Roles
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                        Construct custom capabilities for your organization.
                    </CardDescription>
                </div>
                {!editingRole && (
                    <Button onClick={startNewRole} size="sm" className="w-full sm:w-auto font-bold rounded-xl h-10 px-4">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="inline xs:hidden">New Role</span>
                        <span className="hidden xs:inline">Create Custom Role</span>
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                {editingRole ? (
                    <div className="space-y-6 bg-background rounded-lg p-6 border shadow-inner">
                        <div>
                            <Label className="text-base">Role Name</Label>
                            <Input 
                                className="mt-2 max-w-md font-medium text-lg" 
                                value={editingRole.name} 
                                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} 
                                placeholder="e.g. Senior Regional Manager"
                            />
                        </div>

                        <div>
                            <h4 className="font-semibold text-foreground mb-4 pb-2 border-b">Capabilities Matrix</h4>
                            <div className="space-y-8">
                                {PERMISSION_GROUPS.map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-3">
                                        <h5 className="font-medium text-sm text-primary uppercase tracking-wider">{group.name}</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {group.permissions.map(perm => (
                                                <div key={perm.id} className="flex items-start space-x-3 p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors shadow-sm">
                                                    <Switch 
                                                        id={perm.id}
                                                        checked={(editingRole.permissions || []).includes(perm.id)}
                                                        onCheckedChange={() => togglePermission(perm.id)}
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <Label htmlFor={perm.id} className="font-bold text-sm cursor-pointer">{perm.label}</Label>
                                                        <p className="text-[12px] text-muted-foreground leading-relaxed">{perm.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
                            <Button onClick={handleSaveRole} disabled={isLoading}>
                                {isLoading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Policy</>}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 mt-2">
                        {roles.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                No custom policies created yet.
                            </div>
                        ) : (
                            roles.map(role => (
                                <div key={role.id} className="flex items-center justify-between p-4 rounded-lg border bg-background hover:border-primary/50 transition-colors group shadow-sm">
                                    <div>
                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                            {role.name}
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Enterprise Role</span>
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1 text-ellipsis overflow-hidden max-w-xl">
                                            {role.permissions.join(", ")}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteRole(role.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
