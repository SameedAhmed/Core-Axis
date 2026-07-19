"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { assignUserToWorkspace } from "@/lib/actions/workspaces";
import { Loader2, Building2, ShieldEllipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export function UserWorkspacesDialog({
    user,
    workspaces,
    customRoles,
    open,
    onOpenChange
}: {
    user: any;
    workspaces: any[];
    customRoles?: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    if (!user) return null;

    const allMemberships = user.workspaceMemberships || [];
    const memberships = allMemberships.filter((m: any) => 
        workspaces.some(ws => ws.id === m.workspaceId)
    );

    const handleRoleChange = async (workspaceId: string, selectedValue: string) => {
        setLoadingId(workspaceId);

        let role: "ADMIN" | "MANAGER" | "REP" = selectedValue as any;
        let customRoleId = "none";

        if (selectedValue.startsWith("custom_")) {
            role = "REP"; // Base permission layer for all PBAC roles
            customRoleId = selectedValue.replace("custom_", "");
        }

        const result = await assignUserToWorkspace(workspaceId, user.email, role, customRoleId);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || "Failed to update role");
        }
        setLoadingId(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldEllipsis className="w-5 h-5" />
                        Manage Roles for {user.name || "User"}
                    </DialogTitle>
                    <DialogDescription>
                        {user.email}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                            <Building2 className="w-3.5 h-3.5" /> Workspace Roles
                        </Label>
                        
                        {memberships.length === 0 && (
                            <div className="text-sm text-muted-foreground italic py-2">No workspace memberships.</div>
                        )}

                        {memberships.map((m: any) => {
                            const ws = workspaces.find(w => w.id === m.workspaceId);
                            return (
                                <div key={m.workspaceId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-semibold">{ws?.name || "Unknown Workspace"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={m.customRoleId ? `custom_${m.customRoleId}` : m.role}
                                            disabled={loadingId === m.workspaceId}
                                            onValueChange={(val: any) => handleRoleChange(m.workspaceId, val)}
                                        >
                                            <SelectTrigger className="w-[150px] h-8 text-[11px] font-bold uppercase tracking-wider bg-background shadow-none">
                                                {loadingId === m.workspaceId ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="REP" className="text-[11px] font-bold">Representative</SelectItem>
                                                <SelectItem value="MANAGER" className="text-[11px] font-bold">Manager</SelectItem>
                                                <SelectItem value="ADMIN" className="text-[11px] font-bold text-red-600">Administrator</SelectItem>
                                                
                                                {customRoles && customRoles.length > 0 && <div className="h-px bg-border my-1" />}
                                                {customRoles?.map(cr => (
                                                    <SelectItem key={cr.id} value={`custom_${cr.id}`} className="text-[11px] font-bold text-amber-600">
                                                        ★ {cr.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
