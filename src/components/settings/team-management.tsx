"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteUserDialog } from "./invite-user-dialog";
import { deleteUser, toggleUserStatus } from "@/lib/actions/users";
import { adminDisableUser2FA } from "@/lib/actions/2fa";
import { useSession } from "next-auth/react";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { Trash2, Loader2, UserCog, ShieldOff, Crown, Users as UsersIcon, ArrowUpCircle, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UserWorkspacesDialog } from "./user-workspaces-dialog";

export function TeamManagement({ 
    users, 
    workspaces, 
    customRoles = [],
    accountTotalUsers = 0 
}: { 
    users: any[], 
    workspaces: any[], 
    customRoles?: any[],
    accountTotalUsers?: number
}) {
    const { data: session } = useSession();
    const { confirm } = useConfirm();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    // TEAM GATING LOGIC
    const activeWs = workspaces[0]; // Active context
    const account = activeWs?.account;
    const isAccountOwner = (session?.user as any)?.isAccountOwner;
    const planTier = account?.planTier || "FREE";
    
    const LIMITS: Record<string, number> = {
        FREE: 2,
        STARTER: 5,
        PRO: 20,
        ENTERPRISE: 10000
    };

    const userLimit = LIMITS[planTier] || 2;

    // Use organization-wide total for capacity bar accuracy
    const totalUtilization = Math.max(users.length, accountTotalUsers);
    const isLimitReached = totalUtilization >= userLimit;
    const usagePercent = Math.min((totalUtilization / userLimit) * 100, 100);

    const filteredUsers = users.filter(user => 
        (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (user.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedUser = users.find(u => u.id === selectedUserId);

    const handleDeleteUser = async (userId: string) => {
        const isConfirmed = await confirm({
            title: "Delete User",
            description: "Are you sure you want to delete this user? This cannot be undone.",
            variant: "destructive",
            confirmText: "Delete"
        });
        if (!isConfirmed) return;

        setLoadingId(userId);
        const result = await deleteUser(userId);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || "Failed to delete user");
        }
        setLoadingId(null);
    };

    const handleDisable2FA = async (userId: string, userName: string) => {
        const isConfirmed = await confirm({
            title: "Disable 2FA",
            description: `Are you sure you want to disable Two-Factor Authentication for ${userName}? They will be able to log in with just their password.`,
            variant: "destructive",
            confirmText: "Disable 2FA"
        });
        if (!isConfirmed) return;
        
        setLoadingId(`2fa-${userId}`);
        const result = await adminDisableUser2FA(userId);
        if (result.success) {
            toast.success("2FA successfully disabled for user.");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to disable 2FA");
        }
        setLoadingId(null);
    };

    return (
        <div className="space-y-6">
            {/* PROMINENT CAPACITY BANNER */}
            <Card className={`border-2 transition-all duration-300 shadow-sm ${isLimitReached ? 'border-red-500/20 bg-red-500/5' : 'border-primary/20 bg-primary/5'}`}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isLimitReached ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'}`}>
                                <UsersIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                                    Organization Seat Capacity
                                    {isLimitReached && <Badge variant="destructive" className="animate-pulse">FULL</Badge>}
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
                                    You are using <span className="text-foreground font-black">{totalUtilization}</span> of <span className="text-foreground font-black">{userLimit === 10000 ? 'unlimited' : userLimit}</span> alotted seats on the <span className="uppercase font-bold text-primary">{planTier}</span> plan.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full md:w-64">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                <span className={isLimitReached ? 'text-red-500' : 'text-primary'}>Utilization</span>
                                <span className="text-muted-foreground">{usagePercent.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out ${isLimitReached ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            {isAccountOwner && isLimitReached && (
                                <Link href="/dashboard/settings?tab=billing" className="mt-2">
                                    <Button size="sm" className="w-full gap-2 font-bold shadow-md transform hover:scale-[1.02] transition-all" variant="default">
                                        <ArrowUpCircle className="w-4 h-4" />
                                        Upgrade License
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                            <UserCog className="w-5 h-5 text-primary" />
                            Team Users
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-0.5">Manage active users and their system-wide roles.</CardDescription>
                    </div>
                    <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-auto">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search team..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full sm:w-[220px] h-9 text-sm bg-background border-border shadow-sm rounded-lg"
                            />
                        </div>
                        <div className="shrink-0">
                            <InviteUserDialog workspaces={workspaces} isLimitReached={isLimitReached} planTier={planTier} customRoles={customRoles} />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0 sm:p-6">
                    <div className="rounded-none sm:rounded-xl border-x-0 sm:border border-border overflow-x-auto no-scrollbar text-sm bg-card shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/80 border-b border-border">
                                    <TableHead className="font-bold text-muted-foreground h-11 px-6">User</TableHead>
                                    <TableHead className="font-bold text-muted-foreground h-11">Roles</TableHead>
                                    <TableHead className="font-bold text-muted-foreground h-11 text-center">Security</TableHead>
                                    <TableHead className="font-bold text-muted-foreground h-11 text-center">Status</TableHead>
                                    <TableHead className="text-right font-bold text-muted-foreground h-11 px-6">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/50">
                                {filteredUsers.map((user) => {
                                    const isSelf = session?.user?.email === user.email;
                                    return (
                                        <TableRow key={user.id} className="items-center group hover:bg-muted/50 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {user.name || "Unnamed"} {isSelf && "(You)"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUserId(user.id)}
                                                    className="h-8 text-[11px] font-bold uppercase tracking-wider bg-background shadow-none"
                                                >
                                                    Manage Roles
                                                </Button>
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                {user.isTwoFactorEnabled ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDisable2FA(user.id, user.name || "User")}
                                                        disabled={loadingId === `2fa-${user.id}` || isSelf}
                                                        className="h-8 text-[11px] font-bold tracking-wider border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 bg-transparent shadow-none"
                                                    >
                                                        {loadingId === `2fa-${user.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldOff className="w-3.5 h-3.5 mr-1.5" />}
                                                        Turn Off 2FA
                                                    </Button>
                                                ) : (
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">Not Setup</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        const res = await toggleUserStatus(user.id);
                                                        if (res.success) {
                                                            toast.success(`User ${res.isActive ? 'activated' : 'suspended'}.`);
                                                            router.refresh();
                                                        } else {
                                                            toast.error(res.error);
                                                        }
                                                    }}
                                                    disabled={isSelf}
                                                    className={`h-7 px-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-full ${user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400'}`}
                                                >
                                                    {user.isActive ? 'Active' : 'Suspended'}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right px-6 py-4">
                                                {!isSelf && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-8 h-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-none"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        disabled={loadingId === user.id}
                                                    >
                                                        {loadingId === user.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    
                    <UserWorkspacesDialog
                        user={selectedUser}
                        workspaces={workspaces}
                        customRoles={customRoles}
                        open={!!selectedUserId}
                        onOpenChange={(open: boolean) => !open && setSelectedUserId(null)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
