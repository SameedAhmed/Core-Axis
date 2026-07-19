"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWorkspace, assignUserToWorkspace, removeUserFromWorkspace, updateWorkspace, deleteWorkspace } from "@/lib/actions/workspaces";
import { toast } from "sonner";
import { Building2, UserPlus, Trash2, Shield, Users, ChevronDown, ChevronUp, Pencil, Crown, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomFieldsManager } from "./custom-fields-manager";
import { DealStagesManager } from "./deal-stages-manager";

import { PLAN_ENTITLEMENTS, PlanTier } from "@/lib/entitlements";

interface WorkspaceManagementProps {
    workspaces: any[];
    allUsers: any[]; 
    isAccountOwner?: boolean;
    planTier?: string;
}

export function WorkspaceManagement({ workspaces, allUsers, isAccountOwner, planTier = "FREE" }: WorkspaceManagementProps) {
    const { data: session, update } = useSession();
    const { confirm } = useConfirm();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [selectedEmail, setSelectedEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState<"ADMIN" | "MANAGER" | "REP">("REP");
    const [searchQuery, setSearchQuery] = useState("");

    const entitlements = PLAN_ENTITLEMENTS[planTier as PlanTier] || PLAN_ENTITLEMENTS.FREE;
    const isLimitReached = workspaces.length >= entitlements.maxWorkspaces;

    const handleCreateWorkspace = async () => {
        if (isLimitReached) return toast.error("Workspace limit reached. Please upgrade your plan.");
        if (!newWorkspaceName.trim()) return toast.error("Workspace name is required.");
        setLoading(true);
        const res = await createWorkspace(newWorkspaceName);
        if (res.success) {
            toast.success("Workspace created successfully.");
            setNewWorkspaceName("");
            setIsCreateOpen(false);
        } else {
            toast.error(res.error || "Failed to create workspace.");
        }
        setLoading(false);
    };

    const handleAssignUser = async (workspaceId: string) => {
        if (!selectedEmail) return toast.error("Please select a user email.");
        setLoading(true);
        const res = await assignUserToWorkspace(workspaceId, selectedEmail, selectedRole);
        if (res.success) {
            toast.success("User added to workspace.");
            setSelectedEmail("");
        } else {
            toast.error(res.error || "Failed to add user.");
        }
        setLoading(false);
    };

    const handleRemoveUser = async (workspaceId: string, memberId: string) => {
        const isConfirmed = await confirm({
            title: "Remove Member",
            description: "Are you sure you want to remove this user from the workspace?",
            variant: "destructive",
            confirmText: "Remove"
        });
        if (!isConfirmed) return;

        setLoadingMap(prev => ({ ...prev, [`remove_${workspaceId}_${memberId}`]: true }));
        const res = await removeUserFromWorkspace(workspaceId, memberId);
        if (res.success) {
            toast.success("User removed from workspace.");
        } else {
            toast.error(res.error || "Failed to remove user.");
        }
        setLoadingMap(prev => {
            const newState = { ...prev };
            delete newState[`remove_${workspaceId}_${memberId}`];
            return newState;
        });
    };

    const [expandedWs, setExpandedWs] = useState<string | null>(null);
    const [editingWsId, setEditingWsId] = useState<string | null>(null);
    const [editWsName, setEditWsName] = useState("");

    const handleRenameWorkspace = async (workspaceId: string) => {
        if (!editWsName.trim()) return toast.error("Name cannot be empty.");
        setLoading(true);
        const res = await updateWorkspace(workspaceId, editWsName);
        if (res.success) {
            toast.success("Workspace renamed.");
            setEditingWsId(null);
        } else {
            toast.error(res.error || "Failed to rename workspace.");
        }
        setLoading(false);
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        const isConfirmed = await confirm({
            title: "Delete Workspace",
            description: "CRITICAL WARNING: This will permanently delete the workspace and ALL its leads, deals, and activities. This CANNOT be undone. Are you absolutely sure?",
            variant: "destructive",
            confirmText: "Permanently Delete"
        });
        if (!isConfirmed) return;

        setLoadingMap(prev => ({ ...prev, [`delete_ws_${workspaceId}`]: true }));
        const res = await deleteWorkspace(workspaceId);
        if (res.success) {
            toast.success("Workspace deleted successfully.");
            if (expandedWs === workspaceId) setExpandedWs(null);
        } else {
            toast.error(res.error || "Failed to delete workspace.");
        }
        setLoading(false);
    };

    const filteredWorkspaces = workspaces.filter(ws => 
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ws.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Workspaces
                        <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase ml-2 px-1.5 py-0 bg-muted/30">
                            {workspaces.length} / {entitlements.maxWorkspaces >= 999 ? "∞" : entitlements.maxWorkspaces}
                        </Badge>
                    </CardTitle>
                    <CardDescription>Manage multiple CRM instances, clients, or distinct teams.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {isLimitReached && isAccountOwner && (
                         <Link href="/dashboard/settings?tab=billing">
                            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-amber-500/50 text-amber-600 hover:bg-amber-50 gap-1.5">
                                <Crown className="w-3 h-3" /> Upgrade
                            </Button>
                         </Link>
                    )}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search workspaces..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full sm:w-[200px] h-9 text-sm bg-background border-border"
                        />
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={isLimitReached} className={isLimitReached ? 'opacity-50' : ''}>
                                Create Workspace
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Workspace</DialogTitle>
                                <DialogDescription>A new workspace operates as an isolated CRM environment.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Workspace Name</label>
                                    <Input
                                        placeholder="e.g., Marketing Team, Client ACME"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleCreateWorkspace} disabled={loading}>
                                    {loading ? "Creating..." : "Create Workspace"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full mt-4 flex flex-col gap-4">
                    {filteredWorkspaces.map((ws) => (
                        <div key={ws.id} className="border border-border/50 rounded-lg overflow-hidden bg-card">
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => { if (editingWsId !== ws.id) setExpandedWs(expandedWs === ws.id ? null : ws.id); }}
                            >
                                <div className="flex items-center gap-3 w-full pr-4">
                                    <div className="bg-primary/10 p-2 rounded-md">
                                        <Building2 className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col items-start gap-1 flex-1">
                                        {editingWsId === ws.id ? (
                                            <div className="flex items-center gap-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                                                <Input 
                                                    value={editWsName} 
                                                    onChange={e => setEditWsName(e.target.value)} 
                                                    className="h-8 text-sm font-semibold" 
                                                    autoFocus
                                                />
                                                <Button size="sm" className="h-8" onClick={() => handleRenameWorkspace(ws.id)} disabled={loading}>Save</Button>
                                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingWsId(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-sm">{ws.name}</span>
                                        )}
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {ws.members.length} members
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                    {(!editingWsId || editingWsId !== ws.id) && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditWsName(ws.name); setEditingWsId(ws.id); }}>
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWorkspace(ws.id)} disabled={loading}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </>
                                    )}
                                    <Badge variant="secondary" className="font-normal text-xs bg-muted/50 hidden sm:inline-flex">
                                        ID: {ws.id.slice(0, 8)}...
                                    </Badge>
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted/50" onClick={() => { if (editingWsId !== ws.id) setExpandedWs(expandedWs === ws.id ? null : ws.id); }}>
                                        {expandedWs === ws.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>
                            </div>

                            {expandedWs === ws.id && (
                                <div className="px-4 py-4 border-t border-border/30 bg-muted/10 space-y-6">
                                    {/* Members List */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-muted-foreground" /> Workspace Members
                                        </h4>
                                        <div className="grid gap-2">
                                            {ws.members.map((member: any) => (
                                                <div key={member.id} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{member.user.name || member.user.email}</span>
                                                        <span className="text-xs text-muted-foreground">{member.user.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase">
                                                            {member.role}
                                                        </Badge>
                                                        {ws.ownerId !== member.userId && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => handleRemoveUser(ws.id, member.userId)}
                                                                disabled={loading}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Add Member Form */}
                                    <div className="bg-background p-4 rounded-lg border border-border shadow-sm space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <UserPlus className="w-4 h-4 text-primary" /> Add Member to Workspace
                                        </h4>
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select user by email" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allUsers.filter(u => !ws.members.some((m: any) => m.userId === u.id)).map(u => (
                                                        <SelectItem key={u.id} value={u.email}>
                                                            {u.email} ({u.name || "No name"})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedRole} onValueChange={(val: any) => setSelectedRole(val)}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="REP">Rep</SelectItem>
                                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                onClick={() => handleAssignUser(ws.id)}
                                                disabled={loading || !selectedEmail}
                                                className="shrink-0"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Custom Inputs Manager */}
                                    <div className="pt-6 mt-6 border-t border-border/40">
                                        <DealStagesManager workspaceId={ws.id} initialStages={(ws as any).dealStages as any} />
                                    </div>
                                    <CustomFieldsManager workspaceId={ws.id} />
                                </div>
                            )}
                        </div>

                    ))}
                    {filteredWorkspaces.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                            No workspaces found.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
