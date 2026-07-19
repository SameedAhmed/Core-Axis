/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { createUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, Plus, X, Building2, Crown, Lock, ArrowUpCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface WorkspaceAssignment {
    workspaceId: string;
    role: "ADMIN" | "MANAGER" | "REP";
    customRoleId?: string | null;
}

export function InviteUserDialog({ 
    workspaces, 
    isLimitReached, 
    planTier,
    customRoles = []
}: { 
    workspaces: any[], 
    isLimitReached: boolean, 
    planTier: string,
    customRoles?: any[]
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
    
    const [tempWsId, setTempWsId] = useState<string>("");
    const [tempRole, setTempRole] = useState<"ADMIN" | "MANAGER" | "REP">("REP");
    const [tempCustomRoleId, setTempCustomRoleId] = useState<string>("none");

    const router = useRouter();

    const addAssignment = () => {
        if (!tempWsId) return;
        if (assignments.find(a => a.workspaceId === tempWsId)) {
            setError("Workspace already added");
            return;
        }
        setAssignments([...assignments, { 
            workspaceId: tempWsId, 
            role: tempRole,
            customRoleId: tempCustomRoleId === "none" ? null : tempCustomRoleId 
        }]);
        setTempWsId("");
        setTempRole("REP");
        setTempCustomRoleId("none");
        setError(null);
    };

    const removeAssignment = (workspaceId: string) => {
        setAssignments(assignments.filter(a => a.workspaceId !== workspaceId));
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isLimitReached) return;
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;

        const result = await createUser({ 
            email, 
            workspaceAssignments: assignments 
        });

        if (result.success) {
            setOpen(false);
            setAssignments([]); // Clear for next time
            router.refresh();
        } else {
            setError(result.error || "Failed to create user");
        }
        setLoading(false);
    }

    // Filter roles for the selected workspace
    const filteredRoles = customRoles.filter(r => r.workspaceId === tempWsId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    size="sm" 
                    className={`gap-2 ${isLimitReached ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20' : ''}`} 
                    variant={isLimitReached ? "outline" : "default"}
                >
                    {isLimitReached ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                            {isLimitReached 
                                ? "Expand your license to add more members to your high-performance team." 
                                : "Invite a user via email. They will set their name upon their first login."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {isLimitReached && (
                             <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-500">
                                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                                    <Crown className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-amber-600 dark:text-amber-400 mb-2">Tier Capacity Exhausted</h3>
                                <p className="text-xs text-muted-foreground font-medium mb-6 px-4">
                                    The <span className="text-amber-600 font-bold font-mono uppercase">{planTier}</span> plan is currently at its maximum seat limit.
                                </p>
                                <Link href="/dashboard/settings?tab=billing">
                                    <Button type="button" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 shadow-lg shadow-amber-500/20 border-none transition-all hover:scale-[1.02]">
                                        <ArrowUpCircle className="w-4 h-4" />
                                        Upgrade License
                                    </Button>
                                </Link>
                             </div>
                        )}

                        {error && (
                            <div className="p-3 text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg">
                                {error}
                            </div>
                        )}
                        
                        <div className={`grid gap-2 transition-all duration-300 ${isLimitReached ? 'opacity-20 pointer-events-none' : ''}`}>
                            <Label htmlFor="email" className="font-bold">Email Address</Label>
                            <Input id="email" name="email" type="email" placeholder="john@example.com" required disabled={isLimitReached} className="h-10" />
                        </div>

                        <Separator className={`my-2 ${isLimitReached ? 'opacity-20' : ''}`} />

                        <div className={`space-y-4 transition-opacity duration-300 ${isLimitReached ? 'opacity-20 pointer-events-none' : ''}`}>
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" /> Workspace Assignments
                            </Label>
                            
                            <div className="space-y-2">
                                {assignments.map((a) => {
                                    const ws = workspaces.find(w => w.id === a.workspaceId);
                                    const cr = customRoles.find(r => r.id === a.customRoleId);
                                    return (
                                        <div key={a.workspaceId} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 group/item">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold">{ws?.name || "Unknown Workspace"}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-primary/70 uppercase tracking-tighter bg-primary/10 px-1.5 py-0.5 rounded">{a.role}</span>
                                                    {cr && (
                                                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter flex items-center gap-1">
                                                            <ShieldCheck className="w-2.5 h-2.5" /> {cr.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-40 group-hover/item:opacity-100 transition-all"
                                                onClick={() => removeAssignment(a.workspaceId)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isLimitReached && (
                                <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-dashed border-border/60">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-muted-foreground ml-1">Workspace Target</Label>
                                            <Select value={tempWsId} onValueChange={setTempWsId}>
                                                <SelectTrigger className="h-10 text-xs bg-background border-border/50">
                                                    <SelectValue placeholder="Select workspace" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {workspaces.filter(ws => !assignments.some(a => a.workspaceId === ws.id)).map(ws => (
                                                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-muted-foreground ml-1">Legacy RBAC Role</Label>
                                            <Select value={tempRole} onValueChange={(v:any) => setTempRole(v)}>
                                                <SelectTrigger className="h-10 text-xs bg-background border-border/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="REP">Standard Rep</SelectItem>
                                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                                    <SelectItem value="ADMIN">Full Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-[11px] font-bold text-muted-foreground ml-1">Enterprise PBAC Role (Optional)</Label>
                                            <Select 
                                                value={tempCustomRoleId} 
                                                onValueChange={setTempCustomRoleId}
                                                disabled={!tempWsId || filteredRoles.length === 0}
                                            >
                                                <SelectTrigger className="h-10 text-xs bg-background border-border/50">
                                                    <SelectValue placeholder={filteredRoles.length === 0 ? "No custom roles" : "Select policy"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Default Permissions</SelectItem>
                                                    {filteredRoles.map(role => (
                                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            type="button" 
                                            size="icon" 
                                            className="h-10 w-10 shrink-0 shadow-sm rounded-xl"
                                            onClick={addAssignment}
                                            disabled={!tempWsId}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground px-1 italic">
                                        * Custom roles will overwrite legacy RBAC permissions for granular control.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className={isLimitReached ? 'opacity-20 pointer-events-none' : ''}>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || isLimitReached || assignments.length === 0} className="px-8 shadow-lg shadow-primary/20 hover:shadow-xl transition-all font-bold">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            Send Invite
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
